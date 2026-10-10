'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { orderBy } from 'lodash';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';

// Data for the Tadween analytics page. Every request is one Postiz already
// serves: /integrations/list (the calendar's channel list), /analytics/:id (the
// network's own numbers, Postiz's analytics page) and /analytics/posts/published
// (what the workspace published from Tadween). One SWR hook each.

export interface AnalyticsSeries {
  label: string;
  data: Array<{ total: number; date: string }>;
  average?: boolean;
  percentageChange?: number;
}

export interface AnalyticsChannel {
  id: string;
  name: string;
  picture: string;
  identifier: string;
  internalId: string;
  type: string;
  disabled: boolean;
  refreshNeeded?: boolean;
  inBetweenSteps?: boolean;
  customer?: { id: string; name: string } | null;
}

export interface PublishedPost {
  id: string;
  publishDate: string;
  releaseURL: string | null;
  excerpt: string;
  integration: {
    id: string;
    name: string;
    picture: string | null;
    providerIdentifier: string;
  };
}

// when and where a post went out (every post in the range)
export interface PublishedDate {
  publishDate: string;
  integration: { id: string; name: string; providerIdentifier: string };
}

export interface PublishedSummary {
  total: number;
  previous: number;
  published: PublishedDate[];
  posts: PublishedPost[];
}

// Ranges each network's analytics API answers for: the same lists as Postiz's
// platform.analytics.tsx (kept there for upstream syncs; update both when a
// network gains or loses analytics). A network missing here has no analytics API.
const ANALYTICS_RANGES: Record<string, number[]> = {
  facebook: [7, 30, 90],
  instagram: [7, 30],
  'instagram-standalone': [7, 30],
  'linkedin-page': [7, 30, 90],
  tiktok: [7, 30],
  'tiktok-business': [7, 30],
  youtube: [7, 30, 90],
  gmb: [7, 30, 90],
  pinterest: [7, 30, 90],
  threads: [7, 30],
  x: [7, 30, 90],
};

// Tadween's own data (posts published) goes back as far as the user wants, up
// to this many days at a time (the published-posts endpoint allows 366)
export const OWN_DATA_MAX_DAYS = 365;

// Numbers and dates in the UI language, Latin digits (same as Today). English
// follows the schedule picker's convention: US order for US users ("Oct 3"),
// day first for everyone else ("3 Oct"); weeks start on Sunday for US users.
type RangeFormat = Intl.DateTimeFormat & {
  formatRange?: (start: Date, end: Date) => string;
};

// YYYY-MM-DD as a Date at noon UTC, formatted with timeZone UTC: the same day everywhere
const ymdDate = (ymd: string) => {
  const d = dayjs(ymd);
  return new Date(Date.UTC(d.year(), d.month(), d.date(), 12));
};

export const useFormatters = () => {
  const { i18n } = useTranslation();
  // Read after mount: localStorage / navigator don't exist during SSR.
  const [us, setUs] = useState(false);
  useEffect(() => setUs(isUSCitizen()), []);
  const lang = (i18n.resolvedLanguage || 'en').replace('_', '-');
  const locale =
    lang === 'ar' ? 'ar-EG-u-nu-latn' : lang === 'en' ? (us ? 'en-US' : 'en-GB') : lang;
  return useMemo(() => {
    const safe = <O,>(make: (l: string) => O) => {
      try {
        return make(locale);
      } catch (e) {
        return make('en');
      }
    };
    const date = (options: Intl.DateTimeFormatOptions) =>
      safe((l) => new Intl.DateTimeFormat(l, { ...options, timeZone: 'UTC' }));
    const number = safe((l) => new Intl.NumberFormat(l));
    const decimal = safe(
      (l) => new Intl.NumberFormat(l, { maximumFractionDigits: 1 })
    );
    const day = date({ day: 'numeric', month: 'short' });
    const fullDay = date({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const shortDay = date({ day: 'numeric', month: 'short', year: 'numeric' });
    const month = date({ month: 'long', year: 'numeric' });
    const weekday = date({ weekday: 'narrow' });
    const dateTime = safe(
      (l) =>
        new Intl.DateTimeFormat(l, {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })
    );
    const valid = (ymd: string) => dayjs(ymd).isValid();
    return {
      weekStart: us ? 0 : 1,
      count: (v: number) => number.format(Math.round(v)),
      percent: (v: number) => `${decimal.format(v)}%`,
      // YYYY-MM-DD (as the networks send it) to "3 Oct"
      day: (ymd: string) => (valid(ymd) ? day.format(ymdDate(ymd)) : ymd),
      // "Thursday, 3 October 2026", for screen readers
      fullDay: (ymd: string) => fullDay.format(ymdDate(ymd)),
      // "October 2026"
      month: (ymd: string) => month.format(ymdDate(ymd)),
      // "M" for a YYYY-MM-DD on that weekday
      weekday: (ymd: string) => weekday.format(ymdDate(ymd)),
      // "1 – 30 Sep 2026", "28 Sep – 4 Oct 2026", one day alone when from = to
      range: (from: string, to: string) => {
        const f = shortDay as RangeFormat;
        if (from === to) return f.format(ymdDate(from));
        return f.formatRange
          ? f.formatRange(ymdDate(from), ymdDate(to))
          : `${f.format(ymdDate(from))} – ${f.format(ymdDate(to))}`;
      },
      dateTime: (iso: string) => dateTime.format(new Date(iso)),
    };
  }, [locale, us]);
};

// ── Date ranges ─────────────────────────────────────────────────────────────
// The page shows a FROM–TO range of local days (YYYY-MM-DD, both included).
// A network's analytics endpoint only answers "the last N days up to today", so
// the page asks for enough days to reach FROM and crops what comes back.

export const YMD = 'YYYY-MM-DD';

export interface DayRange {
  from: string;
  to: string;
}

export const todayYmd = () => dayjs().format(YMD);

// a real calendar day written YYYY-MM-DD (2026-02-30 is not)
export const isYmd = (value?: string | null): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).format(YMD) === value;

// days in the range, both ends included
export const rangeLength = ({ from, to }: DayRange) =>
  dayjs(to).diff(dayjs(from), 'day') + 1;

// the last `days` days, today included (the 7/30/90 presets)
export const lastDays = (days: number, today = todayYmd()): DayRange => ({
  from: dayjs(today).subtract(days - 1, 'day').format(YMD),
  to: today,
});

// `date=N` for /analytics/:id so the answer starts at `from` (a range starting
// today is 1 day, the 30-day preset is 30, as before)
export const daysBack = (from: string, today = todayYmd()) =>
  dayjs(today).diff(dayjs(from), 'day') + 1;

// the same number of days right before the range
export const previousRange = (range: DayRange): DayRange => {
  const end = dayjs(range.from).subtract(1, 'day');
  return {
    from: end.subtract(rangeLength(range) - 1, 'day').format(YMD),
    to: end.format(YMD),
  };
};

// Keeps a requested range inside what the view can load: nothing after today,
// nothing before `min` (a network's oldest day), at most `maxDays` long
export const clampRange = (
  range: DayRange,
  maxDays: number,
  min?: string,
  today = todayYmd()
): DayRange => {
  const swapped = range.from > range.to;
  let from = swapped ? range.to : range.from;
  let to = swapped ? range.from : range.to;
  const asked = rangeLength({ from, to });
  if (to > today) to = today;
  if (min && from < min) from = min;
  if (from > to) {
    return lastDays(Math.max(1, Math.min(asked, maxDays)), today);
  }
  if (rangeLength({ from, to }) > maxDays) {
    from = dayjs(to).subtract(maxDays - 1, 'day').format(YMD);
  }
  return { from, to };
};

// The range in the address bar (?from=YYYY-MM-DD&to=YYYY-MM-DD), so refresh,
// back and shared links keep it; the last 30 days without one
export const useAnalyticsRange = () => {
  const params = useSearchParams();
  const from = params?.get('from');
  const to = params?.get('to');
  const range = useMemo(
    () => (isYmd(from) && isYmd(to) ? { from, to } : lastDays(30)),
    [from, to]
  );
  const setRange = useCallback((next: DayRange) => {
    const query = new URLSearchParams(window.location.search);
    query.set('from', next.from);
    query.set('to', next.to);
    window.history.pushState(null, '', `?${query.toString()}`);
  }, []);
  return [range, setRange] as const;
};

// Networks date points with the server's clock, which can be a day ahead of or
// behind the user's: "today" on the server is within a day of today here
const nearToday = (date: string, today: string) =>
  Math.abs(dayjs(date).diff(dayjs(today), 'day')) <= 1;

// A series some networks send as one total for the whole request instead of
// one point per day (followers, Instagram's likes…): its last point is dated
// today and anything before it is zero (X starts with a 0 at the first day).
// It can't be cut to a range. With 2 days requested ("Yesterday") a single
// point dated yesterday is a daily one, so the date has to be today there.
export const isPeriodTotal = (
  series: AnalyticsSeries,
  requestedDays: number,
  today = todayYmd()
) => {
  const last = series.data[series.data.length - 1];
  if (requestedDays <= 1 || !last) return false;
  const dated =
    requestedDays === 2 ? last.date >= today : nearToday(last.date, today);
  return dated && series.data.slice(0, -1).every((p) => !Number(p.total));
};

// The points of a daily series that fall inside the range; a range ending
// today keeps a point dated tomorrow on a server ahead of the user's clock
export const cropSeries = (
  series: AnalyticsSeries,
  range: DayRange,
  today = todayYmd()
): AnalyticsSeries => {
  const to =
    range.to === today ? dayjs(today).add(1, 'day').format(YMD) : range.to;
  return {
    ...series,
    data: series.data.filter((p) => p.date >= range.from && p.date <= to),
  };
};

export const useAnalyticsRanges = () => {
  const { disableXAnalytics } = useVariables();
  return useCallback(
    (identifier?: string): number[] => {
      if (!identifier || (identifier === 'x' && disableXAnalytics)) {
        return [];
      }
      return ANALYTICS_RANGES[identifier] || [];
    },
    [disableXAnalytics]
  );
};

// Social channels in the calendar's order (type, disabled, identifier)
export const useAnalyticsChannels = () => {
  const { data, isLoading } = useIntegrationList();
  const channels = useMemo(
    () =>
      orderBy(
        ((data || []) as AnalyticsChannel[]).filter((p) => p.type === 'social'),
        ['disabled', 'identifier'],
        ['asc', 'asc']
      ),
    [data]
  );
  return { channels, isLoading };
};

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  shouldRetryOnError: false,
};

// The network's numbers for the last `days` days, today included (no channel
// or no days = don't load)
export const useChannelAnalytics = (channelId?: string, days?: number) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error('analytics unavailable');
    }
    return (await res.json()) as AnalyticsSeries[];
  }, []);
  return useSWR<AnalyticsSeries[]>(
    channelId && days ? `/analytics/${channelId}?date=${days}` : null,
    load,
    swrOptions
  );
};

// Posts published from Tadween between two ISO dates (all channels when no channel)
export const usePublishedPosts = (
  channelId: string | undefined,
  from: string,
  to: string
) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error('published posts unavailable');
    }
    return (await res.json()) as PublishedSummary;
  }, []);
  const params = new URLSearchParams({
    from,
    to,
    ...(channelId ? { integration: channelId } : {}),
  }).toString();
  return useSWR<PublishedSummary>(
    `/analytics/posts/published?${params}`,
    load,
    swrOptions
  );
};

// "Reconnect" sends the user through the network's OAuth again (same request
// as Postiz's analytics and calendar)
export const useReconnectChannel = () => {
  const fetch = useFetch();
  return useCallback(
    async (channel: AnalyticsChannel) => {
      const { url } = await (
        await fetch(
          `/integrations/social/${channel.identifier}?refresh=${channel.internalId}`,
          { method: 'GET' }
        )
      ).json();
      window.location.href = url;
    },
    [fetch]
  );
};
