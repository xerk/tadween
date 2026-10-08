'use client';

// Tadween board: Jira-like columns of cards. Presentational and data-agnostic;
// launches/posts.board.tsx feeds it the calendar's posts. Styles live in
// app/tadween/board.scss. See docs/tadween/board.md for props and states.
//   · <Board>        lanes side by side (a snapping pager on phones), drag and
//                    drop with pointer events (mouse, pen, touch long-press)
//   · <BoardColumn>  one lane: colour dot, name, count, collapse, drop state
//   · FLIP           cards glide to their new place when they move or the
//                    filters change; new cards rise in, removed ones fade out
import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Icon } from '@gitroom/frontend/components/tadween/ui';

export type BoardTone = 'draft' | 'scheduled' | 'published' | 'failed' | 'neutral';

// idle: no drag · origin: the lane the card came from · allowed / denied: the
// lane accepts (or refuses) the dragged card · over / refused: the pointer is on it
export type BoardDropState = 'idle' | 'origin' | 'allowed' | 'denied' | 'over' | 'refused';

export interface BoardItem {
  id: string;
  draggable?: boolean;
}

export interface BoardLane<T extends BoardItem> {
  id: string;
  title: ReactNode;
  tone?: BoardTone;
  // Replaces the colour dot (a channel avatar, a day number…)
  icon?: ReactNode;
  items: T[];
  // Shown in the lane when it has no cards
  empty?: ReactNode;
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

// ── FLIP ─────────────────────────────────────────────────────────────────────
// Positions are kept in content coordinates (viewport + the lane's and the
// pager's scroll offsets), so scrolling a lane never reads as a move.
const useFlip = (root: React.RefObject<HTMLDivElement>, enabled: boolean) => {
  const last = useRef(new Map<string, { x: number; y: number; rect: DOMRect; el: HTMLElement }>());
  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    const pager = host.querySelector<HTMLElement>('.tdw-board-lanes');
    const next = new Map<string, { x: number; y: number; rect: DOMRect; el: HTMLElement }>();
    host.querySelectorAll<HTMLElement>('[data-board-item]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      const body = el.closest<HTMLElement>('.tdw-board-col-body');
      next.set(el.dataset.boardItem!, {
        x: rect.left + (pager?.scrollLeft || 0),
        y: rect.top + (body?.scrollTop || 0),
        rect,
        el,
      });
    });
    const prev = last.current;
    last.current = next;
    if (!enabled || reducedMotion() || !prev.size) {
      if (enabled && !reducedMotion()) {
        // First paint: cards rise in, lightly staggered
        let i = 0;
        next.forEach(({ el }) =>
          el.animate(
            [
              { opacity: 0, transform: 'translateY(8px)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration: 320, delay: Math.min(i++ * 24, 280), easing: EASE, fill: 'backwards' }
          )
        );
      }
      return;
    }
    const moves: Array<() => void> = [];
    next.forEach(({ x, y, el }, id) => {
      const before = prev.get(id);
      if (!before) {
        moves.push(() =>
          el.animate(
            [
              { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration: 280, easing: EASE }
          )
        );
        return;
      }
      const dx = before.x - x;
      const dy = before.y - y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        moves.push(() =>
          el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
            { duration: 380, easing: EASE }
          )
        );
      }
    });
    // Removed cards: React already detached the node; put it back on top of
    // where it was and let it fade out
    const gone = Array.from(prev.entries()).filter(([id, v]) => !next.has(id) && !v.el.isConnected);
    // A whole new set (another week, a new grouping) just swaps
    if (moves.length > 60 || gone.length > 12) return;
    moves.forEach((m) => m());
    gone.forEach(([, { rect, el }]) => {
      el.classList.add('tdw-board-leaving');
      Object.assign(el.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        pointerEvents: 'none',
        zIndex: '60',
      });
      document.body.appendChild(el);
      el.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'scale(0.96)' },
        ],
        { duration: 220, easing: EASE, fill: 'forwards' }
      ).onfinish = () => el.remove();
    });
  });
};

// ── Drag and drop ───────────────────────────────────────────────────────────
interface DragSession {
  id: string;
  from: string;
  el: HTMLElement;
  pointerId: number;
  touch: boolean;
  x0: number;
  y0: number;
  x: number;
  y: number;
  lifted: boolean;
  timer: number;
  ghost?: HTMLElement;
  rect?: DOMRect;
  over: string | null;
  frame: number;
}

const useBoardDrag = ({
  host,
  canDrop,
  onDrop,
}: {
  host: React.RefObject<HTMLDivElement>;
  canDrop?: (itemId: string, from: string, to: string) => boolean;
  onDrop?: (itemId: string, from: string, to: string) => void;
}) => {
  const session = useRef<DragSession | null>(null);
  const [drag, setDrag] = useState<null | { id: string; from: string; over: string | null }>(null);
  const handlers = useRef({ canDrop, onDrop });
  handlers.current = { canDrop, onDrop };

  const laneAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y)?.closest('[data-board-drop]') as HTMLElement | null)?.dataset
      .boardDrop || null;

  // Edge auto-scroll: the pager sideways, the lane under the pointer vertically
  const autoScroll = useCallback(() => {
    const s = session.current;
    if (!s?.lifted) return;
    const pager = host.current?.querySelector<HTMLElement>('.tdw-board-lanes');
    if (pager) {
      const r = pager.getBoundingClientRect();
      const edge = 48;
      if (s.x < r.left + edge) pager.scrollLeft -= 12;
      else if (s.x > r.right - edge) pager.scrollLeft += 12;
    }
    const body = (document.elementFromPoint(s.x, s.y)?.closest('[data-board-drop]') as HTMLElement | null)
      ?.querySelector<HTMLElement>('.tdw-board-col-body');
    if (body) {
      const r = body.getBoundingClientRect();
      if (s.y < r.top + 40) body.scrollTop -= 10;
      else if (s.y > r.bottom - 40) body.scrollTop += 10;
    }
    s.frame = requestAnimationFrame(autoScroll);
  }, []);

  const finish = useCallback((commit: boolean) => {
    const s = session.current;
    session.current = null;
    if (!s) return;
    window.clearTimeout(s.timer);
    cancelAnimationFrame(s.frame);
    host.current?.classList.remove('is-dragging');
    if (!s.lifted) return;
    const { canDrop: can, onDrop: drop } = handlers.current;
    const target = commit ? s.over : null;
    const accepted = !!target && target !== s.from && (can ? can(s.id, s.from, target) : true);
    const ghost = s.ghost!;
    const settle = () => {
      ghost.remove();
      setDrag(null);
    };
    if (accepted) {
      ghost.animate([{ opacity: 1 }, { opacity: 0, transform: `${ghost.style.transform} scale(0.94)` }], {
        duration: reducedMotion() ? 1 : 160,
        easing: EASE,
        fill: 'forwards',
      }).onfinish = settle;
      drop?.(s.id, s.from, target!);
    } else {
      // Fly back to where it was picked up
      ghost.style.transition = reducedMotion() ? 'none' : `transform 260ms ${EASE}, box-shadow 260ms ease`;
      ghost.style.transform = 'none';
      ghost.classList.remove('is-lifted');
      window.setTimeout(settle, reducedMotion() ? 0 : 260);
    }
    // The pointerup that ends a drag must not also open the card
    const swallow = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener('click', swallow, true);
    window.setTimeout(() => window.removeEventListener('click', swallow, true), 0);
  }, []);

  const lift = useCallback(() => {
    const s = session.current;
    if (!s || s.lifted) return;
    s.lifted = true;
    s.rect = s.el.getBoundingClientRect();
    const ghost = s.el.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('data-board-item');
    ghost.classList.add('tdw-board-ghost');
    Object.assign(ghost.style, {
      left: `${s.rect.left}px`,
      top: `${s.rect.top}px`,
      width: `${s.rect.width}px`,
      height: `${s.rect.height}px`,
    });
    // The ghost keeps the theme and type scale of the board it came from
    host.current?.querySelector('.tdw-board-ghost-layer')?.appendChild(ghost);
    requestAnimationFrame(() => ghost.classList.add('is-lifted'));
    s.ghost = ghost;
    s.over = s.from;
    host.current?.classList.add('is-dragging');
    if (s.touch) navigator.vibrate?.(8);
    setDrag({ id: s.id, from: s.from, over: s.from });
    s.frame = requestAnimationFrame(autoScroll);
  }, [autoScroll]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = session.current;
      if (!s || e.pointerId !== s.pointerId) return;
      s.x = e.clientX;
      s.y = e.clientY;
      const dist = Math.hypot(s.x - s.x0, s.y - s.y0);
      if (!s.lifted) {
        // Touch: moving before the long-press fires means scroll or swipe
        if (s.touch) {
          if (dist > 8) finish(false);
          return;
        }
        if (dist > 5) lift();
        return;
      }
      s.ghost!.style.transform = `translate(${s.x - s.x0}px, ${s.y - s.y0}px)`;
      const over = laneAt(s.x, s.y);
      if (over !== s.over) {
        s.over = over;
        setDrag({ id: s.id, from: s.from, over });
      }
    };
    const up = (e: PointerEvent) => {
      if (session.current && e.pointerId === session.current.pointerId) finish(true);
    };
    const cancel = (e: PointerEvent) => {
      if (session.current && e.pointerId === session.current.pointerId) finish(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && session.current?.lifted) finish(false);
    };
    // Once a card is lifted on touch, the finger drags it instead of the page
    const touchMove = (e: TouchEvent) => {
      if (session.current?.lifted && e.cancelable) e.preventDefault();
    };
    // A long-press would otherwise also open the system menu
    const contextMenu = (e: Event) => {
      if (session.current) e.preventDefault();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('contextmenu', contextMenu);
    return () => {
      window.removeEventListener('contextmenu', contextMenu);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      window.removeEventListener('touchmove', touchMove);
      finish(false);
    };
  }, [finish, lift]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || session.current) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, textarea, [role="menu"]')) return;
      const el = target.closest<HTMLElement>('[data-board-item]');
      if (!el || el.dataset.boardDraggable !== 'true') return;
      const from = el.closest<HTMLElement>('[data-board-drop]')?.dataset.boardDrop;
      if (!from) return;
      const touch = e.pointerType === 'touch';
      session.current = {
        id: el.dataset.boardItem!,
        from,
        el,
        pointerId: e.pointerId,
        touch,
        x0: e.clientX,
        y0: e.clientY,
        x: e.clientX,
        y: e.clientY,
        lifted: false,
        timer: touch ? window.setTimeout(lift, 320) : 0,
        over: null,
        frame: 0,
      };
    },
    [lift]
  );

  return { drag, onPointerDown };
};

// ── Column ──────────────────────────────────────────────────────────────────
export const BoardColumn: FC<{
  id: string;
  title: ReactNode;
  tone?: BoardTone;
  icon?: ReactNode;
  count: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  dropState?: BoardDropState;
  deniedHint?: string;
  active?: boolean;
  children: ReactNode;
}> = ({
  id,
  title,
  tone = 'neutral',
  icon,
  count,
  collapsed,
  onToggleCollapse,
  dropState = 'idle',
  deniedHint,
  active,
  children,
}) => {
  const t = useT();
  return (
    <section
      className={clsx('tdw-board-col', collapsed && 'is-collapsed', active && 'is-active')}
      data-tone={tone}
      data-drop={dropState}
      data-board-drop={id}
      aria-label={typeof title === 'string' ? `${title} (${count})` : undefined}
    >
      <header className="tdw-board-col-head">
        {icon || <i className="tdw-board-dot" aria-hidden="true" />}
        <h2 className="tdw-board-col-title">{title}</h2>
        <span key={count} className="tdw-board-count">
          {count}
        </span>
        {onToggleCollapse && (
          <button
            type="button"
            className="tdw-board-collapse"
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('tdw_board_expand', 'Expand column') : t('tdw_board_collapse', 'Collapse column')}
            title={collapsed ? t('tdw_board_expand', 'Expand column') : t('tdw_board_collapse', 'Collapse column')}
            onClick={onToggleCollapse}
          >
            <Icon name={collapsed ? 'maximize-2' : 'minus'} size={14} />
          </button>
        )}
      </header>
      <div className="tdw-board-col-body" role="list">
        {children}
      </div>
      {(dropState === 'denied' || dropState === 'refused') && deniedHint && (
        <div className="tdw-board-denied" role="status">
          <Icon name="lock" size={14} />
          <span>{deniedHint}</span>
        </div>
      )}
    </section>
  );
};

// ── Board ───────────────────────────────────────────────────────────────────
export function Board<T extends BoardItem>({
  lanes,
  renderCard,
  label,
  loading,
  isPhone,
  collapsed = [],
  onToggleCollapse,
  canDrop,
  onDrop,
  deniedHint,
}: {
  lanes: BoardLane<T>[];
  renderCard: (item: T, lane: BoardLane<T>) => ReactNode;
  label: string;
  loading?: boolean;
  // One lane at a time with a tab switcher and swipe
  isPhone?: boolean;
  collapsed?: string[];
  onToggleCollapse?: (laneId: string) => void;
  canDrop?: (itemId: string, from: string, to: string) => boolean;
  onDrop?: (itemId: string, from: string, to: string) => void;
  // Why the dragged card can't go to a lane, shown on that lane while dragging
  deniedHint?: (itemId: string, from: string, to: string) => string | undefined;
}) {
  const host = useRef<HTMLDivElement>(null);
  const pager = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { drag, onPointerDown } = useBoardDrag({ host, canDrop, onDrop });
  useFlip(host, !loading);

  const activeIndex = Math.min(active, Math.max(0, lanes.length - 1));

  // Phones: the pager snaps lane by lane; the tabs follow the scroll
  const onScroll = () => {
    const el = pager.current;
    if (!isPhone || !el) return;
    const index = Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth));
    if (index !== activeIndex) setActive(index);
  };
  const showLane = (index: number) => {
    setActive(index);
    const el = pager.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    el.scrollTo({
      left: (rtl ? -1 : 1) * index * el.clientWidth,
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });
  };
  useEffect(() => {
    if (isPhone && active >= lanes.length) showLane(0);
  }, [lanes.length, isPhone]);

  const dropStateOf = (lane: BoardLane<T>): BoardDropState => {
    if (!drag) return 'idle';
    if (lane.id === drag.from) return 'origin';
    const ok = canDrop ? canDrop(drag.id, drag.from, lane.id) : true;
    if (drag.over === lane.id) return ok ? 'over' : 'refused';
    return ok ? 'allowed' : 'denied';
  };

  return (
    <div
      ref={host}
      className={clsx('tdw-board', isPhone && 'is-phone')}
      aria-busy={loading || undefined}
      onPointerDown={onPointerDown}
    >
      {isPhone && (
        <div className="tdw-board-tabs" role="tablist" aria-label={label}>
          {lanes.map((lane, index) => (
            <button
              key={lane.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className="tdw-board-tab"
              data-tone={lane.tone || 'neutral'}
              data-drop={dropStateOf(lane)}
              data-board-drop={lane.id}
              onClick={() => showLane(index)}
            >
              {lane.icon || <i className="tdw-board-dot" aria-hidden="true" />}
              <span>{lane.title}</span>
              <b key={lane.items.length}>{loading ? '–' : lane.items.length}</b>
            </button>
          ))}
        </div>
      )}
      <div ref={pager} className="tdw-board-lanes" onScroll={onScroll} aria-label={label}>
        {lanes.map((lane, index) => (
          <BoardColumn
            key={lane.id}
            id={lane.id}
            title={lane.title}
            tone={lane.tone}
            icon={lane.icon}
            count={lane.items.length}
            collapsed={!isPhone && collapsed.includes(lane.id)}
            onToggleCollapse={!isPhone && onToggleCollapse ? () => onToggleCollapse(lane.id) : undefined}
            dropState={dropStateOf(lane)}
            deniedHint={drag && deniedHint ? deniedHint(drag.id, drag.from, lane.id) : undefined}
            active={isPhone && index === activeIndex}
          >
            {loading
              ? [0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="tdw-skeleton tdw-board-skeleton"
                    style={{ height: 96 - i * 14, animationDelay: `${i * 90}ms` }}
                  />
                ))
              : lane.items.length
              ? lane.items.map((item) => (
                  <div
                    key={item.id}
                    role="listitem"
                    className={clsx('tdw-board-slot', drag?.id === item.id && 'is-placeholder')}
                    data-board-item={item.id}
                    data-board-draggable={item.draggable ? 'true' : undefined}
                  >
                    {renderCard(item, lane)}
                  </div>
                ))
              : lane.empty}
          </BoardColumn>
        ))}
      </div>
      <div className="tdw-board-ghost-layer" aria-hidden="true" />
    </div>
  );
}
