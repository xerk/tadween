'use client';

// Super-admin console frame: its own full-screen shell, separate from the
// customer app (no workspace sidebar or top bar). Grouped left sidebar that
// collapses to an icon rail (⌘\ / Ctrl+\) and becomes a slide-in drawer on
// phones; top bar with breadcrumbs, search across workspaces and users, the
// environment, Back to app and the account menu. Styles: app/tadween/admin.scss.
import React, { FC, ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useCookie from 'react-use-cookie';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { AccountMenu } from '@gitroom/frontend/components/tadween/shell/account.menu';
import {
  cx,
  Icon,
  LinkButton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import { AdminSearch } from './admin.search';

interface NavItem {
  href: string;
  key: string;
  label: string;
  icon: string;
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    key: 'tdw_admin_group_home',
    label: 'Home',
    items: [{ href: '/admin', key: 'tdw_admin_overview', label: 'Overview', icon: 'layout-list' }],
  },
  {
    key: 'tdw_admin_group_customers',
    label: 'Customers',
    items: [
      { href: '/admin/organizations', key: 'tdw_admin_subscribers', label: 'Subscribers', icon: 'building-2' },
      { href: '/admin/users', key: 'tdw_admin_users', label: 'Users', icon: 'users' },
    ],
  },
  {
    key: 'tdw_admin_group_product',
    label: 'Product',
    items: [
      { href: '/admin/channels', key: 'tdw_admin_channels', label: 'Channels', icon: 'plug' },
      { href: '/admin/plans', key: 'tdw_admin_plans', label: 'Plans', icon: 'credit-card' },
      { href: '/admin/features', key: 'tdw_admin_features', label: 'Features', icon: 'zap' },
    ],
  },
  {
    key: 'tdw_admin_group_brand',
    label: 'Brand',
    items: [{ href: '/admin/branding', key: 'tdw_admin_branding', label: 'Branding', icon: 'palette' }],
  },
  {
    key: 'tdw_admin_group_system',
    label: 'System',
    items: [
      { href: '/admin/errors', key: 'tdw_admin_errors', label: 'Post errors', icon: 'triangle-alert' },
      { href: '/admin/stats', key: 'tdw_admin_stats', label: 'Usage stats', icon: 'chart-column' },
      { href: '/admin/api', key: 'tdw_admin_api', label: 'API', icon: 'webhook' },
    ],
  },
];

const isActive = (path: string, href: string) =>
  href === '/admin' ? path === '/admin' : path === href || path.startsWith(href + '/');

const useAdminSidebar = () => {
  const [side, setSide] = useCookie('tdw-admin-side', 'full');
  const collapsed = side === 'rail';
  const toggle = useCallback(() => setSide(collapsed ? 'full' : 'rail'), [collapsed, setSide]);
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

const Breadcrumbs: FC<{ path: string }> = ({ path }) => {
  const t = useT();
  const group = ADMIN_NAV.find((g) => g.items.some((i) => isActive(path, i.href)));
  const item = group?.items.find((i) => isActive(path, i.href));
  return (
    <nav className="adm-crumbs" aria-label={t('tdw_admin_breadcrumbs', 'Breadcrumbs')}>
      <Link href="/admin" className="adm-crumb">
        {t('tdw_admin_title', 'Admin')}
      </Link>
      {group && item && item.href !== '/admin' ? (
        <>
          <Icon name="chevron-right" size={14} className="adm-crumb-sep" />
          <span className="adm-crumb is-muted">{t(group.key, group.label)}</span>
          <Icon name="chevron-right" size={14} className="adm-crumb-sep" />
          <span className="adm-crumb is-current" aria-current="page">
            {t(item.key, item.label)}
          </span>
        </>
      ) : null}
    </nav>
  );
};

export const AdminShell: FC<{ children: ReactNode }> = ({ children }) => {
  const t = useT();
  const path = usePathname() || '/admin';
  const { environment } = useVariables();
  const { collapsed, toggle } = useAdminSidebar();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [path]);

  const production = environment === 'production';
  const toggleLabel = collapsed
    ? t('expand_sidebar', 'Expand sidebar')
    : t('collapse_sidebar', 'Collapse sidebar');

  return (
    <TadweenScope className={cx('adm-root', collapsed && 'is-collapsed')}>
      {drawer ? <div className="adm-scrim" onClick={() => setDrawer(false)} /> : null}
      <aside className={cx('adm-side', drawer && 'is-open')} aria-label={t('tdw_admin_console', 'Admin console')}>
        <div className="adm-side-top">
          <Link href="/admin" className="adm-brand no-underline">
            <Logo />
            <span className="adm-label adm-brand-text">
              <span className="adm-brand-name">Tadween</span>
              <span className="adm-brand-sub">{t('tdw_admin_console', 'Admin console')}</span>
            </span>
          </Link>
          <button
            type="button"
            className="adm-side-toggle"
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            title={toggleLabel}
            onClick={toggle}
          >
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} className="adm-flip" />
          </button>
          <button
            type="button"
            className="adm-side-close"
            aria-label={t('close', 'Close')}
            onClick={() => setDrawer(false)}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <nav className="adm-nav">
          {ADMIN_NAV.map((g) => (
            <div key={g.key} className="adm-nav-group">
              <div className="adm-nav-heading adm-label">{t(g.key, g.label)}</div>
              {g.items.map((n) => {
                const active = isActive(path, n.href);
                const label = t(n.key, n.label);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cx('adm-nav-item no-underline', active && 'is-active')}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? label : undefined}
                  >
                    <Icon name={n.icon} size={18} />
                    <span className="adm-label">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="adm-side-foot">
          <Link href="/launches" className="adm-nav-item no-underline" title={collapsed ? t('tdw_admin_back', 'Back to app') : undefined}>
            <Icon name="arrow-left" size={18} className="adm-flip" />
            <span className="adm-label">{t('tdw_admin_back', 'Back to app')}</span>
          </Link>
          <AccountMenu />
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-top">
          <button
            type="button"
            className="adm-menu-btn"
            aria-label={t('tdw_open_menu', 'Open menu')}
            onClick={() => setDrawer(true)}
          >
            <Icon name="menu" size={20} />
          </button>
          <Breadcrumbs path={path} />
          <span className="adm-top-spacer" />
          <AdminSearch />
          <span
            className={cx('adm-env', production ? 'is-prod' : 'is-dev')}
            title={t('tdw_admin_env', 'Environment')}
          >
            <span className="adm-env-dot" aria-hidden="true" />
            {production
              ? t('tdw_admin_env_prod', 'Production')
              : !environment || environment === 'development'
              ? t('tdw_admin_env_dev', 'Development')
              : environment}
          </span>
          <LinkButton href="/launches" size="sm" variant="ghost" icon="arrow-left" className="adm-back">
            {t('tdw_admin_back', 'Back to app')}
          </LinkButton>
        </header>
        <main className="adm-content">{children}</main>
      </div>
    </TadweenScope>
  );
};

// Page body: title row and full-width content.
export const AdminPage: FC<{
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}> = ({ title, description, action, children }) => (
  <div className="adm-page">
    <div className="adm-page-head">
      <div className="min-w-0">
        <h1 className="title-2">{title}</h1>
        {description ? <p className="adm-page-desc">{description}</p> : null}
      </div>
      {action ? <div className="adm-page-actions">{action}</div> : null}
    </div>
    {children}
  </div>
);
