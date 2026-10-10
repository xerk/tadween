import { API_URL } from './config';

/** A plan as the pricing table shows it. Prices are US dollars (Stripe bills in USD);
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

/* Used only when the API isn't configured or can't be reached: the seeded Tadween plans in
   the app (tadween.defaults.ts). The live prices are whatever Admin → Plans says. */
export const DEFAULT_PLANS: PlanView[] = [
  { key: 'creator', tier: 'STANDARD', popular: false, trialDays: 7, channels: 2, teamMembers: 0, aiCredits: 20, usd: { monthly: 9, yearly: 86 } },
  { key: 'pro', tier: 'TEAM', popular: false, trialDays: 7, channels: 5, teamMembers: 0, aiCredits: 100, usd: { monthly: 19, yearly: 182 } },
  { key: 'team', tier: 'PRO', popular: true, trialDays: 7, channels: 15, teamMembers: -1, aiCredits: 300, usd: { monthly: 39, yearly: 374 } },
  { key: 'agency', tier: 'ULTIMATE', popular: false, trialDays: 7, channels: 50, teamMembers: -1, aiCredits: 500, usd: { monthly: 79, yearly: 758 } },
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
  };
}

/** How often the pages that show prices re-read the plans, in seconds, so a change in
    Admin → Plans is live within a minute. The page files repeat the number (Next needs a
    literal `revalidate` there). */
export const PLANS_REVALIDATE = 60;

/** Plans for the pricing table, from the app's public GET /instance/settings
    (NEXT_PUBLIC_API_URL), re-read at most every minute (ISR). When the API isn't set, can't
    be reached or has no plans, the table quietly shows the built-in plans and the server
    logs why. */
export async function loadPlans(): Promise<PlanView[]> {
  if (!API_URL) {
    console.warn('[pricing] NEXT_PUBLIC_API_URL is not set; showing the built-in plans');
    return DEFAULT_PLANS;
  }
  try {
    const res = await fetch(`${API_URL}/instance/settings`, {
      next: { revalidate: PLANS_REVALIDATE },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`GET /instance/settings returned ${res.status}`);
    const body: unknown = await res.json();
    const raw = (body as { plans?: unknown })?.plans;
    const plans = Array.isArray(raw) ? raw.filter(isApiPlan).map(fromApi) : [];
    if (!plans.length) throw new Error('GET /instance/settings has no plans');
    return plans;
  } catch (e) {
    console.warn(`[pricing] showing the built-in plans: ${(e as Error).message}`);
    return DEFAULT_PLANS;
  }
}
