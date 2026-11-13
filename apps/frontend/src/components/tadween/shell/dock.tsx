'use client';

import {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { usePathname, useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVisibleMenu } from '@gitroom/frontend/components/layout/top.menu';
import { useHasOpenModal } from '@gitroom/frontend/components/layout/new-modal';
import {
  TadweenSheet,
  TadweenSheetGroup,
  TadweenSheetRow,
} from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';
import {
  SidebarChannels,
  useCreatePost,
} from '@gitroom/frontend/components/tadween/shell/sidebar.channels';
import { WorkspaceSheetGroup } from '@gitroom/frontend/components/tadween/shell/sidebar';
import { AccountSheetGroup } from '@gitroom/frontend/components/tadween/shell/account.menu';
import { Icon } from '@gitroom/frontend/components/tadween/ui';

// Phones (below the `mobile` breakpoint): the sidebar becomes a floating dock
// of liquid-glass material at the bottom: Today, Calendar, Create post,
// Analytics and More. More opens a bottom sheet with everything else the
// sidebar holds (pages, channels, workspaces, Upgrade / Admin / Settings and
// the account). The items come from the sidebar's own menu (top.menu.tsx), so
// feature switches and roles apply here too. Styles: app/tadween/shell.scss.

// the dock's own destinations, in order; the rest of the menu goes to More
const DOCK_PATHS = ['/today', '/launches', '/analytics'];

const isCurrent = (pathname: string, path: string) =>
  pathname.indexOf(path) === 0;

// full-height chat pages keep their message box at the bottom edge: no dock
const DOCKLESS_PATHS = ['/agents'];

// Slides out of the way while the page scrolls down and comes back on the way
// up. Any scroller counts (the window or a page's own scrolling panel).
const useScrolledAway = (pathname: string, modalOpen: boolean) => {
  const [away, setAway] = useState(false);

  // a new page, or a dialog closing, starts with the dock in view
  useEffect(() => {
    setAway(false);
  }, [pathname, modalOpen]);

  useEffect(() => {
    const last = new WeakMap<Element, number>();
    const onScroll = (e: Event) => {
      const el =
        e.target === document
          ? document.scrollingElement
          : (e.target as Element);
      if (!el || el.closest?.('.tdw-sheet, [role="dialog"], .tdw-modal-scrim')) {
        return;
      }
      const y = el.scrollTop;
      const prev = last.get(el);
      last.set(el, y);
      if (prev === undefined) {
        return;
      }
      // iOS bounces past both ends: stay as it is there
      const max = el.scrollHeight - el.clientHeight;
      if (y <= 8) {
        setAway(false);
      } else if (y - prev > 6 && y < max - 2) {
        setAway(true);
      } else if (prev - y > 6) {
        setAway(false);
      }
    };
    document.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      document.removeEventListener('scroll', onScroll, { capture: true });
  }, []);

  return away;
};

export const MobileDock: FC = () => {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const { firstMenu, secondMenu } = useVisibleMenu();
  const createPost = useCreatePost();
  const modalOpen = useHasOpenModal();
  const away = useScrolledAway(pathname, modalOpen);
  const [more, setMore] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ x: number; w: number } | null>(null);

  // the dock's three destinations; a switched-off one (Analytics) leaves
  // its place to the next page of the menu
  const links = firstMenu.filter((f) => !f.onClick);
  const preferred = DOCK_PATHS.map((path) =>
    links.find((f) => f.path === path)
  ).filter(Boolean) as typeof links;
  const dock = [
    ...preferred,
    ...links.filter((f) => !preferred.includes(f)),
  ].slice(0, 3);
  const rest = [
    ...firstMenu.filter((f) => !dock.includes(f)),
    ...secondMenu,
  ];
  const active =
    dock.find((f) => isCurrent(pathname, f.path))?.path || 'more';

  // a new page or a dialog (a channel's menu, the language picker) closes More
  useEffect(() => {
    setMore(false);
  }, [pathname]);
  useEffect(() => {
    if (!modalOpen) {
      return;
    }
    setMore(false);
    // the closing sheet hands focus back to More, which is hidden under the
    // dialog now: let it go
    const frame = requestAnimationFrame(() => {
      const focused = document.activeElement as HTMLElement | null;
      if (focused && bar.current?.contains(focused)) {
        focused.blur();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [modalOpen]);

  // the lens sits under the current item; measured, so labels of any length
  // (and the mirrored order in Arabic) line up
  const measure = useCallback(() => {
    const el = bar.current?.querySelector<HTMLElement>(
      `[data-dock="${active}"]`
    );
    setLens(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, [active]);
  useLayoutEffect(measure, [measure, dock.length]);
  // no slide on arrival: the lens animates only once it has a place
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!lens || ready) {
      return;
    }
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [lens, ready]);
  useEffect(() => {
    if (!bar.current) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(bar.current);
    // switching to or from Arabic mirrors the items without a reload
    const direction = new MutationObserver(measure);
    direction.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir'],
    });
    return () => {
      observer.disconnect();
      direction.disconnect();
    };
  }, [measure]);

  const go = useCallback(
    (item: { path: string; onClick?: () => void }) => () => {
      setMore(false);
      if (item.onClick) {
        item.onClick();
        return;
      }
      router.push(item.path);
    },
    [router]
  );

  const link = (item: (typeof dock)[number]) => (
    <Link
      key={item.path}
      href={item.path}
      prefetch={true}
      data-dock={item.path}
      className="tdw-dock-item"
      aria-current={active === item.path ? 'page' : undefined}
    >
      <span className="tdw-dock-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span className="tdw-dock-label">{item.name}</span>
    </Link>
  );

  const moreLabel = t('tdw_dock_more', 'More');
  const createLabel = t('today_create_post', 'Create post');

  return (
    <>
      <nav
        className={clsx(
          'tdw-dock',
          away && 'is-away',
          modalOpen && !more && 'is-hidden',
          DOCKLESS_PATHS.some((path) => isCurrent(pathname, path)) && 'is-off'
        )}
        aria-label={t('tdw_dock_nav', 'Main navigation')}
      >
        <div ref={bar} className="tdw-dock-bar">
          <span
            className={clsx(
              'tdw-dock-lens',
              !lens && 'is-none',
              ready && 'is-ready'
            )}
            style={lens ? { width: lens.w, transform: `translateX(${lens.x}px)` } : undefined}
            aria-hidden="true"
          />
          {dock.slice(0, 2).map(link)}
          <button
            type="button"
            className="tdw-dock-create"
            aria-label={createLabel}
            disabled={createPost.isLoading}
            onClick={createPost.start}
          >
            <Icon name="plus" size={24} />
          </button>
          {dock.slice(2).map(link)}
          <button
            type="button"
            data-dock="more"
            className="tdw-dock-item"
            aria-haspopup="dialog"
            aria-expanded={more}
            data-active={active === 'more' ? true : undefined}
            onClick={() => setMore(true)}
          >
            <span className="tdw-dock-icon" aria-hidden="true">
              <Icon name="ellipsis" size={22} />
            </span>
            <span className="tdw-dock-label">{moreLabel}</span>
          </button>
        </div>
      </nav>
      {/* kept mounted: the account group's appearance switch is what applies
          the saved theme on phones (the sidebar isn't rendered there) */}
      <TadweenSheet
        open={more}
        onClose={() => setMore(false)}
        title={moreLabel}
        className="tdw-dock-sheet"
        // full height: Postiz's channel menu places itself in screen
        // coordinates, which only match a sheet resting at the top
        detent="large"
        keepMounted={true}
      >
        {rest.length ? (
          <TadweenSheetGroup>
            {rest.map((item) => (
              <TadweenSheetRow
                key={item.path + item.name}
                icon={item.icon}
                label={item.name}
                current={
                  !item.onClick && isCurrent(pathname, item.path)
                    ? 'page'
                    : undefined
                }
                className={item.className}
                onClick={go(item)}
              />
            ))}
          </TadweenSheetGroup>
        ) : null}
        <div className="tdw-sheet-group-wrap tdw-dock-channels">
          <SidebarChannels collapsed={false} />
        </div>
        <WorkspaceSheetGroup />
        <AccountSheetGroup onNavigate={() => setMore(false)} />
      </TadweenSheet>
    </>
  );
};
