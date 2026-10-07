'use client';

import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// Phones get the composer's sheets from the same width upstream's `mobile:`
// screen starts at (tailwind.config.cjs), so both layouts switch together.
export const PHONE_QUERY = '(max-width: 1025px)';

export const usePhoneLayout = () => {
  const [phone, setPhone] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches
  );

  useEffect(() => {
    const media = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return phone;
};

export type TadweenSheetDetent = 'fit' | 'medium' | 'large';

// the open sheets, newest last: only the top one answers Escape and Tab
const openSheets: string[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

// past the top the sheet follows the finger less and less (UIScrollView's curve)
const rubberBand = (distance: number, dimension: number) =>
  (1 - 1 / ((distance * 0.55) / dimension + 1)) * dimension;

// where a flick would come to rest with UIScrollView's normal deceleration
const project = (velocity: number) => (velocity * 0.998) / (1 - 0.998);

// A bottom sheet for the phone composer: slides up on a spring, follows the
// finger 1:1 when dragged by its grabber (or by its content once that is
// scrolled to the top), and settles on the nearest detent or dismisses,
// judged by where the flick would land. Escape and the scrim close it, Tab
// stays inside it while it is open. Styles: app/tadween/composer-mobile.scss.
//
// `inline` keeps the content where it is in the page instead of a portal; above
// the phone breakpoint the sheet chrome disappears (display: contents) and the
// content shows as part of the page. `keepMounted` keeps the content in the DOM
// while the sheet is closed, for portal targets that must always exist.
export const TadweenSheet: FC<{
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  // a text button (like Done) in place of the close button; a medium detent
  // hides the footer below the screen, so those sheets put their action here
  done?: { label: ReactNode; disabled?: boolean };
  detent?: TadweenSheetDetent;
  keepMounted?: boolean;
  inline?: boolean;
  className?: string;
}> = ({
  open,
  onClose,
  title,
  children,
  footer,
  done,
  detent = 'fit',
  keepMounted,
  inline,
  className,
}) => {
  const t = useT();
  const id = useId();
  const phone = usePhoneLayout();
  const active = open && (!inline || phone);
  const [present, setPresent] = useState(active);
  const [shown, setShown] = useState(false);
  const [level, setLevel] = useState<'medium' | 'large'>(
    detent === 'medium' ? 'medium' : 'large'
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const levelRef = useRef(level);
  levelRef.current = level;
  const drag = useRef<{
    start: number;
    offset: number;
    samples: { y: number; t: number }[];
  } | null>(null);

  // enter on the frame after mounting so the spring has a start, leave
  // faster than it came in
  useEffect(() => {
    if (active) {
      setPresent(true);
      setLevel(detent === 'medium' ? 'medium' : 'large');
      rootRef.current?.style.setProperty('--tdw-sheet-drag', '0px');
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    setShown(false);
    const timer = setTimeout(() => setPresent(false), 280);
    return () => clearTimeout(timer);
  }, [active]);

  // focus moves into the sheet, Tab cycles inside it, Escape closes the top
  // one, and focus goes back to what opened it
  useEffect(() => {
    if (!active) {
      return;
    }

    openSheets.push(id);
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      panelRef.current?.focus({ preventScroll: true })
    );

    const onKey = (e: KeyboardEvent) => {
      if (openSheets[openSheets.length - 1] !== id) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((p) => p.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !panelRef.current.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey, true);
      openSheets.splice(openSheets.indexOf(id), 1);
      if (previous && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [active, id]);

  // how far down the medium detent rests, the large one rests at 0
  const restOffset = useCallback(
    (which: 'medium' | 'large') => {
      const height = panelRef.current?.offsetHeight || 0;
      return which === 'medium'
        ? Math.max(0, height - window.innerHeight * 0.5)
        : 0;
    },
    []
  );

  const begin = useCallback(
    (y: number) => {
      drag.current = {
        start: y,
        offset: restOffset(levelRef.current),
        samples: [{ y, t: performance.now() }],
      };
      rootRef.current?.classList.add('is-dragging');
    },
    [restOffset]
  );

  const move = useCallback((y: number) => {
    const current = drag.current;
    const root = rootRef.current;
    if (!current || !root) {
      return;
    }

    const height = panelRef.current?.offsetHeight || 1;
    let position = current.offset + (y - current.start);
    if (position < 0) {
      position = -rubberBand(-position, height);
    }

    root.style.setProperty('--tdw-sheet-drag', `${position - current.offset}px`);
    root.style.setProperty(
      '--tdw-sheet-progress',
      String(Math.max(0, Math.min(1, 1 - position / height)))
    );

    const now = performance.now();
    current.samples.push({ y, t: now });
    current.samples = current.samples.filter((p) => now - p.t < 100);
  }, []);

  const end = useCallback(() => {
    const current = drag.current;
    const root = rootRef.current;
    drag.current = null;
    if (!current || !root) {
      return;
    }

    root.classList.remove('is-dragging');
    root.style.removeProperty('--tdw-sheet-progress');

    const first = current.samples[0];
    const last = current.samples[current.samples.length - 1];
    const velocity =
      last.t - first.t > 0 ? (last.y - first.y) / (last.t - first.t) : 0;
    const height = panelRef.current?.offsetHeight || 0;
    const position = current.offset + (last.y - current.start);
    const landing = position + project(velocity);

    const stops: { at: number; to: 'medium' | 'large' | 'close' }[] = [
      { at: 0, to: 'large' },
      ...(detent === 'medium'
        ? [{ at: restOffset('medium'), to: 'medium' as const }]
        : []),
      { at: height, to: 'close' },
    ];
    const target = stops.reduce((best, stop) =>
      Math.abs(stop.at - landing) < Math.abs(best.at - landing) ? stop : best
    );

    if (target.to === 'close') {
      // the sheet leaves from where it was let go
      onCloseRef.current();
      return;
    }

    root.dataset.detent = target.to;
    root.style.setProperty('--tdw-sheet-drag', '0px');
    setLevel(target.to);
  }, [detent, restOffset]);

  // the grabber and the title row drag the sheet with any pointer
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      e.button !== 0 ||
      (e.target as HTMLElement).closest('button, a, input, [role="button"]')
    ) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    begin(e.clientY);
  };

  // the content drags the sheet down once it is scrolled to the top (and up
  // from the medium detent); otherwise it scrolls
  useEffect(() => {
    const body = bodyRef.current;
    if (!present || !body) {
      return;
    }

    let startX = 0;
    let startY = 0;
    let decided = false;
    let dragging = false;

    const start = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      decided = false;
      dragging = false;
    };

    const moveTouch = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      if (!decided) {
        const dx = x - startX;
        const dy = y - startY;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
          return;
        }
        decided = true;
        dragging =
          Math.abs(dy) > Math.abs(dx) &&
          ((dy > 0 && body.scrollTop <= 0) ||
            (dy < 0 && levelRef.current === 'medium' && detent === 'medium'));
        if (dragging) {
          begin(startY);
        }
      }

      if (dragging) {
        e.preventDefault();
        move(y);
      }
    };

    const stop = () => {
      if (dragging) {
        end();
      }
      dragging = false;
    };

    body.addEventListener('touchstart', start, { passive: true });
    body.addEventListener('touchmove', moveTouch, { passive: false });
    body.addEventListener('touchend', stop);
    body.addEventListener('touchcancel', stop);
    return () => {
      body.removeEventListener('touchstart', start);
      body.removeEventListener('touchmove', moveTouch);
      body.removeEventListener('touchend', stop);
      body.removeEventListener('touchcancel', stop);
    };
  }, [present, detent, begin, move, end]);

  // above the breakpoint an inline sheet is just its content
  const asSheet = !inline || phone;
  if (!present && !keepMounted && asSheet) {
    return null;
  }

  const sheet = (
    <div
      ref={rootRef}
      className={clsx('tdw-sheet', inline && 'is-inline', className)}
      data-state={shown ? 'open' : 'closed'}
      data-present={present}
      data-detent={detent === 'medium' ? level : detent}
      // clicks inside a portal still bubble through React to the composer
      onClick={asSheet ? (e) => e.stopPropagation() : undefined}
    >
      <div
        className="tdw-sheet-scrim"
        aria-hidden="true"
        onClick={() => onCloseRef.current()}
      />
      <div
        ref={panelRef}
        className="tdw-sheet-panel"
        role={asSheet ? 'dialog' : undefined}
        aria-modal={asSheet ? true : undefined}
        aria-labelledby={asSheet ? `${id}-title` : undefined}
        tabIndex={asSheet ? -1 : undefined}
      >
        <div
          className="tdw-sheet-head"
          onPointerDown={onPointerDown}
          onPointerMove={(e) => drag.current && move(e.clientY)}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <span className="tdw-sheet-grabber" aria-hidden="true" />
          <div className="tdw-sheet-bar">
            <h2 id={`${id}-title`} className="tdw-sheet-title">
              {title}
            </h2>
            {done ? (
              <button
                type="button"
                className="tdw-sheet-done"
                disabled={done.disabled}
                onClick={() => onCloseRef.current()}
              >
                {done.label}
              </button>
            ) : (
              <button
                type="button"
                className="tdw-sheet-close"
                aria-label={t('close', 'Close')}
                onClick={() => onCloseRef.current()}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 2.5l7 7M9.5 2.5l-7 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div ref={bodyRef} className="tdw-sheet-body">
          {children}
        </div>
        {!!footer && <div className="tdw-sheet-foot">{footer}</div>}
      </div>
    </div>
  );

  if (inline || typeof document === 'undefined') {
    return sheet;
  }

  return createPortal(sheet, document.body);
};

// The sheet's main action, full width under the content.
export const TadweenSheetButton: FC<{
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, onClick, disabled }) => (
  <button
    type="button"
    className="tdw-sheet-btn"
    disabled={disabled}
    onClick={onClick}
  >
    {label}
  </button>
);

// An inset grouped list of large rows, like iOS settings.
export const TadweenSheetGroup: FC<{
  children: ReactNode;
  label?: ReactNode;
}> = ({ children, label }) => (
  <div className="tdw-sheet-group-wrap">
    {!!label && <div className="tdw-sheet-group-label">{label}</div>}
    <div className="tdw-sheet-group">{children}</div>
  </div>
);

export const TadweenSheetRow: FC<{
  icon?: ReactNode;
  label: ReactNode;
  value?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  chevron?: boolean;
  disabled?: boolean;
}> = ({ icon, label, value, onClick, destructive, chevron = true, disabled }) => (
  <button
    type="button"
    className={clsx('tdw-sheet-row', destructive && 'is-destructive')}
    onClick={onClick}
    disabled={disabled}
  >
    {!!icon && (
      <span className="tdw-sheet-row-ico" aria-hidden="true">
        {icon}
      </span>
    )}
    <span className="tdw-sheet-row-label">{label}</span>
    {value !== undefined && (
      <span className="tdw-sheet-row-value">{value}</span>
    )}
    {chevron && !destructive && (
      <svg
        className="tdw-sheet-row-chev"
        width="8"
        height="13"
        viewBox="0 0 8 13"
        aria-hidden="true"
      >
        <path
          d="M1.5 1.5l5 5-5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </button>
);
