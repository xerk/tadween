import { API_URL } from './config';

/** A plan as the pricing table shows it. Prices are whole currency units;
    `yearly` is the total for a year, billed once. */
export interface PlanView {
  key: string;
  /** From the API; the page prefers its own translated copy for the four known keys. */
  name?: string;
  description?: string | null;
  features?: string[];
  popular: boolean;
  trialDays: number;
  channels: number;
  /** -1 = unlimited, 0 = none (the app's Plan.teamMembers). */
  teamMembers: number;
  /** AI image and video credits a month; -1 = unlimited (Plan.aiCredits). */
  aiCredits: number;
  /** The app's subscription tier, which decides webhooks and RSS auto-post. */
  tier: Tier;
  usd: { monthly: number; yearly: number };
  /** Null when the API returns a plan this site has no EGP placeholder for. */
  egp: { monthly: number; yearly: number } | null;
  /** Null when the API returns a plan this site has no SAR placeholder for. */
  sar: { monthly: number; yearly: number } | null;
}

type Tier = 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE';

/* What each tier unlocks that a Tadween plan can't change: `webhooks` and `autoPost` in
   libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing.ts. -1 = unlimited. */
export const TIER_LIMITS: Record<Tier, { webhooks: number; autoPost: boolean }> = {
  STANDARD: { webhooks: 2, autoPost: false },
  TEAM: { webhooks: 10, autoPost: true },
  PRO: { webhooks: 30, autoPost: true },
  ULTIMATE: { webhooks: -1, autoPost: true },
};

export interface PlansResult {
  plans: PlanView[];
  source: 'api' | 'static';
}

/* Placeholder prices, the same as the seeded Tadween plans in the app
   (tadween.defaults.ts): yearly is 20% off twelve months. Not final. */
export const DEFAULT_PLANS: PlanView[] = [
  { key: 'creator', tier: 'STANDARD', popular: false, trialDays: 7, channels: 2, teamMembers: 0, aiCredits: 20, usd: { monthly: 9, yearly: 86 }, egp: { monthly: 299, yearly: 2868 }, sar: { monthly: 35, yearly: 336 } },
  { key: 'pro', tier: 'TEAM', popular: false, trialDays: 7, channels: 5, teamMembers: 0, aiCredits: 100, usd: { monthly: 19, yearly: 182 }, egp: { monthly: 599, yearly: 5748 }, sar: { monthly: 69, yearly: 662 } },
  { key: 'team', tier: 'PRO', popular: true, trialDays: 7, channels: 15, teamMembers: -1, aiCredits: 300, usd: { monthly: 39, yearly: 374 }, egp: { monthly: 1199, yearly: 11508 }, sar: { monthly: 149, yearly: 1430 } },
  { key: 'agency', tier: 'ULTIMATE', popular: false, trialDays: 7, channels: 50, teamMembers: -1, aiCredits: 500, usd: { monthly: 79, yearly: 758 }, egp: { monthly: 2499, yearly: 23988 }, sar: { monthly: 299, yearly: 2870 } },
];

/** The public plan shape of GET /instance/settings (PlansService.getPublicPlans). */
interface ApiPlan {
  key: string;
  name: string;
  description: string | null;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  trialDays: number;
  mostPopular: boolean;
  channels: number;
  features: string[];
  /** Also in getPublicPlans; optional so an older API still parses. */
  tier?: string;
  teamMembers?: number;
  aiCredits?: number;
}

const isTier = (t: unknown): t is Tier => typeof t === 'string' && t in TIER_LIMITS;

const isApiPlan = (p: unknown): p is ApiPlan =>
  !!p && typeof p === 'object' && typeof (p as ApiPlan).key === 'string' && typeof (p as ApiPlan).monthlyPriceUsd === 'number';

function fromApi(p: ApiPlan): PlanView {
  const fallback = DEFAULT_PLANS.find((d) => d.key === p.key);
  return {
    key: p.key,
    name: p.name,
    description: p.description,
    features: Array.isArray(p.features) ? p.features.filter((f) => typeof f === 'string') : [],
    popular: !!p.mostPopular,
    trialDays: p.trialDays ?? 7,
    channels: p.channels,
    teamMembers: p.teamMembers ?? fallback?.teamMembers ?? 0,
    aiCredits: p.aiCredits ?? fallback?.aiCredits ?? 0,
    tier: isTier(p.tier) ? p.tier : fallback?.tier ?? 'STANDARD',
    usd: { monthly: p.monthlyPriceUsd, yearly: p.yearlyPriceUsd ?? p.monthlyPriceUsd * 12 },
    // The public endpoint has no EGP or SAR prices yet, so those stay placeholders.
    egp: fallback?.egp ?? null,
    sar: fallback?.sar ?? null,
  };
}

/** Plans for the pricing table. With NEXT_PUBLIC_API_URL set, reads the app's public
    GET /instance/settings at build time and again at most hourly (ISR); any failure, or an
    instance with no plans saved, falls back to the static placeholders. */
export async function loadPlans(): Promise<PlansResult> {
  if (!API_URL) return { plans: DEFAULT_PLANS, source: 'static' };
  try {
    const res = await fetch(`${API_URL}/instance/settings`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`GET /instance/settings returned ${res.status}`);
    const body: unknown = await res.json();
    const raw = (body as { plans?: unknown })?.plans;
    const plans = Array.isArray(raw) ? raw.filter(isApiPlan).map(fromApi) : [];
    if (!plans.length) return { plans: DEFAULT_PLANS, source: 'static' };
    return { plans, source: 'api' };
  } catch (e) {
    console.warn(`[pricing] using placeholder plans: ${(e as Error).message}`);
    return { plans: DEFAULT_PLANS, source: 'static' };
  }
}
