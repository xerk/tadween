'use client';

// The workspace side panel: Up next, a mini month and Drafts. Everything here
// reads Postiz's existing endpoints (/posts/list, /posts) and opens posts with
// the calendar's own edit flow (usePostActions). Drafts are react-dnd 'post'
// items, so dropping one on a calendar slot runs the calendar's own drop
// (PUT /posts/:id/date) — the post keeps its DRAFT state, as it does today.
import React, { FC, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useDrag } from 'react-dnd';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { expandPosts, expandPostsList } from '@gitroom/helpers/utils/posts.list.minify';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { usePostActions } from '@gitroom/frontend/components/launches/calendar';
import { useCalendarNavigation } from '@gitroom/frontend/components/launches/filters';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import { Icon, IconButton } from '@gitroom/frontend/components/tadween/ui';
import { ChannelAvatar } from '@gitroom/frontend/components/tadween/workspace/channel.strip';

const listQuery = (state: 'scheduled' | 'draft', limit: number, customer: string | null, channels: string[] | null) =>
  new URLSearchParams({
    page: '0',
    limit: String(limit),
    state,
    customer: customer || '',
    ...(channels ? { integrations: channels.join(',') } : {}),
  }).toString();

export const useUpNextPosts = () => {
  const fetch = useFetch();
  const { customer, selectedChannels } = useCalendar();
  const query = listQuery('scheduled', 3, customer, selectedChannels);
  return useSWR(`tdw-ws-up-next-${query}`, async () =>
    expandPostsList(await (await fetch(`/posts/list?${query}`)).json())
  );
};

export const useDraftPosts = () => {
  const fetch = useFetch();
  const { customer, selectedChannels } = useCalendar();
  const query = listQuery('draft', 20, customer, selectedChannels);
  return useSWR(`tdw-ws-drafts-${query}`, async () =>
    expandPostsList(await (await fetch(`/posts/list?${query}`)).json())
  );
};

// Changes whenever the calendar reloads its posts (after edits, drops, deletes)
export const useCalendarPostsSignature = () => {
  const { posts } = useCalendar();
  return useMemo(
    () => posts.map((p) => `${p.id}${p.publishDate}${p.state}`).join(),
    [posts]
  );
};

// Days of one month that have posts (in the channels shown), for the dots in
// the mini month and the phone day strip
export const useMonthPostDays = (month: string) => {
  const { selectedChannels } = useCalendar();
  const { data, mutate } = useMonthPosts(month);
  const signature = useCalendarPostsSignature();
  useEffect(() => {
    mutate();
  }, [signature]);
  return useMemo(() => {
    const days = new Set<string>();
    (data?.posts || [])
      .filter((post: any) => !selectedChannels || selectedChannels.includes(post.integration?.id))
      .forEach((post: any) => days.add(newDayjs(post.publishDate).local().format('YYYY-MM-DD')));
    return days;
  }, [data, selectedChannels]);
};

export const useMonthPosts = (month: string) => {
  const fetch = useFetch();
  const { customer } = useCalendar();
  return useSWR(`tdw-ws-month-${month}-${customer || ''}`, async () => {
    const start = newDayjs(month).startOf('month');
    const params = new URLSearchParams({
      display: 'month',
      customer: customer || '',
      startDate: start.startOf('isoWeek').utc().format(),
      endDate: start.endOf('month').endOf('isoWeek').utc().format(),
    }).toString();
    return expandPosts(await (await fetch(`/posts?${params}`)).json());
  });
};

const timeFormat = () => (isUSCitizen() ? 'hh:mm A' : 'HH:mm');
const postTitle = (post: any, fallback: string) =>
  stripHtmlValidation('none', post.content, false, true, false) || fallback;

const UpNext: FC<{ posts: any[]; loading: boolean; onClose: () => void }> = ({ posts, loading, onClose }) => {
  const t = useT();
  const { editPost } = usePostActions();
  const today = newDayjs().format('YYYY-MM-DD');
  const tomorrow = newDayjs().add(1, 'day').format('YYYY-MM-DD');

  return (
    <section aria-labelledby="tdw-ws-next">
      <div className="tdw-ws-mini-h">
        <h3 id="tdw-ws-next" className="tdw-ws-label">
          {t('tdw_ws_up_next', 'Up next')}
        </h3>
        <IconButton
          icon="panel-right"
          size="sm"
          className="tdw-ws-flip"
          label={t('tdw_ws_hide_panel', 'Hide side panel')}
          onClick={onClose}
        />
      </div>
      {loading ? (
        <div className="tdw-ws-next">
          {[0, 1].map((i) => (
            <span key={i} className="tdw-skeleton" style={{ height: 58 }} />
          ))}
        </div>
      ) : !posts.length ? (
        <p className="tdw-ws-empty">{t('no_upcoming_posts', 'No upcoming posts scheduled')}</p>
      ) : (
        <div className="tdw-ws-next">
          {posts.map((post, i) => {
            const date = newDayjs(post.publishDate).local();
            const day = date.format('YYYY-MM-DD');
            return (
              <button
                key={post.id}
                type="button"
                className={clsx('tdw-ws-nextrow', i === 0 && 'is-first')}
                onClick={editPost(post, false)}
              >
                <span className="tdw-ws-when">
                  <b>{date.format(timeFormat())}</b>
                  <span>
                    {day === today
                      ? t('today', 'Today')
                      : day === tomorrow
                      ? t('tdw_ws_tomorrow', 'Tomorrow')
                      : date.format('ddd D')}
                  </span>
                </span>
                <span className="tdw-ws-what">
                  <ChannelAvatar
                    channel={{
                      identifier: post.integration?.providerIdentifier,
                      picture: post.integration?.picture,
                      name: post.integration?.name,
                    }}
                    size={22}
                  />
                  <span>{postTitle(post, t('no_content', 'no content'))}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export const MiniMonth: FC = () => {
  const t = useT();
  const { startDate, endDate, display } = useCalendar();
  const { goTo } = useCalendarNavigation();
  const [month, setMonth] = useState(newDayjs(startDate).startOf('month').format('YYYY-MM-DD'));
  // Follow the calendar, but stay on the month shown while the range still
  // touches it (a click on 2 Oct opening 28 Sep – 4 Oct keeps October)
  useEffect(() => {
    setMonth((m) =>
      m <= endDate && newDayjs(m).endOf('month').format('YYYY-MM-DD') >= startDate
        ? m
        : newDayjs(startDate).startOf('month').format('YYYY-MM-DD')
    );
  }, [startDate, endDate]);
  const busy = useMonthPostDays(month);
  // The day last clicked stays marked while it is in the range shown
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    setPicked((p) => (p && p >= startDate && p <= endDate ? p : null));
  }, [startDate, endDate]);

  const first = newDayjs(month);
  const gridStart = first.startOf('isoWeek');
  const weeks = Math.ceil((first.endOf('month').diff(gridStart, 'day') + 1) / 7);
  const today = newDayjs().format('YYYY-MM-DD');
  const days = Array.from({ length: weeks * 7 }, (_, i) => gridStart.add(i, 'day'));
  const weekdays = Array.from({ length: 7 }, (_, i) => gridStart.add(i, 'day').format('dd'));

  const pick = (date: dayjs.Dayjs) =>
    goTo(display === 'list' ? 'week' : (display as 'day' | 'week' | 'month'), date.format('YYYY-MM-DD'));

  return (
    <section aria-labelledby="tdw-ws-mini">
      <div className="tdw-ws-mini-h">
        <h3 id="tdw-ws-mini" className="tdw-ws-label">
          {first.format('MMMM YYYY')}
        </h3>
        <span>
          <IconButton
            icon="chevron-left"
            size="sm"
            className="tdw-ws-flip"
            label={t('tdw_ws_previous_month', 'Previous month')}
            onClick={() => setMonth(first.subtract(1, 'month').format('YYYY-MM-DD'))}
          />
          <IconButton
            icon="chevron-right"
            size="sm"
            className="tdw-ws-flip"
            label={t('tdw_ws_next_month', 'Next month')}
            onClick={() => setMonth(first.add(1, 'month').format('YYYY-MM-DD'))}
          />
        </span>
      </div>
      <div className="tdw-mini" role="grid">
        {weekdays.map((d, i) => (
          <em key={i}>{d}</em>
        ))}
        {days.map((date) => {
          const key = date.format('YYYY-MM-DD');
          const inRange = display !== 'list' && key >= startDate && key <= endDate;
          return (
            <button
              key={key}
              type="button"
              className={clsx(
                date.month() !== first.month() && 'is-out',
                inRange && 'is-range',
                key === picked && 'is-picked',
                key === today && 'is-today'
              )}
              aria-current={key === today ? 'date' : undefined}
              aria-label={date.format('LL')}
              onClick={() => {
                setPicked(key);
                pick(date);
              }}
            >
              {date.date()}
              {busy.has(key) && <i />}
            </button>
          );
        })}
      </div>
    </section>
  );
};

const DraftRow: FC<{ post: any; onDropped: () => void }> = ({ post, onDropped }) => {
  const t = useT();
  const { editPost } = usePostActions();
  const [{ dragging }, drag] = useDrag(
    () => ({
      type: 'post',
      item: { id: post.id, interval: false, date: dayjs.utc(post.publishDate) },
      end: (_item, monitor) => {
        if (monitor.didDrop()) onDropped();
      },
      collect: (monitor) => ({ dragging: monitor.isDragging() }),
    }),
    [post.id]
  );
  return (
    <button
      // @ts-ignore
      ref={drag}
      type="button"
      className={clsx('tdw-ws-draft', dragging && 'is-dragging')}
      onClick={editPost(post, false)}
    >
      <Icon name="grip-vertical" size={14} className="tdw-ws-grip" />
      <ChannelAvatar
        channel={{
          identifier: post.integration?.providerIdentifier,
          picture: post.integration?.picture,
          name: post.integration?.name,
        }}
        size={22}
      />
      <span>{postTitle(post, t('no_content', 'no content'))}</span>
    </button>
  );
};

export const WorkspaceSidePanel: FC<{ onClose: () => void }> = ({ onClose }) => {
  const t = useT();
  const upNext = useUpNextPosts();
  const drafts = useDraftPosts();

  // The calendar reloads after edits, drops and deletes: follow it
  const signature = useCalendarPostsSignature();
  useEffect(() => {
    upNext.mutate();
    drafts.mutate();
  }, [signature]);

  const draftList = drafts.data?.posts || [];

  return (
    <aside className="tdw-ui tdw-ws-side" aria-label={t('tdw_ws_side_panel', 'Up next and drafts')}>
      <UpNext posts={upNext.data?.posts || []} loading={upNext.isLoading} onClose={onClose} />
      <MiniMonth />
      <section aria-labelledby="tdw-ws-drafts">
        <h3 id="tdw-ws-drafts" className="tdw-ws-label">
          {t('tdw_ws_drafts', 'Drafts')}
          {!!draftList.length && <span className="tdw-ws-count">{draftList.length}</span>}
        </h3>
        {!draftList.length ? (
          <p className="tdw-ws-empty">{t('no_draft_posts', 'No draft posts')}</p>
        ) : (
          <>
            <p className="tdw-ws-hint">{t('tdw_ws_drag_hint', 'Drag a draft onto the calendar to move it, or click to open it.')}</p>
            <div className="tdw-ws-drafts">
              {draftList.map((post: any) => (
                <DraftRow key={post.id} post={post} onDropped={() => drafts.mutate()} />
              ))}
            </div>
          </>
        )}
      </section>
    </aside>
  );
};
