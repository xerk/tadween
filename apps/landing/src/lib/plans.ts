import { API_URL } from './config';

/** One line of a plan's feature list, generated from the plan's limits like the app's
    PlansService.getPublicPlans `featureItems`: `key` is translated by the page
    (pricing.featureText), `value` is the number it shows (-1 = unlimited). */
export interface FeatureItem {
  key: FeatureKey;
  value?: number;
}

/** The order the app lists them in, so the plans compare line by line. */
export const FEATURE_KEYS = ['channels', 'posts', 'team', 'ai_writing', 'ai_images', 'picture_editor', 'autopost', 'public_api', 'webhooks'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
const isFeatureKey = (k: unknown): k is FeatureKey => typeof k === 'string' && (FEATURE_KEYS as readonly string[]).includes(k);

/** A plan as the pricing cards show it. Prices are US dollars (Stripe bills in USD);
    `yearly` is the total for a year, billed once. */
export interface PlanView {
  key: string;
  name: string;
  description: string | null;
  popular: boolean;
  trialDays: number;
  usd: { monthly: number; yearly: number };
  featureItems: FeatureItem[];
  /** Lines the admin typed in Admin → Plans, shown as written. */
  extraFeatures: string[];
}

export interface Pricing {
  plans: PlanView[];
  /** The yearly saving, in percent (0 = yearly isn't cheaper). */
  yearlyDiscountPercent: number;
}

const DEFAULT_DISCOUNT = 20;
const yearlyFrom = (monthly: number, pct: number) => Math.round(monthly * 12 * (1 - pct / 100));

/* Used only when the API isn't configured or can't be reached: the two plans the app seeds
   (tadween.defaults.ts DEFAULT_PLANS). The live prices are whatever Admin → Plans says. */
export const DEFAULT_PRICING: Pricing = {
  yearlyDiscountPercent: DEFAULT_DISCOUNT,
  plans: [
    {
      key: 'pro',
      name: 'Pro',
      description: 'For creators and small teams',
      popular: false,
      trialDays: 7,
      usd: { monthly: 9, yearly: yearlyFrom(9, DEFAULT_DISCOUNT) },
      featureItems: [
        { key: 'channels', value: 10 },
        { key: 'posts', value: -1 },
        { key: 'team', value: 3 },
        { key: 'ai_writing' },
        { key: 'ai_images', value: 100 },
        { key: 'picture_editor' },
        { key: 'autopost' },
        { key: 'public_api' },
        { key: 'webhooks', value: 10 },
      ],
      extraFeatures: [],
    },
    {
      key: 'business',
      name: 'Business',
      description: 'For brands and agencies with many pages',
      popular: true,
      trialDays: 7,
      usd: { monthly: 19, yearly: yearlyFrom(19, DEFAULT_DISCOUNT) },
      featureItems: [
        { key: 'channels', value: 30 },
        { key: 'posts', value: -1 },
        { key: 'team', value: -1 },
        { key: 'ai_writing' },
        { key: 'ai_images', value: 300 },
        { key: 'picture_editor' },
        { key: 'autopost' },
        { key: 'public_api' },
        { key: 'webhooks', value: 30 },
      ],
      extraFeatures: [],
    },
  ],
};

/** The public plan shape of GET /instance/settings (PlansService.getPublicPlans).
    `featureItems`, `extraFeatures` and `yearlyDiscountPercent` arrive with the USD billing
    change; from an older API, which sends only the limits, the list is built here the same
    way. */
interface ApiPlan {
  key: string;
  name: string;
  description: string | null;
  tier?: string;
  monthlyPriceUsd: number;
  yearlyPriceUsd?: number;
  trialDays?: number;
  mostPopular?: boolean;
  channels?: number;
  teamMembers?: number;
  postsPerMonth?: number;
  aiCredits?: number;
  features?: unknown;
  featureItems?: unknown;
  extraFeatures?: unknown;
  yearlyDiscountPercent?: number;
}

/** The parts of the settings body an older API needs to build the list: the instance's
    feature switches and the tier entitlements (Postiz's pricing map with plans overlaid). */
interface TierValues {
  ai?: boolean;
  image_generator?: boolean;
  autoPost?: boolean;
  public_api?: boolean;
  webhooks?: number;
}
interface Settings {
  features?: Record<string, boolean>;
  pricing?: Record<string, TierValues>;
}

const isApiPlan = (p: unknown): p is ApiPlan =>
  !!p && typeof p === 'object' && typeof (p as ApiPlan).key === 'string' && typeof (p as ApiPlan).monthlyPriceUsd === 'number';

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && !!s.trim()) : []);

/* The same rules as featureItemsFor in the app's plans.service.ts: only what the app enforces
   for the plan's tier and what the instance has switched on in /admin. */
function itemsFromLimits(p: ApiPlan, s: Settings): FeatureItem[] {
  const on = (k: string) => s.features?.[k] !== false;
  const v: TierValues = (p.tier && s.pricing?.[p.tier]) || {};
  const items: FeatureItem[] = [
    { key: 'channels', value: p.channels ?? 0 },
    { key: 'posts', value: p.postsPerMonth ?? -1 },
  ];
  if (p.teamMembers) items.push({ key: 'team', value: p.teamMembers });
  if (v.ai && on('ai')) {
    items.push({ key: 'ai_writing' });
    if (v.image_generator) items.push({ key: 'ai_images', value: p.aiCredits ?? 0 });
  }
  if (on('media')) items.push({ key: 'picture_editor' });
  if (v.autoPost && on('autopost')) items.push({ key: 'autopost' });
  if (v.public_api && on('publicApi')) items.push({ key: 'public_api' });
  if (v.webhooks && on('webhooks')) items.push({ key: 'webhooks', value: v.webhooks >= 10000 ? -1 : v.webhooks });
  return items;
}

function fromApi(p: ApiPlan, s: Settings, discount: number): PlanView {
  const sent = Array.isArray(p.featureItems)
    ? p.featureItems.filter((i): i is FeatureItem => !!i && typeof i === 'object' && isFeatureKey((i as FeatureItem).key))
    : null;
  return {
    key: p.key,
    name: p.name,
    description: p.description,
    popular: !!p.mostPopular,
    trialDays: p.trialDays ?? 7,
    // The yearly price as saved in Admin → Plans, like the app's own billing.
    usd: { monthly: p.monthlyPriceUsd, yearly: p.yearlyPriceUsd ?? yearlyFrom(p.monthlyPriceUsd, discount) },
    featureItems: sent ?? itemsFromLimits(p, s),
    // The admin's own lines. An older API's `features` are left out: on plans seeded before
    // the list was generated they hold the old marketing bullets, which the rows replace.
    extraFeatures: strings(p.extraFeatures),
  };
}

/** An older API sends no discount: the smallest saving the plans' own prices give, so the
    badge never promises more than a plan saves. */
function discountFromPrices(plans: PlanView[]) {
  const savings = plans.filter((p) => p.usd.monthly > 0 && p.usd.yearly > 0).map((p) => Math.round((1 - p.usd.yearly / (p.usd.monthly * 12)) * 100));
  return savings.length ? Math.max(0, Math.min(...savings)) : 0;
}

/** How often the pages that show prices re-read the plans, in seconds, so a change in
    Admin → Plans is live within a minute. The page files repeat the number (Next needs a
    literal `revalidate` there). */
export const PLANS_REVALIDATE = 60;

/** Plans for the pricing cards, from the app's public GET /instance/settings
    (NEXT_PUBLIC_API_URL), re-read at most every minute (ISR). When the API isn't set, can't
    be reached or has no plans, the cards quietly show the built-in plans and the server
    logs why. */
export async function loadPricing(): Promise<Pricing> {
  if (!API_URL) {
    console.warn('[pricing] NEXT_PUBLIC_API_URL is not set; showing the built-in plans');
    return DEFAULT_PRICING;
  }
  try {
    const res = await fetch(`${API_URL}/instance/settings`, {
      next: { revalidate: PLANS_REVALIDATE },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`GET /instance/settings returned ${res.status}`);
    const body = ((await res.json()) ?? {}) as Settings & { plans?: unknown };
    const raw = Array.isArray(body.plans) ? body.plans.filter(isApiPlan) : [];
    if (!raw.length) throw new Error('GET /instance/settings has no plans');
    const sent = raw.find((p) => typeof p.yearlyDiscountPercent === 'number')?.yearlyDiscountPercent;
    const plans = raw.map((p) => fromApi(p, body, sent ?? DEFAULT_DISCOUNT));
    return { plans, yearlyDiscountPercent: sent !== undefined ? Math.max(0, sent) : discountFromPrices(plans) };
  } catch (e) {
    console.warn(`[pricing] showing the built-in plans: ${(e as Error).message}`);
    return DEFAULT_PRICING;
  }
}
