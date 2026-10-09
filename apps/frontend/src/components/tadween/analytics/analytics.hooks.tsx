'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { orderBy } from 'lodash';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';

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

export interface PublishedSummary {
  days: number;
  total: number;
  previous: number;
  posts: PublishedPost[];
}

// Ranges each network's analytics API answers for (moved as-is from Postiz's
// platform.analytics.tsx). A network missing here has no analytics API.
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

// Tadween's own data (posts published) goes back as far as the user wants
export const OWN_DATA_MAX_DAYS = 365;

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

// The network's numbers for the last `days` days (null key = don't load)
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

// Posts published from Tadween in the last `days` days (all channels when no channel)
export const usePublishedPosts = (channelId: string | undefined, days: number) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error('published posts unavailable');
    }
    return (await res.json()) as PublishedSummary;
  }, []);
  const params = new URLSearchParams({
    days: String(days),
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
