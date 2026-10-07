'use client';

// Super-admin console frame: the design system's SettingsLayout (side nav +
// body) wrapped around every /admin page, including Postiz's own errors and
// stats pages.
import React, { FC, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx, Icon, TadweenScope } from '@gitroom/frontend/components/tadween/ui';

const NAV = [
  { href: '/admin', label: 'Overview', icon: 'layout-list' },
  { href: '/admin/channels', label: 'Channels', icon: 'plug' },
  { href: '/admin/features', label: 'Features', icon: 'zap' },
  { href: '/admin/plans', label: 'Plans', icon: 'credit-card' },
  { href: '/admin/users', label: 'Users', icon: 'users' },
  { href: '/admin/branding', label: 'Branding', icon: 'palette' },
];

const TOOLS = [
  { href: '/admin/errors', label: 'Post errors', icon: 'triangle-alert' },
  { href: '/admin/stats', label: 'Usage stats', icon: 'chart-column' },
];

export const AdminShell: FC<{ children: ReactNode }> = ({ children }) => {
  const path = usePathname();
  const isActive = (href: string) =>
    href === '/admin' ? path === '/admin' : path.indexOf(href) === 0;
  const item = (n: { href: string; label: string; icon: string }) => (
    <Link
      key={n.href}
      href={n.href}
      className={cx('pz-side-item no-underline', isActive(n.href) && 'is-active')}
      aria-current={isActive(n.href) ? 'page' : undefined}
    >
      <Icon name={n.icon} size={16} />
      {n.label}
    </Link>
  );
  return (
    <TadweenScope className="flex-1 min-w-0 flex bg-[var(--tdw-background)]">
      <div className="pz-settings flex-1 min-w-0 !rounded-none">
        <nav
          className="pz-settings-nav mobile:!flex-row mobile:overflow-x-auto mobile:!border-e-0 mobile:border-b mobile:border-[var(--tdw-border)]"
          aria-label="Admin console"
        >
          <div className="caption pz-muted px-[10px] pt-[4px] pb-[6px] mobile:hidden">
            Super admin
          </div>
          {NAV.map(item)}
          <div className="caption pz-muted px-[10px] pt-[14px] pb-[6px] mobile:hidden">
            Tools
          </div>
          {TOOLS.map(item)}
        </nav>
        <div className="min-w-0 overflow-x-hidden">{children}</div>
      </div>
    </TadweenScope>
  );
};

// Page body with the design system's spacing and a title row.
export const AdminPage: FC<{
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}> = ({ title, description, action, children }) => (
  <div className="pz-settings-body max-w-[1100px]">
    <div className="flex items-start justify-between gap-[16px] mobile:flex-col">
      <div>
        <h2 className="title-2">{title}</h2>
        {description ? (
          <p className="pz-set-desc mt-[4px] text-[14px] leading-[20px]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
    {children}
  </div>
);
