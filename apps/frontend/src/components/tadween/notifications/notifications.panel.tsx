'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Button,
  cx,
  EmptyState,
  Icon,
  IconName,
  LinkButton,
  Pill,
  SegmentedControl,
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import {
  TadweenSheet,
  usePhoneLayout,
} from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';
import {
  TodayIntegration,
  useTodayActions,
  useTodayIntegrations,
} from '@gitroom/frontend/components/tadween/today/today.hooks';

// The notifications panel under the top bar's bell: a popover on desktop, a
// bottom sheet on phones. GET /notifications/list returns each notification's
// stored text plus what it is about (kind, network, the post and channel), so
// every row can say what happened in its own words and offer the next step.
// Post and channel actions reuse Today's (the calendar's edit and reconnect).
// Styles: app/tadween/notifications.scss.

type NotificationKind =
  | 'published'
  | 'failed'
  | 'unconfirmed'
  | 'refresh_needed'
  | 'channel_disabled'
  | 'other';

type NotificationItem = {
  id: string;
  createdAt: string;
  content: string;
  kind: NotificationKind;
  network?: string;
  providerIdentifier?: string;
  link?: string;
  reason?: string;
  post?: {
    id: string;
    group: string;
    preview: string;
    publishDate: string;
    state: 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT';
    image?: string;
  };
  channel?: {
    id: string;
    name: string;
    picture: string | null;
    providerIdentifier: string;
  };
};

type NotificationsList = {
  lastReadNotifications: string;
  notifications: NotificationItem[];
};

type Filter = 'all' | 'published' | 'failed' | 'channels';

const FILTERS: Record<Filter, NotificationKind[]> = {
  all: [],
  published: ['published'],
  failed: ['failed', 'unconfirmed'],
  channels: ['refresh_needed', 'channel_disabled'],
};

const TONE: Record<NotificationKind, 'ok' | 'bad' | 'warn' | 'neutral'> = {
  published: 'ok',
  failed: 'bad',
  unconfirmed: 'warn',
  refresh_needed: 'warn',
  channel_disabled: 'warn',
  other: 'neutral',
};

const KIND_ICON: Record<NotificationKind, IconName> = {
  published: 'check',
  failed: 'circle-x',
  unconfirmed: 'triangle-alert',
  refresh_needed: 'refresh-cw',
  channel_disabled: 'plug',
  other: 'bell',
};

const URLS = /(https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)])/g;

// a network name inside a translated sentence keeps its own direction
const isolate = (text: string) => `⁨${text}⁩`;

// Opening the list is what marks notifications as read on the server
// (NotificationsRepository.getNotifications), so it only loads while open.
export const useNotificationsList = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await (await fetch('/notifications/list')).json()) as NotificationsList;
  }, []);
  return useSWR('notifications', load, { revalidateOnFocus: false });
};

const useLocale = () => {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || 'en').replace('_', '-');
  return lang === 'ar' ? 'ar-EG-u-nu-latn' : lang;
};

const useTimeLabels = () => {
  const locale = useLocale();
  return useMemo(() => {
    const safe = <T,>(make: (l: string) => T) => {
      try {
        return make(locale);
      } catch (e) {
        return make('en');
      }
    };
    const relative = safe(
      (l) => new Intl.RelativeTimeFormat(l, { numeric: 'auto', style: 'narrow' })
    );
    const absolute = safe(
      (l) => new Intl.DateTimeFormat(l, { dateStyle: 'medium', timeStyle: 'short' })
    );
    const day = safe(
      (l) => new Intl.DateTimeFormat(l, { day: 'numeric', month: 'short' })
    );

    return {
      absolute: (date: dayjs.Dayjs) => absolute.format(date.toDate()),
      ago: (date: dayjs.Dayjs) => {
        const seconds = dayjs().diff(date, 'second');
        if (seconds < 60) return relative.format(0, 'second');
        if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), 'minute');
        if (seconds < 86400) return relative.format(-Math.floor(seconds / 3600), 'hour');
        // calendar days, so "yesterday" matches the Yesterday group
        const days = dayjs().startOf('day').diff(date.startOf('day'), 'day');
        if (days < 7) return relative.format(-Math.max(days, 1), 'day');
        return day.format(date.toDate());
      },
    };
  }, [locale]);
};

const useTitle = () => {
  const t = useT();
  return useCallback(
    (item: NotificationItem) => {
      const network = isolate(item.network || '');
      switch (item.kind) {
        case 'published':
          return item.network
            ? t('tdw_notif_published_on', 'Published on {{network}}', { network })
            : t('tdw_notif_published', 'Post published');
        case 'failed':
          return item.network
            ? t('tdw_notif_failed_on', 'Failed to publish on {{network}}', { network })
            : t('tdw_notif_failed', 'Post failed to publish');
        case 'unconfirmed':
          return item.network
            ? t('tdw_notif_unconfirmed_on', "Couldn't confirm your post on {{network}}", { network })
            : t('tdw_notif_unconfirmed', "Couldn't confirm your post");
        case 'refresh_needed':
          return item.network
            ? t('tdw_notif_reconnect_on', '{{network}} needs reconnecting', { network })
            : t('tdw_notif_reconnect', 'A channel needs reconnecting');
        case 'channel_disabled':
          return item.network
            ? t('tdw_notif_disabled_on', '{{network}} channel is disabled', { network })
            : t('tdw_notif_disabled', 'A channel is disabled');
        default:
          return t('tdw_notif_other', 'Notification');
      }
    },
    [t]
  );
};

// Text from the server with every URL as an "Open link" button, never the raw URL
const LinkedText: FC<{ text: string }> = ({ text }) => {
  const t = useT();
  return (
    <p className="tdw-notif-text" dir="auto">
      {text.split(URLS).map((part, i) =>
        i % 2 ? (
          <a
            key={i}
            className="tdw-notif-inline-link"
            href={part}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('tdw_notif_open_link', 'Open link')}
            <Icon name="external-link" size={12} />
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </p>
  );
};

const NotificationRow: FC<{
  item: NotificationItem;
  unread: boolean;
  index: number;
  integration?: TodayIntegration;
  onEdit: (item: NotificationItem) => void;
  onReconnect: (integration: TodayIntegration) => void;
}> = ({ item, unread, index, integration, onEdit, onReconnect }) => {
  const t = useT();
  const title = useTitle();
  const time = useTimeLabels();
  const created = dayjs(item.createdAt);
  const tone = TONE[item.kind];
  const image = item.post?.image;
  const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(image || '');
  const needsReconnect =
    !!integration && (!!integration.refreshNeeded || !!integration.inBetweenSteps);

  const detail =
    item.kind === 'refresh_needed'
      ? t('tdw_notif_reconnect_body', 'Reconnect it so scheduled posts keep publishing.')
      : item.kind === 'channel_disabled'
      ? t('tdw_notif_disabled_body', 'Enable it in your channels to publish again.')
      : item.kind === 'unconfirmed'
      ? t('tdw_notif_unconfirmed_body', 'Check the account before posting again, so it isn’t published twice.')
      : undefined;

  return (
    <li
      className={cx('tdw-notif-row', `is-${tone}`, unread && 'is-unread')}
      style={{ ['--i' as string]: Math.min(index, 8) }}
    >
      {unread ? (
        <span className="tdw-notif-unread" aria-label={t('tdw_notif_unread', 'Unread')} />
      ) : null}
      <span className="tdw-notif-who">
        {item.channel ? (
          <TadweenChannelAvatar
            size={36}
            integration={{
              name: item.channel.name,
              picture: item.channel.picture || '',
              identifier: item.channel.providerIdentifier,
            }}
          />
        ) : (
          <span className="tdw-notif-icon" aria-hidden="true">
            <Icon name={KIND_ICON[item.kind]} size={16} />
          </span>
        )}
        {item.channel ? (
          <span className="tdw-notif-status" aria-hidden="true">
            <Icon name={KIND_ICON[item.kind]} size={10} />
          </span>
        ) : null}
      </span>

      <div className="tdw-notif-main">
        <div className="tdw-notif-head">
          <b className="tdw-notif-title">{title(item)}</b>
          <time
            className="tdw-notif-time"
            dateTime={created.toISOString()}
            title={time.absolute(created)}
          >
            {time.ago(created)}
          </time>
        </div>
        {item.channel ? (
          <span className="tdw-notif-channel" dir="auto">
            {item.channel.name}
          </span>
        ) : null}

        {item.kind === 'other' ? (
          <LinkedText text={item.content} />
        ) : item.post?.preview || image ? (
          <div className="tdw-notif-post">
            {item.post?.preview ? (
              <p className="tdw-notif-text" dir="auto">
                {item.post.preview}
              </p>
            ) : (
              <span />
            )}
            {image ? (
              <span className="tdw-notif-thumb">
                {isVideo ? (
                  <video src={image} muted playsInline preload="metadata" />
                ) : (
                  <img src={image} alt="" loading="lazy" />
                )}
              </span>
            ) : null}
          </div>
        ) : null}

        {item.reason ? (
          <p className="tdw-notif-reason" dir="auto">
            {item.reason}
          </p>
        ) : detail ? (
          <p className="tdw-notif-detail">{detail}</p>
        ) : null}

        <div className="tdw-notif-acts">
          {item.kind === 'published' && item.link ? (
            <Button
              size="sm"
              variant="secondary"
              iconEnd="external-link"
              onClick={() => window.open(item.link, '_blank', 'noopener,noreferrer')}
            >
              {t('tdw_notif_view_post', 'View post')}
            </Button>
          ) : null}
          {item.post && item.kind === 'published' ? (
            <Button size="sm" variant="ghost" icon="calendar" onClick={() => onEdit(item)}>
              {t('today_open_in_calendar', 'Open in calendar')}
            </Button>
          ) : null}
          {item.post && item.kind !== 'published' ? (
            <Button size="sm" variant="secondary" icon="pencil" onClick={() => onEdit(item)}>
              {t('today_edit', 'Edit')}
            </Button>
          ) : null}
          {(item.kind === 'refresh_needed' || item.kind === 'failed') && needsReconnect ? (
            <Button
              size="sm"
              variant="primary"
              icon="refresh-cw"
              onClick={() => onReconnect(integration!)}
            >
              {t('tdw_notif_reconnect_action', 'Reconnect')}
            </Button>
          ) : null}
          {item.kind === 'refresh_needed' && integration && !needsReconnect ? (
            <Pill tone="ok" icon="circle-check">
              {t('tdw_notif_connected', 'Connected')}
            </Pill>
          ) : null}
          {item.kind === 'channel_disabled' ? (
            <LinkButton size="sm" variant="secondary" icon="settings" href="/launches">
              {t('tdw_notif_open_channels', 'Open channels')}
            </LinkButton>
          ) : null}
        </div>
      </div>
    </li>
  );
};

const RowsSkeleton: FC = () => (
  <ul className="tdw-notif-list" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <li key={i} className="tdw-notif-row is-skeleton">
        <Skeleton width={36} height={36} radius={18} />
        <div className="tdw-notif-main">
          <Skeleton width="55%" height={14} />
          <Skeleton width="30%" height={12} />
          <Skeleton width="90%" height={12} />
        </div>
      </li>
    ))}
  </ul>
);

const NotificationsBody: FC<{ onClose: () => void; phone: boolean }> = ({
  onClose,
  phone,
}) => {
  const t = useT();
  const { data, isLoading, mutate } = useNotificationsList();
  const { integrations } = useTodayIntegrations();
  const { edit, reconnect } = useTodayActions(integrations, () => mutate());
  const [filter, setFilter] = useState<Filter>('all');
  const [readAll, setReadAll] = useState(false);

  // the read marker from before this opening: newer rows are new to the user
  const lastRead = new Date(data?.lastReadNotifications || 0).getTime();
  const isUnread = useCallback(
    (item: NotificationItem) =>
      !readAll && new Date(item.createdAt).getTime() > lastRead,
    [readAll, lastRead]
  );

  const items = useMemo(
    () =>
      (data?.notifications || []).filter(
        (n) => filter === 'all' || FILTERS[filter].includes(n.kind)
      ),
    [data, filter]
  );
  const unreadCount = (data?.notifications || []).filter(isUnread).length;

  const groups = useMemo(() => {
    const today = dayjs().startOf('day');
    const yesterday = today.subtract(1, 'day');
    const list = [
      { key: 'today', label: t('today', 'Today'), items: [] as NotificationItem[] },
      { key: 'yesterday', label: t('tdw_notif_yesterday', 'Yesterday'), items: [] as NotificationItem[] },
      { key: 'earlier', label: t('tdw_notif_earlier', 'Earlier'), items: [] as NotificationItem[] },
    ];
    for (const item of items) {
      const at = dayjs(item.createdAt);
      list[at.isAfter(today) ? 0 : at.isAfter(yesterday) ? 1 : 2].items.push(item);
    }
    return list.filter((g) => g.items.length);
  }, [items, t]);

  const byId = useMemo(
    () => new Map(integrations.map((i) => [i.id, i])),
    [integrations]
  );

  const onEdit = useCallback(
    (item: NotificationItem) => {
      if (!item.post || !item.channel) return;
      onClose();
      edit({
        id: item.post.id,
        group: item.post.group,
        content: item.post.preview,
        publishDate: item.post.publishDate,
        state: item.post.state,
        integration: { ...item.channel, picture: item.channel.picture || '' },
      })();
    },
    [edit, onClose]
  );

  const onReconnect = useCallback(
    (integration: TodayIntegration) => {
      onClose();
      reconnect(integration)();
    },
    [reconnect, onClose]
  );

  const markAll = unreadCount > 0 && (
    <button
      type="button"
      className="tdw-notif-markall"
      onClick={() => setReadAll(true)}
    >
      {t('tdw_notif_mark_all_read', 'Mark all as read')}
    </button>
  );

  let row = 0;
  return (
    <TadweenScope className="tdw-notif-scope">
      {!phone ? (
        <div className="tdw-notif-header">
          <h2>{t('notifications', 'Notifications')}</h2>
          {markAll}
        </div>
      ) : null}
      <div className="tdw-notif-toolbar">
        <SegmentedControl<Filter>
          size="sm"
          label={t('tdw_notif_filter', 'Filter notifications')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('tdw_notif_all', 'All') },
            { value: 'published', label: t('tdw_notif_filter_published', 'Published') },
            { value: 'failed', label: t('tdw_notif_filter_failed', 'Failed') },
            { value: 'channels', label: t('tdw_notif_filter_channels', 'Channels') },
          ]}
        />
        {phone ? markAll : null}
      </div>
      <div className="tdw-notif-scroll">
        {isLoading && !data ? (
          <RowsSkeleton />
        ) : !data?.notifications?.length ? (
          <EmptyState
            size="sm"
            icon="bell"
            title={t('no_notifications', 'No notifications')}
            body={t(
              'tdw_no_notifications_body',
              'Publishing results, failures and team activity will show up here.'
            )}
          />
        ) : !items.length ? (
          <EmptyState
            size="sm"
            icon="bell"
            title={t('tdw_notif_empty_filter', 'Nothing here')}
            body={t('tdw_notif_empty_filter_body', 'No recent notifications match this filter.')}
          />
        ) : (
          groups.map((group) => (
            <section key={group.key} className="tdw-notif-group" aria-label={group.label}>
              <h3 className="tdw-notif-group-label">{group.label}</h3>
              <ul className="tdw-notif-list">
                {group.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    index={row++}
                    unread={isUnread(item)}
                    integration={item.channel ? byId.get(item.channel.id) : undefined}
                    onEdit={onEdit}
                    onReconnect={onReconnect}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </TadweenScope>
  );
};

export const TadweenNotifications: FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const t = useT();
  const phone = usePhoneLayout();

  // the sheet is portalled to <body>: keep its taps from reaching the bell's
  // click-away listener on document, which would close it on the first touch
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  if (phone) {
    return (
      <div onMouseDown={stop} onTouchStart={stop} className="contents">
        <TadweenSheet
          open={open}
          onClose={onClose}
          detent="large"
          title={t('notifications', 'Notifications')}
          className="tdw-notif-sheet"
        >
          <NotificationsBody onClose={onClose} phone />
        </TadweenSheet>
      </div>
    );
  }

  if (!open) {
    return null;
  }

  return (
    <div className="tdw-notif-popover" role="dialog" aria-label={t('notifications', 'Notifications')}>
      <NotificationsBody onClose={onClose} phone={false} />
    </div>
  );
};
