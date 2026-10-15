'use client';

// Instance settings set by the super admin (/admin), read by the whole app from
// the public GET /instance/settings. While loading, or if the request fails,
// everything behaves like stock Postiz: every feature on and the static
// pricing map.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useInvitedTrial } from '@gitroom/frontend/components/tadween/referral/partners.api';
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

// Features that start off (tadween.defaults.ts → featureDefaultsFromEnv). They
// stay hidden until the settings load, so they never flash on.
const FEATURES_OFF_BY_DEFAULT: FeatureKey[] = ['ugc', 'affiliate'];

export interface PublicPlan {
  key: string;
  name: string;
  description: string | null;
  tier: 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE';
  // What checkout charges now (the founder price while the offer is open)
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  // The regular price, charged once the founder offer closes
  listMonthlyPriceUsd: number;
  listYearlyPriceUsd: number;
  // null: no founder price on this plan
  founderMonthlyPriceUsd: number | null;
  founderYearlyPriceUsd: number | null;
  // true while checkout charges the founder price
  founderPrice: boolean;
  trialDays: number;
  mostPopular: boolean;
  channels: number;
  teamMembers: number;
  postsPerMonth: number;
  aiCredits: number;
  // Generated from the limits (translate tdw_plan_feature_<key>); -1 = unlimited
  featureItems: { key: string; value?: number }[];
  // The admin's own bullets, shown after the generated ones
  extraFeatures: string[];
  // featureItems in English + extraFeatures (the website renders this)
  features: string[];
  yearlyDiscountPercent: number;
}

// Public links from /admin → Branding (env TADWEEN_*_URL until saved). An
// empty value means "hide the link", never "use Postiz's".
export interface BrandLinks {
  websiteUrl: string;
  termsUrl: string;
  privacyUrl: string;
  docsUrl: string;
  supportUrl: string;
  tutorialVideoUrl: string;
}

export interface InstanceSettings {
  registration: { mode: 'open' | 'invite' | 'closed' };
  features: Partial<Record<FeatureKey, boolean>>;
  branding: BrandLinks & {
    instanceName: string;
    supportEmail: string;
    defaultLanguage: string;
    defaultTimezone: string;
    // public docs site, from Branding → Links (sent once PR #17 is merged)
    docsUrl?: string;
  };
  plans: PublicPlan[];
  pricing: PricingInterface;
  // whether the server has an OpenAI key (absent on older backends)
  ai?: { available: boolean };
  // social sign-in providers the backend has credentials for, { google: true }
  login?: Record<string, boolean>;
  // The founder offer (PlansService.getFounderOffer)
  founder?: FounderOffer;
}

export interface FounderOffer {
  open: boolean;
  cap: number;
  spotsLeft: number;
  endsAt: string | null;
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

// `isOn('plugs')` — true unless the admin switched the feature off. Before the
// settings load, features that start off read as off.
export const useFeatures = () => {
  const { data } = useInstanceSettings();
  return useCallback(
    (key: FeatureKey) =>
      data?.features?.[key] ?? !FEATURES_OFF_BY_DEFAULT.includes(key),
    [data]
  );
};

// The pages a feature switch hides from the sidebar (layout/top.menu.tsx;
// keep the two lists in step).
// Switched off, the page itself is closed too: an old link or bookmark goes
// to Today instead of opening it.
const FEATURE_ROUTES: [string, FeatureKey][] = [
  ['/agents', 'agent'],
  ['/analytics', 'analytics'],
  ['/media', 'media'],
  ['/plugs', 'plugs'],
  ['/third-party', 'thirdParty'],
];
export const useFeatureRouteGuard = () => {
  const { data } = useInstanceSettings();
  const isOn = useFeatures();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    // only once the switches are known: never on a failed or slow load
    if (!data?.features) {
      return;
    }
    const route = FEATURE_ROUTES.find(
      ([path]) => pathname === path || pathname?.startsWith(`${path}/`)
    );
    if (route && !isOn(route[1])) {
      router.replace('/today');
    }
  }, [data, isOn, pathname, router]);
};

// true once the app's <CopilotKit> crashed and the app rendered without it
// (AiProvider in ai.guard.tsx)
export const AiRuntimeFailedContext = createContext(false);

// Whether the AI assistant can run on this server. Unlike feature switches this
// is false until the settings load (and when they fail): the assistant only
// mounts once the server said it can answer. `undefined` while loading.
export const useAiAvailable = (): boolean | undefined => {
  const { data, error } = useInstanceSettings();
  const runtimeFailed = useContext(AiRuntimeFailedContext);
  if (error || runtimeFailed) {
    return false;
  }
  if (!data) {
    return undefined;
  }
  return data.ai?.available === true;
};

// `isConfigured('google')` — true once the backend reports credentials for
// that sign-in provider. False while loading, so a button that cannot work
// never shows.
export const useLoginProviders = () => {
  const { data } = useInstanceSettings();
  return useCallback(
    (provider: string) => data?.login?.[provider] === true,
    [data]
  );
};

// Brand name and public links for UI text and hrefs. `docs('/mcp')` joins a
// path onto the docs base, or returns '' when no docs site is set.
export const useBrandLinks = () => {
  const { data } = useInstanceSettings();
  return useMemo(() => {
    const branding = data?.branding;
    const docsUrl = (branding?.docsUrl || '').replace(/\/+$/, '');
    const name = branding?.instanceName || 'Tadween';
    return {
      name,
      // the name an MCP client lists this server under ("tadween")
      slug:
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'tadween',
      supportEmail: branding?.supportEmail || '',
      websiteUrl: branding?.websiteUrl || '',
      termsUrl: branding?.termsUrl || '',
      privacyUrl: branding?.privacyUrl || '',
      supportUrl: branding?.supportUrl || '',
      tutorialVideoUrl: branding?.tutorialVideoUrl || '',
      docsUrl,
      docs: (path = '') => (docsUrl ? `${docsUrl}${path}` : ''),
    };
  }, [data]);
};

// Billing data: the static Postiz pricing map with the admin's plans overlaid
// (computed by the backend), the plans to show in order, and display names.
export const useTadweenPricing = () => {
  const { data } = useInstanceSettings();
  // a workspace an affiliate brought gets a longer trial (partners program)
  const { data: invited } = useInvitedTrial(data?.features?.affiliate === true);
  return useMemo(() => {
    const longer = invited?.trialDays || 0;
    const plans = (data?.plans || []).map((p) =>
      longer && p.trialDays > 0 && p.trialDays < longer
        ? { ...p, trialDays: longer }
        : p
    );
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
      founder: data?.founder,
      hasPlans: plans.length > 0,
      planFor,
      nameFor: (tier: string, fallback: string) =>
        planFor(tier)?.name || fallback,
      visible,
    };
  }, [data, invited]);
};
