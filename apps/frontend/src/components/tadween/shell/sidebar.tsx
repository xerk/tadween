'use client';

import { CSSProperties, FC, useCallback, useEffect, useRef, useState } from 'react';
import useCookie from 'react-use-cookie';
import clsx from 'clsx';
import useSWR from 'swr';
import { createPortal } from 'react-dom';
import { Tooltip } from 'react-tooltip';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// Tadween app shell: the left menu is a full panel (logo, workspace, labelled items)
// or an icon rail with floating labels. ⌘\ / Ctrl+\ or the panel button switches.
// The choice is kept in the `tdw-side` cookie, like Postiz's `collapseMenu`.
// Styles: app/tadween/shell.scss. Below the `mobile` breakpoint the slide-in
// menu always shows the full panel.

export const useSidebarCollapsed = () => {
  const [side, setSide] = useCookie('tdw-side', 'full');
  const collapsed = side === 'rail';

  const toggle = useCallback(() => {
    setSide(collapsed ? 'full' : 'rail');
  }, [collapsed, setSide]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle]);

  return { collapsed, toggle };
};

// Same SWR key as OrganizationSelector, so both share one request.
const useOrganizations = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch('/user/organizations')).json();
  }, []);
  return useSWR('organizations', load, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnReconnect: false,
  });
};

// Labels for the collapsed rail. A dedicated react-tooltip instance that also opens
// on keyboard focus. Portalled to <body>: #left-menu is position: fixed, which makes
// it a stacking context the page content would otherwise paint over.
export const RailTooltip: FC = () => {
  if (typeof document === 'undefined') {
    return null;
  }
  const rtl = document.documentElement.dir === 'rtl';
  return createPortal(
    <Tooltip
      id="tdw-rail"
      className="tdw-railtip"
      place={rtl ? 'left' : 'right'}
      positionStrategy="fixed"
      offset={12}
      delayShow={150}
      noArrow={true}
      opacity={1}
      openEvents={{ mouseenter: true, focus: true }}
      closeEvents={{ mouseleave: true, blur: true }}
    />,
    document.body
  );
};

const ChevronsUpDown: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
  </svg>
);

// The workspace name opens the workspace list (design system: the sidebar's
// switcher). Switching is Postiz's own: POST /user/change-org, then reload, as
// OrganizationSelector does. With a single workspace it is just the name.
const WorkspaceSwitcher: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const { data } = useOrganizations();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const list: { id: string; name: string }[] = Array.isArray(data) ? data : [];
  const current = list.find((d) => d.id === user?.orgId);

  const changeOrg = useCallback(
    (id: string) => async () => {
      setOpen(false);
      if (id === user?.orgId) {
        return;
      }
      await fetch('/user/change-org', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      window.location.reload();
    },
    [user?.orgId]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!trigger.current?.contains(target) && !panel.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onResize = () => setOpen(false);
    panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const name = (
    <span className="tdw-side-ws tdw-side-label">
      <span className="tdw-side-ws-name">{current?.name || 'Tadween'}</span>
      <span className="tdw-side-ws-caption">{t('workspace', 'Workspace')}</span>
    </span>
  );

  if (list.length < 2) {
    return (
      <div className="tdw-side-brand">
        <Logo />
        {name}
      </div>
    );
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="tdw-side-brand tdw-side-switch"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('workspace', 'Workspace')}: ${current?.name || ''}`}
        data-tooltip-id="tdw-rail"
        data-tooltip-content={current?.name || ''}
        data-tooltip-hidden={open}
        onClick={(e) => {
          // The mobile slide-in menu closes on any click inside it
          e.stopPropagation();
          const r = trigger.current!.getBoundingClientRect();
          const rtl = document.documentElement.dir === 'rtl';
          setStyle({
            top: r.bottom + 6,
            [rtl ? 'right' : 'left']: rtl ? window.innerWidth - r.right : r.left,
            width: Math.max(r.width, 232),
          });
          setOpen(!open);
        }}
      >
        <Logo />
        {name}
        <span className="tdw-acct-chev tdw-side-label">
          <ChevronsUpDown />
        </span>
      </button>
      {createPortal(
        <div
          ref={panel}
          role="menu"
          aria-label={t('workspace', 'Workspace')}
          className={clsx('tdw-acct-menu tdw-side-switch-menu', open && 'is-open')}
          style={style}
        >
          {list.map((org) => (
            <button
              key={org.id}
              type="button"
              role="menuitem"
              className="tdw-acct-item"
              aria-current={org.id === user?.orgId ? 'true' : undefined}
              onClick={changeOrg(org.id)}
            >
              <span className="tdw-acct-ico">
                {org.id === user?.orgId && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span className="tdw-side-switch-name">{org.name}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export const SidebarHeader: FC<{
  collapsed: boolean;
  onToggle: () => void;
}> = ({ collapsed, onToggle }) => {
  const t = useT();
  const label = collapsed
    ? t('expand_sidebar', 'Expand sidebar')
    : t('collapse_sidebar', 'Collapse sidebar');
  const keys = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘\\' : 'Ctrl+\\';

  return (
    <div className="tdw-side-top">
      <WorkspaceSwitcher />
      <button
        type="button"
        className="tdw-side-toggle"
        aria-label={label}
        aria-expanded={!collapsed}
        aria-keyshortcuts="Meta+Backslash Control+Backslash"
        data-tooltip-id="tdw-rail"
        data-tooltip-content={`${label}  ${keys}`}
        title={collapsed ? undefined : `${label} (${keys})`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 3v18" />
          <path d={collapsed ? 'm14 9 3 3-3 3' : 'm16 15-3-3 3-3'} />
        </svg>
      </button>
      {collapsed && <RailTooltip />}
    </div>
  );
};
