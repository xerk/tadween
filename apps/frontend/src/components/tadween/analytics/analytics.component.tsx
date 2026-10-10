'use client';

import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { groupBy, keyBy, orderBy, uniq } from 'lodash';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { TadweenEmptyState } from '@gitroom/frontend/components/tadween/empty.state';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import {
  Banner,
  Button,
  Icon,
  LinkButton,
  Skeleton,
  TadweenScope,
  cx,
} from '@gitroom/frontend/components/tadween/ui';
import { TadweenChart, ChartPoint } from './analytics.chart';
import {
  ChannelList,
  ChartCard,
  KpiTile,
  RangePicker,
  channelStatus,
} from './analytics.parts';
import {
  AnalyticsChannel,
  AnalyticsSeries,
  DayRange,
  OWN_DATA_MAX_DAYS,
  PublishedDate,
  PublishedPost,
  YMD,
  clampRange,
  cropSeries,
  daysBack,
  isPeriodTotal,
  lastDays,
  previousRange,
  rangeLength,
  todayYmd,
  useAnalyticsChannels,
  useAnalyticsRange,
  useAnalyticsRanges,
  useChannelAnalytics,
  useFormatters,
  usePublishedPosts,
  useReconnectChannel,
} from './analytics.hooks';

// Tadween analytics: pick "All channels" or one channel, a date range, and see
// the network's own numbers (when its API has them) next to what the workspace
// published from Tadween. Styles: app/tadween/analytics.scss.
//
// A network's endpoint only answers "the last N days up to today", so for a
// FROM–TO range the page asks for N = days from FROM to today and crops every
// daily series to the range; the previous period (the same length right before
// FROM) is a second request the same way, when the network keeps that far back.

type T = ReturnType<typeof useT>;

const DEFAULT_PRESETS = [7, 30, 90];
// stable empty lists, so memos don't rerun while data loads
const NO_SERIES: AnalyticsSeries[] = [];
const NO_POSTS: PublishedPost[] = [];
const NO_DATES: PublishedDate[] = [];

// A network series: its total (or average for rates) and its points
const summarise = (series: AnalyticsSeries) => {
  const values = series.data.map((p) => Number(p.total) || 0);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    values,
    value: series.average ? sum / (values.length || 1) : sum,
  };
};

// Published posts per local day (or per 7 days from FROM, for long ranges),
// oldest first; same window the backend counted
const bucketPosts = (published: PublishedDate[], range: DayRange) => {
  const days = rangeLength(range);
  const step = days > 45 ? 7 : 1;
  const from = dayjs(range.from);
  const buckets = Array.from({ length: Math.ceil(days / step) }, (_, i) => ({
    key: from.add(i * step, 'day').format(YMD),
    total: 0,
  }));
  published.forEach((p) => {
    const index = Math.floor(
      dayjs(p.publishDate).startOf('day').diff(from, 'day') / step
    );
    if (buckets[index]) {
      buckets[index].total++;
    }
  });
  return buckets;
};

const percentChange = (now: number, before: number) =>
  before > 0 ? ((now - before) / before) * 100 : null;

const downloadCsv = (name: string, rows: (string | number)[][]) => {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell ?? '');
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(',')
    )
    .join('\n');
  const url = URL.createObjectURL(
    new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const PostRow: FC<{
  post: PublishedPost;
  when: string;
  t: T;
}> = ({ post, when, t }) => (
  <li className="tdw-an-post">
    <TadweenChannelAvatar
      integration={{
        picture: post.integration.picture || '',
        identifier: post.integration.providerIdentifier,
        name: post.integration.name,
      }}
      size={30}
    />
    <div className="tdw-an-post-copy">
      <div className="tdw-an-post-meta">
        <span className="tdw-an-post-ch">{post.integration.name}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={post.publishDate}>{when}</time>
      </div>
      <p className="tdw-an-post-text" dir="auto">
        {post.excerpt || t('tdw_an_no_text', 'Media post')}
      </p>
    </div>
    {post.releaseURL ? (
      <a
        className="tdw-an-post-open"
        href={post.releaseURL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('tdw_an_open_post', 'Open the post on the network')}
        title={t('tdw_an_open_post', 'Open the post on the network')}
      >
        <Icon name="external-link" size={15} />
      </a>
    ) : null}
  </li>
);

export const TadweenAnalytics: FC = () => {
  const t = useT();
  const fmt = useFormatters();
  const rangesFor = useAnalyticsRanges();
  const reconnect = useReconnectChannel();
  const { channels, isLoading: channelsLoading } = useAnalyticsChannels();

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [requested, setRange] = useAnalyticsRange();

  const channel = channels.find((c) => c.id === selectedId);
  // a removed channel falls back to the overview
  useEffect(() => {
    if (selectedId && !channelsLoading && !channel) {
      setSelectedId(undefined);
    }
  }, [selectedId, channel, channelsLoading]);

  const ranges = channel ? rangesFor(channel.identifier) : [];
  const status = channel ? channelStatus(channel, ranges.length > 0) : 'none';
  const networkData = !!channel && status === 'ok';
  const presets = networkData ? ranges : DEFAULT_PRESETS;
  const maxDays = networkData ? Math.max(...ranges) : OWN_DATA_MAX_DAYS;
  const today = todayYmd();
  // a network keeps its last `maxDays` days; Tadween's posts go back as far as needed
  const min = networkData ? lastDays(maxDays, today).from : undefined;
  // the range shown: the one asked for, inside what this view can load
  const range = useMemo(
    () => clampRange(requested, maxDays, min, today),
    [requested, maxDays, min, today]
  );
  const days = rangeLength(range);
  const previous = useMemo(() => previousRange(range), [range]);
  const requestDays = daysBack(range.from, today);
  const previousDays = daysBack(previous.from, today);

  const analytics = useChannelAnalytics(
    networkData ? channel!.id : undefined,
    requestDays
  );
  const analyticsBefore = useChannelAnalytics(
    networkData && previousDays <= maxDays ? channel!.id : undefined,
    previousDays
  );
  // local day boundaries; the same ISO strings all day, so SWR keeps one key per range
  const postsWindow = useMemo(
    () => ({
      from: dayjs(range.from).startOf('day').toISOString(),
      to: dayjs(range.to).endOf('day').toISOString(),
    }),
    [range]
  );
  const published = usePublishedPosts(channel?.id, postsWindow.from, postsWindow.to);

  // Daily series cropped to the range. A one-total series covers the whole
  // request up to today, so it only matches a range that ends today.
  const rawSeries = analytics.data || NO_SERIES;
  const { series, totalsOnly } = useMemo(() => {
    const shown: AnalyticsSeries[] = [];
    const hidden: string[] = [];
    rawSeries.forEach((s) => {
      if (!isPeriodTotal(s, requestDays)) {
        shown.push(cropSeries(s, range));
      } else if (range.to === today) {
        shown.push(s);
      } else {
        hidden.push(s.label);
      }
    });
    return { series: shown, totalsOnly: hidden };
  }, [rawSeries, requestDays, range, today]);
  // the same daily series over the previous period, by label
  const before = useMemo(
    () =>
      keyBy(
        (analyticsBefore.data || NO_SERIES)
          .filter((s) => !isPeriodTotal(s, previousDays))
          .map((s) => cropSeries(s, previous)),
        'label'
      ),
    [analyticsBefore.data, previousDays, previous]
  );
  const seriesDelta = (s: AnalyticsSeries) => {
    const prev = before[s.label];
    return !isPeriodTotal(s, requestDays) && prev?.data.length
      ? percentChange(summarise(s).value, summarise(prev).value)
      : null;
  };

  const posts = published.data?.posts || NO_POSTS;
  const dates = published.data?.published || NO_DATES;
  const buckets = useMemo(() => bucketPosts(dates, range), [dates, range]);
  const weekly = days > 45;

  const postPoints: ChartPoint[] = useMemo(
    () => buckets.map((b) => ({ label: fmt.day(b.key), value: b.total })),
    [buckets, fmt]
  );
  const seriesPoints = useMemo(
    () =>
      series.map((s) =>
        s.data.map((p) => ({ label: fmt.day(p.date), value: Number(p.total) || 0 }))
      ),
    [series, fmt]
  );

  const formatCount = useCallback((v: number) => fmt.count(v), [fmt]);
  const formatPercent = useCallback((v: number) => fmt.percent(v), [fmt]);

  const exportCsv = useCallback(() => {
    const csvDates = uniq([
      ...series.flatMap((s) => s.data.map((p) => p.date)),
      ...(weekly ? [] : buckets.map((b) => b.key)),
    ]).sort();
    const postsByDay = groupBy(dates, (p) =>
      dayjs(p.publishDate).format(YMD)
    );
    const header = [
      t('tdw_an_csv_date', 'Date'),
      ...series.map((s) => s.label),
      t('tdw_an_posts_published', 'Posts published'),
    ];
    const rows = csvDates.map((date) => [
      date,
      ...series.map((s) => s.data.find((p) => p.date === date)?.total ?? ''),
      postsByDay[date]?.length || 0,
    ]);
    downloadCsv(
      `tadween-analytics-${(channel?.name || 'all-channels')
        .toLowerCase()
        .replace(/[^a-z0-9؀-ۿ]+/gi, '-')}-${range.from}_${range.to}.csv`,
      [header, ...rows]
    );
  }, [series, buckets, dates, weekly, channel, range, t]);

  // ── Tiles ───────────────────────────────────────────────────────────────
  const publishedTotal = published.data?.total ?? 0;
  const publishedDelta = published.data
    ? percentChange(publishedTotal, published.data.previous)
    : null;
  const deltaLabel = t('tdw_an_vs_previous_days', 'vs the {{days}} days before', {
    days,
  });

  const overviewTiles = useMemo(() => {
    const byChannel = groupBy(dates, (p) => p.integration.id);
    const byNetwork = orderBy(
      Object.entries(groupBy(dates, (p) => p.integration.providerIdentifier)),
      ([, list]) => list.length,
      'desc'
    );
    return {
      activeChannels: Object.keys(byChannel).length,
      perWeek: (publishedTotal / days) * 7,
      topNetwork: byNetwork[0],
      byNetwork,
    };
  }, [dates, publishedTotal, days]);

  const loadingPosts = published.isLoading;
  const loadingNetwork = networkData && analytics.isLoading;
  const hasExport =
    (series.length > 0 || dates.length > 0) && !loadingPosts && !loadingNetwork;

  // ── Header ──────────────────────────────────────────────────────────────
  const title = channel ? channel.name : t('tdw_an_overview', 'Overview');
  const subtitle = channel
    ? networkData
      ? t('tdw_an_sub_channel', "The network's numbers and what you published.")
      : t('tdw_an_sub_posts', 'What you published from Tadween.')
    : t('tdw_an_sub_all', 'Everything you published from Tadween, across channels.');

  if (!channelsLoading && !channels.length) {
    return (
      <TadweenScope className="tdw-an-scope is-empty">
        <TadweenEmptyState
          icon="chart"
          title={t('can_t_show_analytics_yet', "Can't show analytics yet")}
          body={t(
            'tdw_an_no_channels_body',
            'Connect a channel and publish from Tadween, and your numbers will show here.'
          )}
          action={
            <LinkButton href="/launches" variant="primary" icon="plus">
              {t('go_to_the_calendar_to_add_channels', 'Go to the calendar to add channels')}
            </LinkButton>
          }
        />
      </TadweenScope>
    );
  }

  return (
    <TadweenScope className="tdw-an-scope">
      <aside className="tdw-an-side">
        <ChannelList
          channels={channels}
          selected={selectedId}
          onSelect={setSelectedId}
          rangesFor={rangesFor}
          loading={channelsLoading}
        />
      </aside>

      <div className="tdw-an-main">
        <header className="tdw-an-head">
          <div className="tdw-an-head-copy">
            <div className="tdw-an-eyebrow">
              {channel ? (
                <TadweenChannelAvatar integration={channel} size={18} />
              ) : (
                <Icon name="chart-column" size={14} />
              )}
              {channel
                ? t('tdw_an_channel', 'Channel')
                : t('tdw_an_all_channels', 'All channels')}
            </div>
            <h1 className="tdw-an-title">{title}</h1>
            <p className="tdw-an-sub">{subtitle}</p>
          </div>
          <div className="tdw-an-head-actions">
            <RangePicker
              presets={presets}
              value={range}
              onChange={setRange}
              maxDays={maxDays}
              min={min}
              minReason={
                networkData
                  ? t(
                      'tdw_an_rp_network_limit',
                      '{{name}} shares only its last {{days}} days of analytics.',
                      { name: channel!.name, days: maxDays }
                    )
                  : undefined
              }
            />
            <Button
              size="sm"
              icon="download"
              onClick={exportCsv}
              disabled={!hasExport}
            >
              {t('tdw_an_export', 'Export CSV')}
            </Button>
          </div>
        </header>

        {/* What the network can and can't tell us */}
        {channel && status === 'none' ? (
          <Banner
            tone="info"
            title={t('tdw_an_no_network_title', 'No analytics from this network')}
          >
            {t(
              'tdw_an_no_network_analytics',
              "It doesn't share numbers with apps like Tadween. You still see everything you published from here."
            )}
          </Banner>
        ) : null}

        {channel && (status === 'reconnect' || status === 'setup' || status === 'disabled') ? (
          <section className="tdw-an-card tdw-an-state">
            <TadweenEmptyState
              icon={status === 'disabled' ? 'channels' : 'plug'}
              title={
                status === 'reconnect'
                  ? t('tdw_an_reconnect_title', 'Reconnect {{name}} to see its numbers', { name: channel.name })
                  : status === 'setup'
                  ? t('tdw_an_setup_title', 'Finish connecting {{name}}', { name: channel.name })
                  : t('tdw_an_disabled_title', '{{name}} is disabled', { name: channel.name })
              }
              body={
                status === 'reconnect'
                  ? t('tdw_an_reconnect_body', "The network signed Tadween out. Reconnect once and its analytics come back; your posts below are unaffected.")
                  : status === 'setup'
                  ? t('tdw_an_setup_body', 'This channel still needs a step in the calendar before it can post or report.')
                  : t('tdw_an_disabled_body', 'Enable it from the calendar to load its analytics again.')
              }
              action={
                status === 'reconnect' ? (
                  <Button variant="primary" icon="refresh-cw" onClick={() => reconnect(channel)}>
                    {t('tdw_an_reconnect', 'Reconnect channel')}
                  </Button>
                ) : (
                  <LinkButton href="/launches" variant="secondary" iconEnd="arrow-right">
                    {t('tdw_an_open_calendar', 'Open the calendar')}
                  </LinkButton>
                )
              }
            />
          </section>
        ) : null}

        {networkData && analytics.error ? (
          <section className="tdw-an-card tdw-an-state">
            <TadweenEmptyState
              icon="chart"
              title={t('tdw_an_error_title', "Couldn't load {{name}}'s analytics", { name: channel!.name })}
              body={t('tdw_an_error_body', 'The network didn\'t answer. Try again in a moment; if it keeps failing, reconnect the channel.')}
              action={
                <div className="flex gap-[8px] flex-wrap justify-center">
                  <Button icon="refresh-cw" onClick={() => analytics.mutate()}>
                    {t('tdw_an_try_again', 'Try again')}
                  </Button>
                  <Button variant="primary" onClick={() => reconnect(channel!)}>
                    {t('tdw_an_reconnect', 'Reconnect channel')}
                  </Button>
                </div>
              }
            />
          </section>
        ) : null}

        {networkData && !analytics.error && analytics.data && !rawSeries.length ? (
          <section className="tdw-an-card tdw-an-state">
            <TadweenEmptyState
              icon="chart"
              title={t('this_channel_needs_to_be_refreshed', 'This channel needs to be refreshed to display analytics')}
              body={t('tdw_refresh_channel_body', 'Reconnect it once and its numbers will start showing here.')}
              action={
                <Button variant="primary" icon="refresh-cw" onClick={() => reconnect(channel!)}>
                  {t('refresh_channel', 'Refresh Channel')}
                </Button>
              }
            />
          </section>
        ) : null}

        {published.error ? (
          <Banner
            tone="error"
            title={t('tdw_an_posts_error_title', "Couldn't load your published posts")}
            action={
              <Button size="sm" icon="refresh-cw" onClick={() => published.mutate()}>
                {t('tdw_an_try_again', 'Try again')}
              </Button>
            }
          >
            {t('tdw_an_posts_error_body', 'The counts below may be missing until it loads.')}
          </Banner>
        ) : null}

        {/* KPI tiles */}
        <div className="tdw-an-tiles">
          <KpiTile
            label={t('tdw_an_posts_published', 'Posts published')}
            value={fmt.count(publishedTotal)}
            delta={publishedDelta}
            deltaLabel={deltaLabel}
            trend={buckets.map((b) => b.total)}
            loading={loadingPosts}
          />
          {networkData ? (
            loadingNetwork ? (
              [0, 1, 2].map((i) => <KpiTile key={i} label="" value="" loading />)
            ) : (
              series.slice(0, 3).map((s, i) => {
                const { value, values } = summarise(s);
                return (
                  <KpiTile
                    key={s.label + i}
                    label={s.label}
                    value={s.average ? fmt.percent(value) : fmt.count(value)}
                    delta={seriesDelta(s)}
                    deltaLabel={deltaLabel}
                    hint={s.average ? t('tdw_an_average', 'Average for the period') : undefined}
                    trend={values}
                  />
                );
              })
            )
          ) : (
            <>
              <KpiTile
                label={t('tdw_an_per_week', 'Posts per week')}
                value={fmt.count(overviewTiles.perWeek)}
                hint={t('tdw_an_per_week_hint', 'Average over {{days}} days', { days })}
                loading={loadingPosts}
              />
              {!channel ? (
                <KpiTile
                  label={t('tdw_an_active_channels', 'Channels that posted')}
                  value={fmt.count(overviewTiles.activeChannels)}
                  hint={t('tdw_an_of_channels', 'of {{count}} connected channels', {
                    count: channels.length,
                  })}
                  loading={loadingPosts}
                />
              ) : null}
              {!channel ? (
                <KpiTile
                  label={t('tdw_an_top_network', 'Most used network')}
                  value={
                    overviewTiles.topNetwork ? (
                      <span className="tdw-an-net">
                        <img
                          src={`/icons/platforms/${overviewTiles.topNetwork[0]}.png`}
                          alt=""
                          width={22}
                          height={22}
                        />
                        {fmt.count(overviewTiles.topNetwork[1].length)}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                  hint={
                    overviewTiles.topNetwork
                      ? uniq(overviewTiles.topNetwork[1].map((p) => p.integration.name)).join(', ')
                      : t('tdw_an_nothing_yet', 'Nothing published yet')
                  }
                  loading={loadingPosts}
                />
              ) : null}
            </>
          )}
        </div>

        {networkData && !loadingNetwork && totalsOnly.length ? (
          <p className="tdw-an-note">
            <Icon name="info" size={14} />
            {t(
              'tdw_an_totals_today_only',
              '{{metrics}}: the network only gives one total up to today, so they show when the range ends today.',
              { metrics: totalsOnly.join(', ') }
            )}
          </p>
        ) : null}

        {/* Charts */}
        <div className="tdw-an-grid">
          <ChartCard
            title={
              weekly
                ? t('tdw_an_posts_per_week_chart', 'Posts published per week')
                : t('tdw_an_posts_per_day_chart', 'Posts published per day')
            }
            total={fmt.count(publishedTotal)}
            loading={loadingPosts}
            className={networkData ? undefined : 'is-wide'}
          >
            <TadweenChart
              points={postPoints}
              type="bar"
              format={formatCount}
              label={t('tdw_an_posts_published', 'Posts published')}
            />
          </ChartCard>
          {networkData && loadingNetwork
            ? [0, 1, 2].map((i) => (
                <ChartCard key={i} title={<Skeleton width={120} height={14} />} total="" loading>
                  {null}
                </ChartCard>
              ))
            : null}
          {networkData && !loadingNetwork
            ? series.map((s, i) => {
                const { value } = summarise(s);
                return (
                  <ChartCard
                    key={s.label + i}
                    title={s.label}
                    total={s.average ? fmt.percent(value) : fmt.count(value)}
                  >
                    <TadweenChart
                      points={seriesPoints[i]}
                      format={s.average ? formatPercent : formatCount}
                      label={s.label}
                    />
                  </ChartCard>
                );
              })
            : null}
        </div>

        {/* Posts and the per-network breakdown */}
        <div className={cx('tdw-an-bottom', !channel && 'has-side')}>
          <section className="tdw-an-card">
            <header className="tdw-an-card-h">
              <div>
                <h3 className="tdw-an-card-title">
                  {t('tdw_an_published_posts', 'Published in this period')}
                </h3>
                <div className="tdw-an-card-sub">
                  {posts.length < publishedTotal
                    ? t('tdw_an_latest_of', 'Latest {{n}} of {{total}}', {
                        n: Math.min(8, posts.length),
                        total: fmt.count(publishedTotal),
                      })
                    : t('tdw_an_newest_first', 'Newest first')}
                </div>
              </div>
              <Link className="tdw-an-link" href="/launches">
                {t('tdw_an_open_calendar', 'Open the calendar')}
                <Icon name="arrow-right" size={13} className="tdw-flip" />
              </Link>
            </header>
            {loadingPosts ? (
              <ul className="tdw-an-posts" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="tdw-an-post">
                    <Skeleton width={30} height={30} radius={15} />
                    <div className="tdw-an-post-copy">
                      <Skeleton width={140} height={11} />
                      <Skeleton width="90%" height={13} className="mt-[8px]" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : posts.length ? (
              <ul className="tdw-an-posts">
                {posts.slice(0, 8).map((post) => (
                  <PostRow key={post.id} post={post} when={fmt.dateTime(post.publishDate)} t={t} />
                ))}
              </ul>
            ) : (
              <TadweenEmptyState
                size="sm"
                icon="drafts"
                title={t('tdw_an_no_posts_title', 'Nothing published in this period')}
                body={t('tdw_an_no_posts_body', 'Posts you publish from Tadween show up here with a link to the live post.')}
              />
            )}
          </section>

          {!channel ? (
            <section className="tdw-an-card">
              <header className="tdw-an-card-h">
                <div>
                  <h3 className="tdw-an-card-title">{t('tdw_an_by_network', 'By network')}</h3>
                  <div className="tdw-an-card-sub">{t('tdw_an_by_network_sub', 'Posts published per network')}</div>
                </div>
              </header>
              {loadingPosts ? (
                <Skeleton width="100%" height={120} radius={10} />
              ) : overviewTiles.byNetwork.length ? (
                <ul className="tdw-an-bars">
                  {overviewTiles.byNetwork.map(([network, list]) => (
                    <li key={network} className="tdw-an-bar">
                      <img src={`/icons/platforms/${network}.png`} alt="" width={24} height={24} className="tdw-an-bar-logo" />
                      <div className="tdw-an-bar-body">
                        <div className="tdw-an-bar-top">
                          <span className="tdw-an-bar-name">
                            {uniq(list.map((p) => p.integration.name)).join(', ')}
                          </span>
                          <span className="tdw-an-bar-n">{fmt.count(list.length)}</span>
                        </div>
                        <span className="tdw-an-bar-track" aria-hidden="true">
                          <span
                            className="tdw-an-bar-fill"
                            style={{
                              width: `${(list.length / overviewTiles.byNetwork[0][1].length) * 100}%`,
                            }}
                          />
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tdw-an-muted">{t('tdw_an_nothing_yet', 'Nothing published yet')}</p>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </TadweenScope>
  );
};
