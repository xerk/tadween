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
  usd: { monthly: number; yearly: number };
  /** Null when the API returns a plan this site has no EGP placeholder for. */
  egp: { monthly: number; yearly: number } | null;
}

export interface PlansResult {
  plans: PlanView[];
  source: 'api' | 'static';
}

/* Placeholder prices, the same as the seeded Tadween plans in the app
   (tadween.defaults.ts): yearly is 20% off twelve months. Not final.
   Channels equal Postiz's limits per tier, like the seeded plans. */
export const DEFAULT_PLANS: PlanView[] = [
  { key: 'creator', popular: false, trialDays: 7, channels: 5, usd: { monthly: 9, yearly: 86 }, egp: { monthly: 299, yearly: 2868 } },
  { key: 'pro', popular: false, trialDays: 7, channels: 10, usd: { monthly: 19, yearly: 182 }, egp: { monthly: 599, yearly: 5748 } },
  { key: 'team', popular: true, trialDays: 7, channels: 30, usd: { monthly: 39, yearly: 374 }, egp: { monthly: 1199, yearly: 11508 } },
  { key: 'agency', popular: false, trialDays: 7, channels: 100, usd: { monthly: 79, yearly: 758 }, egp: { monthly: 2499, yearly: 23988 } },
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
}

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
    usd: { monthly: p.monthlyPriceUsd, yearly: p.yearlyPriceUsd ?? p.monthlyPriceUsd * 12 },
    // The public endpoint has no EGP prices yet, so EGP stays a placeholder.
    egp: fallback?.egp ?? null,
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
