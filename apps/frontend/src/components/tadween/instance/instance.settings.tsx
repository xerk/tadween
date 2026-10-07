'use client';

// Instance settings set by the super admin (/admin), read by the whole app from
// the public GET /instance/settings. While loading, or if the request fails,
// everything behaves like stock Postiz: every feature on and the static
// pricing map.
import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  pricing as staticPricing,
  PricingInterface,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

export type FeatureKey =
  | 'ai'
  | 'agent'
  | 'autopost'
  | 'plugs'
  | 'analytics'
  | 'publicApi'
  | 'webhooks'
  | 'shortLinks'
  | 'signatures'
  | 'sets'
  | 'thirdParty'
  | 'media'
  | 'ugc'
  | 'affiliate';

export interface PublicPlan {
  key: string;
  name: string;
  description: string | null;
  tier: 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE';
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  trialDays: number;
  mostPopular: boolean;
  channels: number;
  teamMembers: number;
  postsPerMonth: number;
  aiCredits: number;
  features: string[];
}

export interface InstanceSettings {
  registration: { mode: 'open' | 'invite' | 'closed' };
  features: Partial<Record<FeatureKey, boolean>>;
  branding: {
    instanceName: string;
    supportEmail: string;
    defaultLanguage: string;
    defaultTimezone: string;
  };
  plans: PublicPlan[];
  pricing: PricingInterface;
}

export const INSTANCE_SETTINGS_KEY = '/instance/settings';

export const useInstanceSettings = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error('instance settings unavailable');
    }
    return (await res.json()) as InstanceSettings;
  }, []);
  return useSWR<InstanceSettings>(INSTANCE_SETTINGS_KEY, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenHidden: false,
    shouldRetryOnError: false,
  });
};

// `isOn('plugs')` — true unless the admin switched the feature off.
export const useFeatures = () => {
  const { data } = useInstanceSettings();
  return useCallback(
    (key: FeatureKey) => data?.features?.[key] !== false,
    [data]
  );
};

// Billing data: the static Postiz pricing map with the admin's plans overlaid
// (computed by the backend), the plans to show in order, and display names.
export const useTadweenPricing = () => {
  const { data } = useInstanceSettings();
  return useMemo(() => {
    const plans = data?.plans || [];
    const pricing: PricingInterface = data?.pricing || staticPricing;
    const planFor = (tier: string) => plans.find((p) => p.tier === tier);
    // Tiers to offer, in the admin's order; without plans, Postiz's own order
    // (which already starts with FREE).
    const visible = (withFree: boolean) => {
      const tiers = plans.length
        ? ['FREE', ...plans.map((p) => p.tier as string)]
        : Object.keys(staticPricing);
      return tiers
        .filter((t) => withFree || t !== 'FREE')
        .filter((t) => !!pricing[t])
        .map((t) => [t, pricing[t]] as [string, PricingInterface[string]]);
    };
    return {
      pricing,
      plans,
      hasPlans: plans.length > 0,
      planFor,
      nameFor: (tier: string, fallback: string) =>
        planFor(tier)?.name || fallback,
      visible,
    };
  }, [data]);
};
