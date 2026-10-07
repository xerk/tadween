'use client';

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTranslation } from 'react-i18next';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { getTimezone } from '@gitroom/frontend/components/layout/set.timezone';
import { useAddProvider } from '@gitroom/frontend/components/launches/add.provider.component';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { useFeatures } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { TadweenEmptyState } from '@gitroom/frontend/components/tadween/empty.state';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import {
  Button,
  Icon,
  LinkButton,
  Skeleton,
  TadweenScope,
  cx,
} from '@gitroom/frontend/components/tadween/ui';
import {
  TodayIntegration,
  TodayPost,
  useTodayActions,
  useTodayDrafts,
  useTodayIntegrations,
  useTodayNextPost,
  useTodayPostGroup,
  useTodayPublished,
  useTodayWeekPosts,
} from './today.hooks';

dayjs.extend(isoWeek);

// Tadween "Today": the home page that answers "what's next?". Greeting and a live
// countdown, a quick-compose bar, the next scheduled post, this week at a glance,
// what needs attention, drafts, and when the user usually posts (derived from
// their own published posts). Styles: app/tadween/home.scss.

type T = ReturnType<typeof useT>;

// Wall-clock "now" in the user's timezone (set.timezone.tsx patches .local())
const localNow = () => dayjs.utc().local();
const localDate = (iso: string) => dayjs.utc(iso).local();
const timeOf = (d: dayjs.Dayjs) => d.format(isUSCitizen() ? 'hh:mm A' : 'HH:mm');
const textOf = (post: TodayPost) =>
  stripHtmlValidation(
    'none',
    // keep paragraph breaks as line breaks
    (post.content || '').replace(/<\/p>\s*<p/gi, '</p>\n<p'),
    false,
    true,
    false
  ).trim();

// Dates are formatted from their wall-clock parts, so the timezone stays the user's
const useDateFormat = () => {
  const { i18n } = useTranslation();
  return useCallback(
    (d: dayjs.Dayjs, options: Intl.DateTimeFormatOptions) => {
      const date = new Date(Date.UTC(d.year(), d.month(), d.date(), 12));
      const lang = (i18n.resolvedLanguage || 'en').replace('_', '-');
      try {
        return new Intl.DateTimeFormat(
          lang === 'ar' ? 'ar-EG-u-nu-latn' : lang,
          { ...options, timeZone: 'UTC' }
        ).format(date);
      } catch (e) {
        return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(date);
      }
    },
    [i18n.resolvedLanguage]
  );
};

const useNow = (everyMs: number) => {
  const [now, setNow] = useState(localNow);
  useEffect(() => {
    const id = setInterval(() => setNow(localNow()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
};

const countdown = (t: T, minutes: number) => {
  if (minutes < 1) return t('today_in_moments', 'less than a minute');
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0) return t('today_in_days', '{{d}} d {{h}} h', { d, h });
  if (h > 0) return t('today_in_hours', '{{h}} h {{m}} min', { h, m });
  return t('today_in_minutes', '{{m}} min', { m });
};

const greeting = (t: T, hour: number, name?: string | null) => {
  const first = (name || '').trim().split(/\s+/)[0];
  const period = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
  const withName = {
    morning: t('today_good_morning_name', 'Good morning, {{name}}.', { name: first }),
    afternoon: t('today_good_afternoon_name', 'Good afternoon, {{name}}.', { name: first }),
    evening: t('today_good_evening_name', 'Good evening, {{name}}.', { name: first }),
  };
  const plain = {
    morning: t('today_good_morning', 'Good morning.'),
    afternoon: t('today_good_afternoon', 'Good afternoon.'),
    evening: t('today_good_evening', 'Good evening.'),
  };
  return first ? withName[period] : plain[period];
};

const asAvatar = (post: TodayPost) => ({
  name: post.integration?.name,
  picture: post.integration?.picture,
  identifier: post.integration?.providerIdentifier,
});

const calendarHref = (d: dayjs.Dayjs, display: 'day' | 'week') => {
  const start = display === 'week' ? d.startOf('isoWeek') : d;
  const end = display === 'week' ? d.endOf('isoWeek') : d;
  return `/launches?startDate=${start.format('YYYY-MM-DD')}&endDate=${end.format('YYYY-MM-DD')}&display=${display}`;
};

/* ── Up next ─────────────────────────────────────────────────────────────── */
const UpNext: FC<{
  post?: TodayPost | null;
  loading: boolean;
  onEdit: (p: TodayPost) => () => void;
  onPreview: (p: TodayPost) => () => void;
  onCreate: () => void;
}> = ({ post, loading, onEdit, onPreview, onCreate }) => {
  const t = useT();
  const fmt = useDateFormat();
  const { data: group } = useTodayPostGroup(post?.group);
  const media = (group?.posts?.[0]?.image || [])[0] as
    | { path?: string; thumbnail?: string }
    | undefined;
  const src = media?.thumbnail || media?.path;
  const isVideo = !media?.thumbnail && /\.(mp4|mov|webm)(\?|$)/i.test(src || '');
  const when = post ? localDate(post.publishDate) : null;
  const today = localNow();

  return (
    <section className="tdw-card tdw-next" aria-label={t('today_up_next', 'Up next')}>
      <div className="tdw-card-h">
        <h2 className="tdw-label">{t('today_up_next', 'Up next')}</h2>
        {when ? (
          <span className="tdw-when">
            <Icon name="clock" size={13} />
            {when.isSame(today, 'day')
              ? t('today_today', 'Today')
              : when.isSame(today.add(1, 'day'), 'day')
              ? t('today_tomorrow', 'Tomorrow')
              : fmt(when, { weekday: 'short', day: 'numeric', month: 'short' })}
            {' · '}
            <span className="tdw-tabular">{timeOf(when)}</span>
          </span>
        ) : null}
      </div>
      {loading ? (
        <div className="tdw-next-body">
          <Skeleton height={150} radius={14} />
          <div className="tdw-next-copy">
            <Skeleton width={160} height={16} />
            <Skeleton height={14} />
            <Skeleton width="70%" height={14} />
          </div>
        </div>
      ) : !post ? (
        <TadweenEmptyState
          size="sm"
          icon="calendar"
          title={t('today_nothing_scheduled', 'Nothing scheduled yet')}
          body={t('today_nothing_scheduled_body', 'Plan your next post and it shows up here.')}
          action={
            <Button variant="primary" size="sm" icon="plus" onClick={onCreate}>
              {t('today_create_first_post', 'Create a post')}
            </Button>
          }
        />
      ) : (
        <div className={cx('tdw-next-body', !src && 'is-text')}>
          {src ? (
            <button type="button" className="tdw-next-media" onClick={onPreview(post)} aria-label={t('today_preview', 'Preview')}>
              {isVideo ? <video src={src} muted playsInline preload="metadata" /> : <img src={src} alt="" />}
            </button>
          ) : null}
          <div className="tdw-next-copy">
            <div className="tdw-next-who">
              <TadweenChannelAvatar integration={asAvatar(post)} size={36} />
              <div>
                <b>{post.integration?.name}</b>
                <span>{fmt(when!, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            </div>
            <p className="tdw-next-text" dir="auto">
              {textOf(post) || t('no_content', 'no content')}
            </p>
            <div className="tdw-next-acts">
              <Button size="sm" variant="secondary" icon="pencil" onClick={onEdit(post)}>
                {t('today_edit', 'Edit')}
              </Button>
              <Button size="sm" variant="ghost" icon="eye" onClick={onPreview(post)}>
                {t('today_preview', 'Preview')}
              </Button>
              <LinkButton size="sm" variant="ghost" icon="calendar" href={calendarHref(when!, 'week')}>
                {t('today_open_in_calendar', 'Open in calendar')}
              </LinkButton>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* ── This week ───────────────────────────────────────────────────────────── */
const WeekStats: FC<{
  days: dayjs.Dayjs[];
  posts: TodayPost[];
  loading: boolean;
}> = ({ days, posts, loading }) => {
  const t = useT();
  const fmt = useDateFormat();
  const today = localNow();
  const count = (state: TodayPost['state']) => posts.filter((p) => p.state === state).length;
  const perDay = days.map(
    (d) => posts.filter((p) => p.state !== 'DRAFT' && localDate(p.publishDate).isSame(d, 'day')).length
  );
  const max = Math.max(...perDay, 1);
  const failed = count('ERROR');
  return (
    <section className="tdw-card tdw-week-stat" aria-label={t('today_this_week', 'This week')}>
      <div className="tdw-card-h">
        <h2 className="tdw-label">{t('today_this_week', 'This week')}</h2>
      </div>
      <div className="tdw-stat-nums">
        {[
          { n: count('PUBLISHED'), label: t('today_published', 'published') },
          { n: count('QUEUE'), label: t('today_scheduled', 'scheduled') },
          { n: failed, label: t('today_failed', 'failed'), bad: failed > 0 },
        ].map((s) => (
          <div key={s.label}>
            {loading ? (
              <Skeleton width={28} height={30} />
            ) : (
              <span className={cx('tdw-num', s.bad && 'is-bad')}>{s.n}</span>
            )}
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <ul className="tdw-bars">
        {days.map((d, i) => (
          <li
            key={i}
            className={cx('tdw-bar', d.isSame(today, 'day') && 'is-today')}
            title={t('today_posts_on_day', '{{count}} posts', { count: perDay[i] })}
          >
            <i style={{ height: `${loading ? 0 : (perDay[i] / max) * 100}%` }} />
            <em aria-hidden="true">{fmt(d, { weekday: 'narrow' })}</em>
            <span className="sr-only">
              {fmt(d, { weekday: 'long' })}: {perDay[i]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

/* ── Week strip ──────────────────────────────────────────────────────────── */
const WeekStrip: FC<{
  days: dayjs.Dayjs[];
  posts: TodayPost[];
  loading: boolean;
  onEdit: (p: TodayPost) => () => void;
  onCreate: (d: dayjs.Dayjs) => void;
}> = ({ days, posts, loading, onEdit, onCreate }) => {
  const t = useT();
  const fmt = useDateFormat();
  const today = localNow();
  const strip = useRef<HTMLDivElement>(null);
  // On phones the week scrolls sideways: start it at today
  useEffect(() => {
    const el = strip.current;
    const day = el?.querySelector<HTMLElement>('.is-today');
    if (!el || !day || el.scrollWidth <= el.clientWidth) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const a = el.getBoundingClientRect();
    const b = day.getBoundingClientRect();
    el.scrollLeft += rtl ? b.right - a.right + 18 : b.left - a.left - 18;
  }, [loading]);
  return (
    <section className="tdw-card tdw-weekstrip" aria-label={t('today_week', 'Week')}>
      <div className="tdw-card-h">
        <h2 className="tdw-label">
          {t('today_week_of', 'Week of {{date}}', { date: fmt(days[0], { day: 'numeric', month: 'long' }) })}
        </h2>
        <Link className="tdw-link" href={calendarHref(days[0], 'week')}>
          {t('today_open_calendar', 'Open calendar')}
          <Icon name="arrow-right" size={13} className="tdw-flip" />
        </Link>
      </div>
      <div className="tdw-days" ref={strip}>
        {days.map((d) => {
          const isToday = d.isSame(today, 'day');
          const isPast = d.isBefore(today, 'day');
          const list = posts
            .filter((p) => p.state !== 'DRAFT' && localDate(p.publishDate).isSame(d, 'day'))
            .sort((a, b) => dayjs(a.publishDate).valueOf() - dayjs(b.publishDate).valueOf());
          return (
            <div key={d.format('YYYY-MM-DD')} className={cx('tdw-day', isToday && 'is-today', isPast && 'is-past')}>
              <Link className="tdw-day-h" href={calendarHref(d, 'day')} aria-label={fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}>
                <span>{fmt(d, { weekday: 'short' })}</span>
                <b>{d.date()}</b>
              </Link>
              <div className="tdw-day-list">
                {loading ? (
                  <Skeleton height={26} radius={8} />
                ) : (
                  list.map((p) => (
                    <button
                      key={p.id + p.publishDate}
                      type="button"
                      className={cx('tdw-dot-post', `is-${p.state.toLowerCase()}`)}
                      title={textOf(p)}
                      onClick={onEdit(p)}
                    >
                      <TadweenChannelAvatar integration={asAvatar(p)} size={18} />
                      <span className="tdw-tabular">{timeOf(localDate(p.publishDate))}</span>
                      {p.state === 'ERROR' ? <Icon name="triangle-alert" size={12} className="tdw-dot-flag" /> : null}
                    </button>
                  ))
                )}
                {!isPast ? (
                  <button
                    type="button"
                    className="tdw-day-add"
                    onClick={() => onCreate(d)}
                    aria-label={t('today_add_post_on', 'Add a post on {{day}}', { day: fmt(d, { weekday: 'long' }) })}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

/* ── Needs attention ─────────────────────────────────────────────────────── */
const Attention: FC<{
  failed: TodayPost[];
  channels: TodayIntegration[];
  loading: boolean;
  onOpen: (p: TodayPost) => () => void;
  onReconnect: (i: TodayIntegration) => () => void;
}> = ({ failed, channels, loading, onOpen, onReconnect }) => {
  const t = useT();
  const total = failed.length + channels.length;
  return (
    <section className="tdw-card" aria-label={t('today_needs_attention', 'Needs attention')}>
      <div className="tdw-card-h">
        <h2 className="tdw-label">{t('today_needs_attention', 'Needs attention')}</h2>
        {total ? <span className="tdw-count is-bad">{total}</span> : null}
      </div>
      {loading ? (
        <Skeleton height={40} radius={10} />
      ) : !total ? (
        <div className="tdw-allclear">
          <span className="tdw-attn-ico is-ok"><Icon name="check" size={16} /></span>
          <div>
            <b>{t('today_all_clear', 'All clear')}</b>
            <span>{t('today_all_clear_body', 'Every channel is connected and nothing failed this week.')}</span>
          </div>
        </div>
      ) : (
        <ul className="tdw-list">
          {failed.map((p) => (
            <li key={p.id} className="tdw-attn">
              <span className="tdw-attn-ico is-bad"><Icon name="triangle-alert" size={16} /></span>
              <div>
                <b dir="auto">{textOf(p) || p.integration?.name}</b>
                <span dir="auto">{p.error || t('today_failed_generic', 'Publishing to {{name}} failed.', { name: p.integration?.name })}</span>
              </div>
              <Button size="sm" variant="secondary" onClick={onOpen(p)}>
                {t('today_open', 'Open')}
              </Button>
            </li>
          ))}
          {channels.map((c) => (
            <li key={c.id} className="tdw-attn">
              <TadweenChannelAvatar integration={c} size={32} />
              <div>
                <b>{c.name}</b>
                <span>
                  {c.inBetweenSteps
                    ? t('today_finish_connecting', 'Finish connecting this channel to post to it.')
                    : t('today_reconnect_body', 'Reconnect to keep posts publishing.')}
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={onReconnect(c)}>
                {c.inBetweenSteps ? t('today_continue', 'Continue') : t('today_reconnect', 'Reconnect')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/* ── Drafts ──────────────────────────────────────────────────────────────── */
const Drafts: FC<{
  onEdit: (p: TodayPost) => () => void;
  onCreate: () => void;
}> = ({ onEdit, onCreate }) => {
  const t = useT();
  const fmt = useDateFormat();
  const { data, isLoading } = useTodayDrafts();
  const posts = data?.posts || [];
  return (
    <section className="tdw-card" aria-label={t('today_drafts', 'Drafts')}>
      <div className="tdw-card-h">
        <h2 className="tdw-label">{t('today_drafts', 'Drafts')}</h2>
        {data?.total ? <span className="tdw-count">{data.total}</span> : null}
      </div>
      {isLoading ? (
        <Skeleton height={40} radius={10} />
      ) : !posts.length ? (
        <TadweenEmptyState
          size="sm"
          icon="drafts"
          title={t('today_no_drafts', 'No drafts')}
          body={t('today_no_drafts_body', 'Posts you save as drafts wait here.')}
        />
      ) : (
        <ul className="tdw-list">
          {posts.map((p) => (
            <li key={p.id}>
              <button type="button" className="tdw-row" onClick={onEdit(p)}>
                <TadweenChannelAvatar integration={asAvatar(p)} size={26} />
                <span className="tdw-row-title" dir="auto">{textOf(p) || t('no_content', 'no content')}</span>
                <span className="tdw-row-time">{fmt(localDate(p.publishDate), { day: 'numeric', month: 'short' })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="tdw-ghost-row" onClick={onCreate}>
        <Icon name="plus" size={14} />
        {t('today_new_post', 'New post')}
      </button>
    </section>
  );
};

/* ── When you usually post (from the user's own published posts) ─────────── */
const BANDS = [0, 4, 8, 12, 16, 20];
const Rhythm: FC<{ weekDays: dayjs.Dayjs[] }> = ({ weekDays }) => {
  const t = useT();
  const fmt = useDateFormat();
  const { data, isLoading } = useTodayPublished();
  const posts = data || [];
  // rows: ISO weekday (Mon..Sun), columns: 4-hour bands
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => BANDS.map(() => 0));
    for (const p of posts) {
      const d = localDate(p.publishDate);
      g[d.isoWeekday() - 1][Math.floor(d.hour() / 4)]++;
    }
    return g;
  }, [posts]);
  const max = Math.max(...grid.flat(), 1);
  let top = { day: 0, band: 0, n: 0 };
  grid.forEach((row, day) =>
    row.forEach((n, band) => {
      if (n > top.n) top = { day, band, n };
    })
  );
  const enough = posts.length >= 3;
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return (
    <section className="tdw-card tdw-rhythm" aria-label={t('today_when_you_post', 'When you usually post')}>
      <div className="tdw-card-h">
        <h2 className="tdw-label">{t('today_when_you_post', 'When you usually post')}</h2>
      </div>
      {isLoading ? (
        <Skeleton height={120} radius={10} />
      ) : (
        <>
          <p className="tdw-rhythm-lede">
            {enough ? (
              <>
                {t('today_busiest_slot', 'Your busiest slot:')}{' '}
                <b>
                  {fmt(weekDays[top.day], { weekday: 'long' })} · {hh(BANDS[top.band])}–{hh((BANDS[top.band] + 4) % 24)}
                </b>
              </>
            ) : (
              t('today_rhythm_empty', 'Once a few posts are published, your usual posting times show here.')
            )}
          </p>
          <div className="tdw-heat" role="img" aria-label={t('today_when_you_post', 'When you usually post')}>
            <div className="tdw-heat-row tdw-heat-head" aria-hidden="true">
              <em />
              {BANDS.map((b) => (
                <em key={b}>{String(b).padStart(2, '0')}</em>
              ))}
            </div>
            {grid.map((row, day) => (
              <div key={day} className="tdw-heat-row" aria-hidden="true">
                <em>{fmt(weekDays[day], { weekday: 'narrow' })}</em>
                {row.map((n, band) => (
                  <i
                    key={band}
                    className={cx(n > 0 && 'is-on')}
                    style={n > 0 ? { opacity: 0.25 + 0.75 * (n / max) } : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
          {enough ? (
            <p className="tdw-foot">
              {t('today_rhythm_basis', 'Based on your last {{count}} published posts.', { count: posts.length })}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
};

/* ── Page ────────────────────────────────────────────────────────────────── */
export const TodayComponent: FC = () => {
  const t = useT();
  const user = useUser();
  const fmt = useDateFormat();
  const isOn = useFeatures();
  const now = useNow(30000);
  const weekStart = useMemo(() => localNow().startOf('isoWeek'), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')), [weekStart]);

  const { integrations, isLoading: channelsLoading, mutate: reloadChannels } = useTodayIntegrations();
  const week = useTodayWeekPosts(
    weekStart.startOf('day').utc().format(),
    weekStart.add(6, 'day').endOf('day').utc().format()
  );
  const next = useTodayNextPost();
  const drafts = useTodayDrafts();
  const published = useTodayPublished();

  const reload = useCallback(() => {
    week.mutate();
    next.mutate();
    drafts.mutate();
    published.mutate();
  }, [week.mutate, next.mutate, drafts.mutate, published.mutate]);

  const { create, edit, preview, reconnect } = useTodayActions(integrations, reload);
  const addChannel = useAddProvider(() => reloadChannels());

  const weekPosts = week.data || [];
  const nextPost = next.data;
  const minutesToNext = nextPost
    ? Math.max(0, localDate(nextPost.publishDate).diff(now, 'minute'))
    : 0;
  const moreThisWeek = weekPosts.filter(
    (p) => p.state === 'QUEUE' && p.id !== nextPost?.id && localDate(p.publishDate).isAfter(now)
  ).length;
  const failed = weekPosts.filter((p) => p.state === 'ERROR');
  const attentionChannels = integrations.filter((i) => !i.disabled && (i.refreshNeeded || i.inBetweenSteps));
  const active = integrations.filter((i) => !i.disabled);
  const noChannels = !channelsLoading && !integrations.length;

  const createNow = useCallback(() => create(), [create]);

  return (
    <TadweenScope className="tdw-today-scope">
      <div className="tdw-today">
        <header className="tdw-hero">
          <div className="tdw-hero-copy">
            <div className="tdw-eyebrow">{fmt(now, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h1 className="tdw-h1">{greeting(t, now.hour(), user?.name)}</h1>
            <p className="tdw-lede">
              {noChannels ? (
                t('today_lede_no_channels', 'Connect a channel to start planning your week.')
              ) : next.isLoading ? (
                <Skeleton width={280} height={16} />
              ) : nextPost ? (
                <>
                  {t('today_lede_next', 'Your next post goes out in')}{' '}
                  <b>{countdown(t, minutesToNext)}</b>.
                  {moreThisWeek
                    ? ' ' + t('today_lede_more', '{{count}} more lined up this week.', { count: moreThisWeek })
                    : ''}
                </>
              ) : (
                t('today_lede_none', 'Nothing is scheduled yet. Plan your next post when you are ready.')
              )}
            </p>
          </div>
          <div className="tdw-hero-actions">
            {isOn('agent') ? (
              <LinkButton href="/agents" icon="bot">
                {t('today_ask_agent', 'Ask the agent')}
              </LinkButton>
            ) : null}
            {noChannels ? null : (
              <Button variant="primary" icon="plus" onClick={createNow} disabled={channelsLoading}>
                {t('today_create_post', 'Create post')}
              </Button>
            )}
          </div>
        </header>

        {noChannels ? (
          <section className="tdw-card">
            <TadweenEmptyState
              icon="channels"
              title={t('today_no_channels', 'Connect your first channel')}
              body={t('today_no_channels_body', 'Add a LinkedIn profile or page, or any other network, and Today fills with your plan.')}
              action={
                <Button variant="primary" icon="plus" onClick={addChannel}>
                  {t('today_connect_channel', 'Connect a channel')}
                </Button>
              }
            />
          </section>
        ) : (
          <>
            <button type="button" className="tdw-quick" onClick={createNow} disabled={channelsLoading}>
              <span className="tdw-quick-avs" aria-hidden="true">
                {active.slice(0, 4).map((c) => (
                  <TadweenChannelAvatar key={c.id} integration={c} size={28} />
                ))}
              </span>
              <span className="tdw-quick-ph">{t('today_quick_placeholder', 'What do you want to share today?')}</span>
              <span className="tdw-quick-go" aria-hidden="true">
                <Icon name="plus" size={16} />
              </span>
            </button>

            <div className="tdw-grid">
              <UpNext post={nextPost} loading={next.isLoading} onEdit={edit} onPreview={preview} onCreate={createNow} />
              <WeekStats days={days} posts={weekPosts} loading={week.isLoading} />
            </div>

            <WeekStrip days={days} posts={weekPosts} loading={week.isLoading} onEdit={edit} onCreate={create} />

            <div className="tdw-grid-3">
              <Attention
                failed={failed}
                channels={attentionChannels}
                loading={week.isLoading || channelsLoading}
                onOpen={edit}
                onReconnect={reconnect}
              />
              <Drafts onEdit={edit} onCreate={createNow} />
              <Rhythm weekDays={days} />
            </div>
          </>
        )}
      </div>
    </TadweenScope>
  );
};
