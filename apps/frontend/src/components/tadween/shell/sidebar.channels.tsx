'use client';

import {
  FC,
  MouseEvent,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useSWRConfig } from 'swr';
import clsx from 'clsx';
import { uniqBy } from 'lodash';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { CalendarContext } from '@gitroom/frontend/components/launches/calendar.context';
import { Menu } from '@gitroom/frontend/components/launches/menu/menu';
import { useAddProvider } from '@gitroom/frontend/components/launches/add.provider.component';
import {
  TodayIntegration,
  useTodayActions,
  useTodayIntegrations,
} from '@gitroom/frontend/components/tadween/today/today.hooks';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import {
  Icon,
  Select,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

// Sidebar: "Create post" and the channel list (design system Sidebar). Both run
// on what the calendar already uses: the shared /integrations/list SWR entry,
// Today's create / reconnect (the calendar's NewPost and refreshChannel), the
// add-channel modal and Postiz's own channel menu (launches/menu/menu.tsx).
// That menu reads the channels from the calendar context, so the list gives it
// one with this list's channels. Styles: app/tadween/shell.scss.

// After a change here, refresh the channel list and whatever page shows posts
const useSidebarReload = () => {
  const { mutate } = useSWRConfig();
  return useCallback(() => {
    mutate(
      (key) =>
        typeof key === 'string' &&
        (key === '/integrations/list' ||
          key.startsWith('/posts-') ||
          key.startsWith('tdw-ws-month-') ||
          key.startsWith('today-'))
    );
  }, [mutate]);
};

const needsReconnect = (i: TodayIntegration) =>
  !!i.refreshNeeded || !!i.inBetweenSteps;

// Create post: the composer, or with nothing to post to yet, connect a
// channel first. The sidebar's button and the phone dock's centre button.
export const useCreatePost = () => {
  const reload = useSidebarReload();
  const { integrations, isLoading } = useTodayIntegrations();
  const { create } = useTodayActions(integrations, reload);
  const addChannel = useAddProvider(reload);
  const start = useCallback(() => {
    if (integrations.length) {
      create();
    } else {
      addChannel();
    }
  }, [integrations.length, create, addChannel]);
  return { start, isLoading };
};

export const SidebarCreatePost: FC = () => {
  const t = useT();
  const { start, isLoading } = useCreatePost();
  const label = t('today_create_post', 'Create post');

  return (
    <button
      type="button"
      className="tdw-side-create"
      disabled={isLoading}
      aria-label={label}
      data-tooltip-id="tdw-rail"
      data-tooltip-content={label}
      onClick={start}
    >
      <Icon name="plus" size={18} />
      <span className="tdw-side-label">{label}</span>
    </button>
  );
};

const ChannelRow: FC<{
  integration: TodayIntegration;
  collapsed: boolean;
  totalActive: number;
  onReconnect: (integration: TodayIntegration) => () => void;
  reload: () => void;
}> = ({ integration, collapsed, totalActive, onReconnect, reload }) => {
  const t = useT();
  const user = useUser();
  const fix = needsReconnect(integration);
  const tip = `${integration.name}${
    fix
      ? ` · ${t('tdw_notif_reconnect_action', 'Reconnect')}`
      : integration.disabled
      ? ` · ${t('tdw_channel_disabled', 'Disabled')}`
      : ''
  }`;

  return (
    <div
      className={clsx(
        'tdw-side-channel',
        integration.disabled && 'is-disabled'
      )}
      data-tooltip-id="tdw-rail"
      data-tooltip-content={tip}
      // the rail has no Reconnect button: the avatar reconnects, like the
      // calendar's channel list
      {...(fix && collapsed
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              onReconnect(integration)();
            },
          }
        : {})}
    >
      <TadweenChannelAvatar integration={integration} size={28} />
      <span className="tdw-side-chname tdw-side-label" dir="auto">
        {integration.name}
      </span>
      {fix ? (
        <button
          type="button"
          className="tdw-side-fix tdw-side-label"
          onClick={(e) => {
            e.stopPropagation();
            onReconnect(integration)();
          }}
        >
          {t('tdw_notif_reconnect_action', 'Reconnect')}
        </button>
      ) : null}
      <span
        className="tdw-side-chmenu tdw-side-label"
        onClick={(e) => e.stopPropagation()}
      >
        <Menu
          canChangeProfilePicture={integration.changeProfilePicture}
          canChangeNickName={integration.changeNickName}
          refreshChannel={() => onReconnect(integration)}
          mutate={reload}
          onChange={reload}
          id={integration.id}
          canEnable={
            (user?.totalChannels || 0) > totalActive && !!integration.disabled
          }
          canDisable={!integration.disabled}
        />
      </span>
    </div>
  );
};

export const SidebarChannels: FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const t = useT();
  const reload = useSidebarReload();
  const calendar = useContext(CalendarContext);
  const { integrations } = useTodayIntegrations();
  const { reconnect } = useTodayActions(integrations, reload);
  const addChannel = useAddProvider(reload);
  const [open, setOpen] = useState(true);
  const [customer, setCustomer] = useState('all');

  const customers = useMemo(
    () =>
      uniqBy(
        integrations.filter((i) => i.customer?.id),
        (i) => i.customer!.id
      ).map((i) => ({ value: i.customer!.id!, label: i.customer!.name || '' })),
    [integrations]
  );
  // the rail has no filter, so it lists every channel
  const shown = integrations.filter(
    (i) => collapsed || customer === 'all' || i.customer?.id === customer
  );
  const needs = integrations.filter(needsReconnect).length;
  const totalActive = integrations.filter((i) => !i.disabled).length;
  const addLabel = t('add_channel', 'Add Channel');

  // Postiz's channel menu finds its channel in the calendar context
  const context = useMemo(
    () => ({ ...calendar, integrations, reloadCalendarView: reload }),
    [calendar, integrations, reload]
  );

  return (
    <CalendarContext.Provider value={context}>
      <div className="tdw-side-section">
        <span className="tdw-side-rule" aria-hidden="true" />
        <div className="tdw-side-heading tdw-side-label">
          <button
            type="button"
            className="tdw-side-heading-btn"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            <Icon name="chevron-down" size={14} className="tdw-side-chev" />
            {t('channels', 'Channels')}
            <span className="tdw-side-count">{integrations.length}</span>
          </button>
          {needs ? (
            <span
              className="tdw-side-needs"
              title={t('tdw_side_needs', '{{count}} need reconnecting', {
                count: needs,
              })}
            >
              <Icon name="refresh-cw" size={11} />
              {needs}
            </span>
          ) : null}
          <button
            type="button"
            className="tdw-side-add"
            aria-label={addLabel}
            title={addLabel}
            onClick={(e) => {
              e.stopPropagation();
              addChannel();
            }}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
        {open || collapsed ? (
          <div className="tdw-side-chbody">
            {customers.length ? (
              <TadweenScope className="tdw-side-customer tdw-side-label">
                {/* clicks on the filter stay inside the list */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    size="sm"
                    icon="building-2"
                    aria-label={t('customers', 'Customers')}
                    value={customer}
                    onChange={setCustomer}
                    options={[
                      {
                        value: 'all',
                        label: t('tdw_all_customers', 'All customers'),
                      },
                      ...customers,
                    ]}
                  />
                </div>
              </TadweenScope>
            ) : null}
            <div className="tdw-side-channels">
              {shown.map((integration) => (
                <ChannelRow
                  key={integration.id}
                  integration={integration}
                  collapsed={collapsed}
                  totalActive={totalActive}
                  onReconnect={reconnect}
                  reload={reload}
                />
              ))}
              <button
                type="button"
                className="tdw-side-addrail"
                aria-label={addLabel}
                data-tooltip-id="tdw-rail"
                data-tooltip-content={addLabel}
                onClick={(e) => {
                  e.stopPropagation();
                  addChannel();
                }}
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </CalendarContext.Provider>
  );
};
