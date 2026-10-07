'use client';

import { FC, ReactNode, useMemo } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  SettingsIcon,
  SettingsIconName,
} from '@gitroom/frontend/components/tadween/settings/settings.icons';

// Tadween settings shell: the grouped side nav, the page header and the inset
// grouped section used by the settings pages. Styles: app/tadween/settings.scss.
export type SettingsGroup = 'account' | 'workspace' | 'automation' | 'developers';

export interface SettingsNavItem {
  tab: string;
  group: SettingsGroup;
  icon: SettingsIconName;
  label: string;
  description: string;
}

const groupOrder: SettingsGroup[] = [
  'account',
  'workspace',
  'automation',
  'developers',
];

export const SettingsNav: FC<{
  items: SettingsNavItem[];
  current: string;
  onChange: (tab: string) => void;
  footer?: ReactNode;
}> = ({ items, current, onChange, footer }) => {
  const t = useT();
  const groupLabels: Record<SettingsGroup, string> = {
    account: t('tdw_set_group_account', 'Account'),
    workspace: t('tdw_set_group_workspace', 'Workspace'),
    automation: t('tdw_set_group_automation', 'Automation'),
    developers: t('tdw_set_group_developers', 'Developers'),
  };
  const groups = useMemo(
    () =>
      groupOrder
        .map((group) => ({
          group,
          items: items.filter((item) => item.group === group),
        }))
        .filter((g) => g.items.length),
    [items]
  );

  return (
    <nav
      className="tdw-settings-nav"
      aria-label={t('tdw_set_nav', 'Settings')}
    >
      <div className="tdw-settings-groups">
        {groups.map(({ group, items: groupItems }) => (
          <div key={group} className="tdw-settings-group">
            <div className="tdw-settings-glabel">{groupLabels[group]}</div>
            {groupItems.map((item) => (
              <button
                key={item.tab}
                type="button"
                className={clsx(
                  'tdw-settings-item',
                  item.tab === current && 'is-active'
                )}
                aria-current={item.tab === current ? 'page' : undefined}
                onClick={() => onChange(item.tab)}
              >
                <span className="tdw-settings-ico">
                  <SettingsIcon name={item.icon} size={15} />
                </span>
                <span className="tdw-settings-label">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {footer ? <div className="tdw-settings-foot">{footer}</div> : null}
    </nav>
  );
};

export const SettingsPageHeader: FC<{
  title: string;
  description?: string;
}> = ({ title, description }) => (
  <header className="tdw-settings-head">
    <h2>{title}</h2>
    {description ? <p className="tdw-set-desc">{description}</p> : null}
  </header>
);

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
