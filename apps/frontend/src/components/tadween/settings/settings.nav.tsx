'use client';

import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Icon,
  IconName,
  Spinner,
} from '@gitroom/frontend/components/tadween/ui';

// Tadween settings shell: the grouped side nav with search (a list screen on
// phones), the sticky page header, the section card, the row (label and help
// left, control right), the list row and the inline save state. Styles:
// app/tadween/settings.scss. Documented in docs/tadween/settings.md.
export type SettingsGroup =
  | 'account'
  | 'workspace'
  | 'developers'
  | 'billing'
  | 'danger';

export interface SettingsNavItem {
  tab: string;
  group: SettingsGroup;
  icon: IconName;
  label: string;
  description: string;
  // extra words the search matches (the labels of the rows on the page)
  keywords?: string[];
  // a link to another page (Billing) instead of a settings page
  href?: string;
}

const groupOrder: SettingsGroup[] = [
  'account',
  'workspace',
  'developers',
  'billing',
  'danger',
];

const matches = (item: SettingsNavItem, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return [item.label, item.description, ...(item.keywords || [])].some(
    (text) => text.toLowerCase().includes(q)
  );
};

export const SettingsNav: FC<{
  items: SettingsNavItem[];
  current?: string;
  onChange: (tab: string) => void;
  footer?: ReactNode;
  // phones: the nav is the whole screen, iOS Settings style
  asList?: boolean;
}> = ({ items, current, onChange, footer, asList }) => {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const groupLabels: Record<SettingsGroup, string> = {
    account: t('tdw_set_group_account', 'Account'),
    workspace: t('tdw_set_group_workspace', 'Workspace'),
    developers: t('tdw_set_group_developers', 'Developers'),
    billing: t('tdw_set_group_billing', 'Billing'),
    danger: t('tdw_set_group_danger', 'Danger zone'),
  };
  const found = useMemo(
    () => items.filter((item) => matches(item, query)),
    [items, query]
  );
  const groups = useMemo(
    () =>
      groupOrder
        .map((group) => ({
          group,
          items: found.filter((item) => item.group === group),
        }))
        .filter((g) => g.items.length),
    [found]
  );

  const renderItem = (item: SettingsNavItem) => {
    const active = !asList && item.tab === current;
    const inner = (
      <>
        <span className="tdw-settings-ico">
          <Icon name={item.icon} size={16} />
        </span>
        <span className="tdw-settings-text">
          <span className="tdw-settings-label">{item.label}</span>
          {asList ? (
            <span className="tdw-settings-sub">{item.description}</span>
          ) : null}
        </span>
        {item.href ? (
          <span className="tdw-settings-chev">
            <Icon name="external-link" size={14} />
          </span>
        ) : asList ? (
          <span className="tdw-settings-chev tdw-flip">
            <Icon name="chevron-right" size={16} />
          </span>
        ) : null}
      </>
    );
    const className = clsx(
      'tdw-settings-item',
      item.group === 'danger' && 'is-danger',
      active && 'is-active'
    );
    return item.href ? (
      <Link key={item.tab} href={item.href} className={className}>
        {inner}
      </Link>
    ) : (
      <button
        key={item.tab}
        type="button"
        className={className}
        aria-current={active ? 'page' : undefined}
        onClick={() => onChange(item.tab)}
      >
        {inner}
      </button>
    );
  };

  return (
    <nav
      className={clsx('tdw-ui tdw-settings-nav', asList && 'is-list')}
      aria-label={t('tdw_set_nav', 'Settings')}
    >
      <label className="tdw-settings-search">
        <Icon name="search" size={15} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && found[0]) {
              e.preventDefault();
              if (found[0].href) {
                router.push(found[0].href);
              } else {
                onChange(found[0].tab);
              }
            }
            if (e.key === 'Escape') {
              setQuery('');
            }
          }}
          placeholder={t('tdw_set_search', 'Search settings')}
          aria-label={t('tdw_set_search', 'Search settings')}
        />
      </label>
      <div className="tdw-settings-groups">
        {groups.map(({ group, items: groupItems }) => (
          <div key={group} className="tdw-settings-group">
            <div className="tdw-settings-glabel">{groupLabels[group]}</div>
            <div className="tdw-settings-gitems">
              {groupItems.map(renderItem)}
            </div>
          </div>
        ))}
        {!groups.length ? (
          <div className="tdw-settings-nomatch" role="status">
            <Icon name="search" size={18} />
            <span>{t('tdw_set_no_match', 'No settings match')}</span>
          </div>
        ) : null}
      </div>
      {footer ? <div className="tdw-settings-foot">{footer}</div> : null}
    </nav>
  );
};

// The top of a settings page: stays put while the page scrolls. On phones a
// back button returns to the list.
export const SettingsPageHeader: FC<{
  title: string;
  description?: string;
  onBack?: () => void;
  action?: ReactNode;
}> = ({ title, description, onBack, action }) => {
  const t = useT();
  return (
    <header className="tdw-ui tdw-settings-head">
      {onBack ? (
        <button
          type="button"
          className="tdw-settings-back"
          onClick={onBack}
          aria-label={t('tdw_set_back', 'All settings')}
        >
          <span className="tdw-flip">
            <Icon name="chevron-left" size={18} />
          </span>
          <span>{t('tdw_set_nav', 'Settings')}</span>
        </button>
      ) : null}
      <div className="tdw-settings-head-row">
        <div className="tdw-settings-head-text">
          <h2>{title}</h2>
          {description ? <p className="tdw-set-desc">{description}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
};

export const SettingsSection: FC<{
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}> = ({ title, description, action, children, className }) => (
  <section className={clsx('tdw-set-sec', className)}>
    {title ? (
      <header className="tdw-set-sec-head">
        <div>
          <h3>{title}</h3>
          {description ? <p className="tdw-set-desc">{description}</p> : null}
        </div>
        {action}
      </header>
    ) : null}
    {children ? <div className="tdw-set-sec-body">{children}</div> : null}
  </section>
);

// One setting: what it is on the start side, its control on the end side.
export const SettingsRow: FC<{
  label: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  children?: ReactNode;
  tone?: 'danger';
}> = ({ label, description, status, children, tone }) => (
  <div className={clsx('tdw-set-row', tone === 'danger' && 'is-danger')}>
    <div className="tdw-set-row-text">
      <span className="tdw-set-row-label">{label}</span>
      {description ? (
        <span className="tdw-set-row-desc">{description}</span>
      ) : null}
    </div>
    <div className="tdw-set-row-control">
      {status}
      {children}
    </div>
  </div>
);

// A saved item (webhook, signature, set, feed): clicking it opens the editor,
// its quick actions sit on the end side.
export const SettingsListRow: FC<{
  icon: IconName;
  title: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  onOpen?: () => void;
  openLabel?: string;
  actions?: ReactNode;
}> = ({ icon, title, meta, badges, onOpen, openLabel, actions }) => {
  const body = (
    <>
      <span className="tdw-set-li-ico" aria-hidden="true">
        <Icon name={icon} size={16} />
      </span>
      <span className="tdw-set-li-text">
        <span className="tdw-set-li-title">
          <span className="tdw-set-li-name">{title}</span>
          {badges}
        </span>
        {meta ? <span className="tdw-set-li-meta">{meta}</span> : null}
      </span>
    </>
  );
  return (
    <li className="tdw-set-li">
      {onOpen ? (
        <button
          type="button"
          className="tdw-set-li-main"
          onClick={onOpen}
          aria-label={openLabel}
        >
          {body}
        </button>
      ) : (
        <div className="tdw-set-li-main">{body}</div>
      )}
      {actions ? <div className="tdw-set-li-actions">{actions}</div> : null}
    </li>
  );
};

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Runs a save and reports it next to the control: a spinner, then "Saved"
// for a moment, or "Couldn't save" until the next try. The job returns false
// (or throws) when the save failed.
export const useSaveState = () => {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = useCallback(async (job: () => Promise<boolean | void>) => {
    clearTimeout(timer.current);
    setStatus('saving');
    let ok = false;
    try {
      ok = (await job()) !== false;
    } catch (e) {
      ok = false;
    }
    setStatus(ok ? 'saved' : 'error');
    if (ok) {
      timer.current = setTimeout(() => setStatus('idle'), 2400);
    }
    return ok;
  }, []);
  return [status, run] as const;
};

export const SaveState: FC<{ status: SaveStatus }> = ({ status }) => {
  const t = useT();
  return (
    <span
      className={clsx('tdw-save', `is-${status}`)}
      aria-live="polite"
    >
      {status === 'saving' ? (
        <Spinner size={14} label={t('tdw_saving', 'Saving')} />
      ) : status === 'saved' ? (
        <>
          <Icon name="check" size={14} />
          {t('tdw_saved', 'Saved')}
        </>
      ) : status === 'error' ? (
        <>
          <Icon name="triangle-alert" size={14} />
          {t('tdw_save_failed', "Couldn't save")}
        </>
      ) : null}
    </span>
  );
};
