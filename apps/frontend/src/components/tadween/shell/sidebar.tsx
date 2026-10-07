'use client';

import { FC, useCallback, useEffect } from 'react';
import useCookie from 'react-use-cookie';
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

export const SidebarHeader: FC<{
  collapsed: boolean;
  onToggle: () => void;
}> = ({ collapsed, onToggle }) => {
  const t = useT();
  const user = useUser();
  const { data } = useOrganizations();
  const current = data?.find?.((d: any) => d.id === user?.orgId);
  const label = collapsed
    ? t('expand_sidebar', 'Expand sidebar')
    : t('collapse_sidebar', 'Collapse sidebar');
  const keys = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘\\' : 'Ctrl+\\';

  return (
    <div className="tdw-side-top">
      <div className="tdw-side-brand">
        <Logo />
        <span className="tdw-side-ws tdw-side-label">
          <span className="tdw-side-ws-name">{current?.name || 'Tadween'}</span>
          <span className="tdw-side-ws-caption">
            {t('workspace', 'Workspace')}
          </span>
        </span>
      </div>
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
