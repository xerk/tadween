'use client';

// /launches?display=list: the calendar's posts as a board. Same data as the
// week/month views (one GET /posts for the shown range), same actions as the
// calendar chips (usePostActions). Columns follow Post.state: Drafts (DRAFT),
// Scheduled (QUEUE), Published (PUBLISHED), Failed (ERROR); or one column per
// channel or per day. Posts of one group (a multi-channel post) in the same
// state share a card.
//
// Drag and drop only does what the calendar already does: a failed post
// dropped on Scheduled is rescheduled with PUT /posts/:id/date
// (action: 'schedule'), the request a calendar drop sends. Every other move
// has no endpoint (a draft can't be promoted by changing its date) and is
// refused with a hint.
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import useCookie from 'react-use-cookie';
import { uniqBy } from 'lodash';
import { useMediaQuery } from '@mantine/hooks';
import { Integration, Post, Tags } from '@prisma/client';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useCalendarNavigation } from '@gitroom/frontend/components/launches/filters';
import { useChannelSelection } from '@gitroom/frontend/components/launches/select.channels';
import {
  canOpenPost,
  canShowStatistics,
  usePostActions,
} from '@gitroom/frontend/components/launches/calendar';
import { NewPost } from '@gitroom/frontend/components/launches/new.post';
import { CreationMethodBadge } from '@gitroom/frontend/components/launches/creation.method.badge';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { areYouSure } from '@gitroom/frontend/components/layout/new-modal';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { TadweenEmptyState } from '@gitroom/frontend/components/tadween/empty.state';
import { Icon } from '@gitroom/frontend/components/tadween/ui';
import { ChipAction } from '@gitroom/frontend/components/tadween/workspace/chip.more.menu';
import { Board, BoardItem, BoardLane, BoardTone } from '@gitroom/frontend/components/tadween/board/board';
import { BoardCard } from '@gitroom/frontend/components/tadween/board/board.card';
import { BoardFilter, BoardToolbar } from '@gitroom/frontend/components/tadween/board/board.toolbar';

type BoardPost = Post & {
  integration: Integration;
  tags: { tag: Tags }[];
  actualDate?: string;
};

type GroupBy = 'state' | 'channel' | 'day';

interface PostCard extends BoardItem {
  tone: BoardTone;
  posts: BoardPost[];
  date: dayjs.Dayjs;
  text: string;
}

const STATE_TONE: Record<string, BoardTone> = {
  DRAFT: 'draft',
  QUEUE: 'scheduled',
  PUBLISHED: 'published',
  ERROR: 'failed',
};

const STATE_LANES: BoardTone[] = ['draft', 'scheduled', 'published', 'failed'];

// Upcoming work reads soonest first; what already happened, newest first
const byDate = (tone: BoardTone) => (a: PostCard, b: PostCard) =>
  tone === 'published' || tone === 'failed'
    ? b.date.valueOf() - a.date.valueOf()
    : a.date.valueOf() - b.date.valueOf();

export const PostsBoard: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const user = useUser();
  const { disableXAnalytics } = useVariables();
  const { posts, loading, integrations, customer, startDate, endDate, reloadCalendarView } = useCalendar();
  const nav = useCalendarNavigation();
  const { channels, selectedIds, allSelected, setSelectedChannels } = useChannelSelection();
  const { editPost, deletePost, copyDebugJson, openStatistics, openMissingRelease, openPost } = usePostActions();
  const isPhone = useMediaQuery('(max-width: 768px)');

  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [groupBy, setGroupBy] = useCookie('tdw-board-group', 'state');
  const [density, setDensity] = useCookie('tdw-board-density', 'comfortable');
  const [collapsedRaw, setCollapsed] = useCookie('tdw-board-collapsed', '');
  const collapsed = useMemo(() => collapsedRaw.split(',').filter(Boolean), [collapsedRaw]);
  // Cards moved by a drop, shown in their new column until the reload lands
  // (the reload changes a post's state, and with it this signature)
  const [moved, setMoved] = useState<Record<string, BoardTone>>({});
  const signature = useMemo(
    () => posts.map((p) => `${p.id}:${p.state}:${p.publishDate}`).join(),
    [posts]
  );
  useEffect(() => setMoved((m) => (Object.keys(m).length ? {} : m)), [signature]);

  const group = (['state', 'channel', 'day'].includes(groupBy) ? groupBy : 'state') as GroupBy;
  const customerOf = useCallback(
    (integrationId: string) => integrations.find((i) => i.id === integrationId)?.customer?.name,
    [integrations]
  );
  const timeFormat = isUSCitizen() ? 'h:mm A' : 'HH:mm';

  // Client-side filters: search text and tag. GET /posts also returns every
  // occurrence of a recurring post since it started; keep the shown period.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = newDayjs(startDate).startOf('day');
    const to = newDayjs(endDate).endOf('day');
    return (posts as BoardPost[]).filter((post) => {
      const at = dayjs.utc(post.publishDate).local();
      if (at.isBefore(from) || at.isAfter(to)) return false;
      if (tag && !post.tags.some((p) => p.tag.name === tag)) return false;
      if (!q) return true;
      return [
        stripHtmlValidation('none', post.content, false, true, false),
        post.integration?.name,
        customerOf(post.integration?.id),
        ...post.tags.map((p) => p.tag.name),
      ]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }, [posts, search, tag, customerOf, startDate, endDate]);

  // One card per group and state (per post when grouped by channel). Recurring
  // posts come back once per occurrence, so their date is part of the key.
  const cards = useMemo(() => {
    const map = new Map<string, BoardPost[]>();
    visible.forEach((post) => {
      const key = [
        group === 'channel' ? post.id : post.group,
        post.state,
        post.intervalInDays ? String(post.publishDate) : '',
      ].join('~');
      map.set(key, [...(map.get(key) || []), post]);
    });
    return Array.from(map.values()).map((list): PostCard => {
      const first = list[0];
      const ids = list.map((p) => p.id).sort();
      return {
        id: ids[0] + (first.intervalInDays ? `~${dayjs.utc(first.publishDate).valueOf()}` : ''),
        tone: STATE_TONE[first.state] || 'scheduled',
        posts: list,
        date: dayjs.utc(first.publishDate).local(),
        text: stripHtmlValidation('none', first.content, false, true, false),
        draggable: group === 'state' && !first.intervalInDays,
      };
    });
  }, [visible, group]);

  const laneOf = useCallback((card: PostCard) => moved[card.id] || card.tone, [moved]);

  const emptyLane = (text: string) => <div className="tdw-board-empty">{text}</div>;

  const lanes = useMemo((): BoardLane<PostCard>[] => {
    if (group === 'channel') {
      return channels
        .filter((c) => selectedIds.includes(c.id))
        .map((channel) => ({
          id: channel.id,
          title: channel.name,
          icon: (
            <span className="tdw-board-lane-avatar">
              <img src={channel.picture || '/no-picture.jpg'} alt="" />
              <img src={`/icons/platforms/${channel.identifier}.png`} alt="" />
            </span>
          ),
          items: cards
            .filter((card) => card.posts[0].integration.id === channel.id)
            .sort((a, b) => a.date.valueOf() - b.date.valueOf()),
          empty: emptyLane(t('tdw_board_empty_channel', 'Nothing for this channel')),
        }));
    }
    if (group === 'day') {
      const start = newDayjs(startDate);
      const days = newDayjs(endDate).diff(start, 'day') + 1;
      const today = newDayjs().format('YYYY-MM-DD');
      return Array.from({ length: days }, (_, i) => start.add(i, 'day')).map((day) => {
        const key = day.format('YYYY-MM-DD');
        return {
          id: key,
          title: day.format(isPhone ? 'ddd D' : 'dddd D MMM'),
          tone: key === today ? 'scheduled' : 'neutral',
          items: cards
            .filter((card) => card.date.format('YYYY-MM-DD') === key)
            .sort((a, b) => a.date.valueOf() - b.date.valueOf()),
          empty: emptyLane(t('tdw_board_empty_day', 'No posts this day')),
        };
      });
    }
    const titles: Record<BoardTone, string> = {
      draft: t('tdw_board_drafts', 'Drafts'),
      scheduled: t('tdw_board_scheduled', 'Scheduled'),
      published: t('tdw_board_published', 'Published'),
      failed: t('tdw_board_failed', 'Failed'),
      neutral: '',
    };
    const empties: Record<BoardTone, string> = {
      draft: t('tdw_board_empty_drafts', 'No drafts'),
      scheduled: t('tdw_board_empty_scheduled', 'Nothing scheduled'),
      published: t('tdw_board_empty_published', 'Nothing published yet'),
      failed: t('tdw_board_empty_failed', 'Nothing failed. Nice.'),
      neutral: '',
    };
    return STATE_LANES.map((tone) => ({
      id: tone,
      title: titles[tone],
      tone,
      items: cards.filter((card) => laneOf(card) === tone).sort(byDate(tone)),
      empty: emptyLane(empties[tone]),
    }));
  }, [group, cards, channels, selectedIds, startDate, endDate, laneOf, isPhone, t]);

  // ── Drag and drop ────────────────────────────────────────────────────────
  const cardById = useCallback((id: string) => cards.find((c) => c.id === id), [cards]);
  const canDrop = useCallback(
    (id: string, from: string, to: string) => from === 'failed' && to === 'scheduled' && !!cardById(id),
    [cardById]
  );
  const deniedHint = useCallback(
    (id: string, from: string, to: string) => {
      if (to === 'draft') return t('tdw_board_hint_to_draft', 'Edit the post to save it as a draft');
      if (to === 'published') return t('tdw_board_hint_to_published', 'Posts are published at their time');
      if (to === 'failed') return t('tdw_board_hint_to_failed', 'Only posts that failed land here');
      if (from === 'draft') return t('tdw_board_hint_draft', 'Open the draft and add it to the calendar to schedule it');
      if (from === 'published') return t('tdw_board_hint_published', 'Duplicate the post to publish it again');
      return undefined;
    },
    [t]
  );

  // Failed → Scheduled: the calendar's own reschedule request, at the post's
  // time if it's still ahead, otherwise at the channel's next free slot
  const reschedule = useCallback(
    async (id: string) => {
      const card = cardById(id);
      if (!card) return;
      const first = card.posts[0];
      let date = card.date;
      if (!date.isAfter(dayjs())) {
        try {
          const slot = (await (await fetch(`/posts/find-slot/${first.integration.id}`)).json()).date;
          date = dayjs.utc(slot).local();
        } catch (e) {
          toaster.show(t('tdw_board_reschedule_failed', "Couldn't reschedule the post"), 'warning');
          return;
        }
      }
      const when = date.format(isUSCitizen() ? 'llll' : 'ddd, D MMM YYYY HH:mm');
      const ok = await areYouSure({
        title: t('tdw_board_reschedule_title', 'Reschedule this post?'),
        description: t('tdw_board_reschedule_body', 'It will be published again on {{date}}.', { date: when }),
        approveLabel: t('tdw_board_reschedule', 'Reschedule'),
        cancelLabel: t('cancel', 'Cancel'),
      });
      if (!ok) return;
      setMoved((m) => ({ ...m, [id]: 'scheduled' }));
      const results = await Promise.all(
        card.posts.map((post) =>
          fetch(`/posts/${post.id}/date`, {
            method: 'PUT',
            body: JSON.stringify({ date: date.utc().format('YYYY-MM-DDTHH:mm:ss'), action: 'schedule' }),
          }).catch(() => null)
        )
      );
      if (results.some((r) => !r?.ok)) {
        setMoved(({ [id]: _, ...rest }) => rest);
        toaster.show(t('tdw_board_reschedule_failed', "Couldn't reschedule the post"), 'warning');
      } else {
        toaster.show(t('tdw_board_rescheduled', 'Rescheduled for {{date}}', { date: when }), 'success');
      }
      reloadCalendarView();
    },
    [cardById, fetch, toaster, reloadCalendarView, t]
  );

  const onDrop = useCallback(
    (id: string, from: string, to: string) => {
      if (from === 'failed' && to === 'scheduled') reschedule(id);
    },
    [reschedule]
  );

  // ── Cards ────────────────────────────────────────────────────────────────
  const renderCard = (card: PostCard) => {
    const first = card.posts[0];
    const tone = laneOf(card);
    const perPost = card.posts.length > 1;
    const name = (post: BoardPost) => (perPost ? ` · ${post.integration.name}` : '');
    const statsActions = card.posts.flatMap((post): ChipAction[] => {
      const list: ChipAction[] = [];
      if (canOpenPost(post)) {
        list.push({ key: `open-${post.id}`, icon: <Icon name="external-link" size={15} />, label: t('open_post', 'Open Post') + name(post), onClick: openPost(post) });
      }
      if (canShowStatistics(post, disableXAnalytics)) {
        list.push({
          key: `stats-${post.id}`,
          icon: <Icon name="chart-column" size={15} />,
          label: t('post_statistics', 'Post Statistics') + name(post),
          onClick: post.releaseId === 'missing' ? openMissingRelease(post.id) : openStatistics(post.id),
        });
      }
      return list;
    });
    const edit: ChipAction = { key: 'edit', icon: <Icon name="pencil" size={15} />, label: t('edit', 'Edit'), onClick: editPost(first, false) };
    const preview: ChipAction = {
      key: 'preview',
      icon: <Icon name="eye" size={15} />,
      label: t('preview_post', 'Preview Post'),
      onClick: () => window.open(`/p/${first.id}?share=true`, '_blank'),
    };
    const duplicate: ChipAction = { key: 'duplicate', icon: <Icon name="copy" size={15} />, label: t('duplicate_post', 'Duplicate Post'), onClick: editPost(first, true) };
    const remove: ChipAction = { key: 'delete', icon: <Icon name="trash-2" size={15} />, label: t('delete_post', 'Delete Post'), onClick: deletePost(first), danger: true };
    const debug: ChipAction[] = user?.isSuperAdmin
      ? [{ key: 'debug', icon: <Icon name="file-text" size={15} />, label: t('copy_debug_json', 'Copy Debug JSON'), onClick: copyDebugJson(first) }]
      : [];
    const showBadge = user?.impersonate && first.creationMethod && first.creationMethod !== 'UNKNOWN';
    const tags = uniqBy(
      card.posts.flatMap((p) => p.tags.map(({ tag: x }) => ({ name: x.name, color: x.color }))),
      'name'
    );
    return (
      <BoardCard
        tone={tone}
        density={density === 'compact' ? 'compact' : 'comfortable'}
        channels={card.posts.map((p) => ({
          id: p.id,
          name: p.integration.name,
          picture: p.integration.picture,
          identifier: p.integration.providerIdentifier,
        }))}
        text={card.text}
        when={card.date.format(group === 'day' ? timeFormat : `ddd D MMM · ${timeFormat}`)}
        whenTitle={card.date.format('LLLL')}
        tags={tags}
        customer={customerOf(first.integration.id)}
        error={tone === 'failed' ? card.posts.map((p) => p.error).find(Boolean) || undefined : undefined}
        badge={showBadge ? <CreationMethodBadge creationMethod={first.creationMethod} ringColor="var(--tdw-card)" /> : undefined}
        quickActions={[edit, preview, duplicate, remove]}
        actions={[edit, preview, duplicate, ...statsActions, ...debug, remove]}
        onOpen={edit.onClick}
        openLabel={`${t('edit', 'Edit')}: ${card.text.slice(0, 80) || t('no_content', 'no content')}`}
      />
    );
  };

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const tagOptions = useMemo(
    () => uniqBy((posts as BoardPost[]).flatMap((p) => p.tags.map((x) => x.tag)), 'name'),
    [posts]
  );
  const customers = useMemo(
    () => uniqBy(integrations.filter((i) => i.customer?.id), (i) => i.customer!.id).map((i) => i.customer!),
    [integrations]
  );
  const channelValue = allSelected ? '' : selectedIds.length === 1 ? selectedIds[0] : 'some';
  const filters: BoardFilter[] = [
    {
      key: 'channel',
      label: t('tdw_board_filter_channel', 'Channel'),
      icon: 'globe',
      value: channelValue,
      options: [
        { value: '', label: t('tdw_board_all_channels', 'All channels') },
        ...(channelValue === 'some'
          ? [{ value: 'some', label: t('tdw_ws_n_of_m', '{{shown}} of {{total}}', { shown: selectedIds.length, total: channels.length }), disabled: true }]
          : []),
        ...channels.map((c) => ({ value: c.id, label: c.name })),
      ],
      onChange: (v) => setSelectedChannels(v ? [v] : null),
    },
    ...(tagOptions.length
      ? [
          {
            key: 'tag',
            label: t('tags', 'Tags'),
            icon: 'tag',
            value: tag,
            options: [
              { value: '', label: t('tdw_board_all_tags', 'All tags') },
              ...tagOptions.map((x) => ({ value: x.name, label: x.name })),
            ],
            onChange: setTag,
          },
        ]
      : []),
    ...(customers.length > 1
      ? [
          {
            key: 'customer',
            label: t('customers', 'Customers'),
            icon: 'users',
            value: customer || '',
            options: [
              { value: '', label: t('tdw_board_all_customers', 'All customers') },
              ...customers.map((c) => ({ value: c.id!, label: c.name! })),
            ],
            onChange: (v: string) => nav.setCustomer(v),
          },
        ]
      : []),
  ];
  const filtered = !!search || !!tag || !allSelected;
  const total = cards.length;

  const groupByOptions = [
    { value: 'state', label: t('tdw_board_by_state', 'Status') },
    { value: 'channel', label: t('tdw_board_by_channel', 'Channel') },
    { value: 'day', label: t('tdw_board_by_day', 'Day') },
  ];

  const toggleCollapse = (id: string) =>
    setCollapsed((collapsed.includes(id) ? collapsed.filter((c) => c !== id) : [...collapsed, id]).join(','));

  return (
    <div className="tdw-ui tdw-board-root">
      <BoardToolbar
        search={search}
        onSearch={setSearch}
        filters={filters}
        groupBy={group}
        groupByOptions={groupByOptions}
        onGroupBy={setGroupBy}
        period={nav.listPeriod}
        onPeriod={nav.setListPeriod}
        onPrevious={isPhone ? nav.previous : undefined}
        onNext={isPhone ? nav.next : undefined}
        density={density === 'compact' ? 'compact' : 'comfortable'}
        onDensity={setDensity}
        summary={loading ? undefined : t('tdw_board_count', '{{count}} posts', { count: total })}
        onClear={
          filtered
            ? () => {
                setSearch('');
                setTag('');
                setSelectedChannels(null);
              }
            : undefined
        }
      />
      {!loading && !posts.length ? (
        <div className="tdw-board-blank">
          <TadweenEmptyState
            icon="calendar"
            title={t('tdw_board_empty_title', 'No posts in this period')}
            body={t('tdw_board_empty_body', 'Create a post, or move to another week or month.')}
            action={
              integrations.length ? (
                <span className="tdw-ws-new">
                  <NewPost />
                </span>
              ) : undefined
            }
          />
        </div>
      ) : (
        <Board<PostCard>
          label={t('tdw_ws_board', 'Board')}
          lanes={lanes}
          renderCard={renderCard}
          loading={loading}
          isPhone={isPhone}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          canDrop={canDrop}
          onDrop={onDrop}
          deniedHint={deniedHint}
        />
      )}
    </div>
  );
};
