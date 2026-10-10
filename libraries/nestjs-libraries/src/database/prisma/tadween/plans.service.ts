import { HttpException, Injectable } from '@nestjs/common';
import { Plan, SubscriptionTier } from '@prisma/client';
import { PlansRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.repository';
import { PlanDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.console.dto';
import {
  pricing,
  PricingInnerInterface,
  PricingInterface,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { DEFAULT_PLANS } from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';

const TTL_MS = 15_000;
const UNLIMITED = 1000000;

// A plan as the pricing page and billing see it (no provider price ids).
export interface PublicPlan {
  key: string;
  name: string;
  description: string | null;
  tier: string;
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

type PlanLimits = Pick<
  Plan,
  'monthlyPriceUsd' | 'yearlyPriceUsd' | 'channels' | 'teamMembers' | 'postsPerMonth' | 'aiCredits'
>;

// Overlay one DB plan onto the static Postiz entry for its tier. Fields the plan
// does not model (webhooks, autoPost, videos…) keep Postiz's values.
const overlay = (
  base: PricingInnerInterface,
  plan: PlanLimits
): PricingInnerInterface => ({
  ...base,
  month_price: plan.monthlyPriceUsd,
  year_price: plan.yearlyPriceUsd,
  channel: plan.channels,
  team_members: plan.teamMembers !== 0,
  posts_per_month: plan.postsPerMonth < 0 ? UNLIMITED : plan.postsPerMonth,
  ai: plan.aiCredits !== 0,
  image_generation_count:
    plan.aiCredits < 0 ? UNLIMITED : plan.aiCredits,
});

// The entitlements a plan overlays, and how to tell that one is lower.
const LIMITS: Array<{
  label: string;
  lower: (next: PricingInnerInterface, now: PricingInnerInterface) => boolean;
}> = [
  { label: 'channels', lower: (n, c) => (n.channel ?? 0) < (c.channel ?? 0) },
  { label: 'team members', lower: (n, c) => c.team_members && !n.team_members },
  { label: 'posts per month', lower: (n, c) => n.posts_per_month < c.posts_per_month },
  { label: 'AI', lower: (n, c) => c.ai && !n.ai },
  {
    label: 'AI credits',
    lower: (n, c) => n.image_generation_count < c.image_generation_count,
  },
];

@Injectable()
export class PlansService {
  private _cache: { at: number; plans: Plan[] } | null = null;

  constructor(private _repository: PlansRepository) {}

  private async activePlans(): Promise<Plan[]> {
    if (this._cache && Date.now() - this._cache.at < TTL_MS) {
      return this._cache.plans;
    }
    try {
      const plans = await this._repository.list(true);
      this._cache = { at: Date.now(), plans };
      return plans;
    } catch (e) {
      // Table not pushed yet: Postiz's static pricing.
      return [];
    }
  }

  private invalidate() {
    this._cache = null;
  }

  // The pricing map every consumer used to import statically, with active DB
  // plans overlaid per tier. No plans → exactly the static map.
  async getPricing(): Promise<PricingInterface> {
    const plans = await this.activePlans();
    return Object.keys(pricing).reduce((all, tier) => {
      const plan = plans.find((p) => p.tier === tier);
      return {
        ...all,
        [tier]: plan ? overlay(pricing[tier], plan) : pricing[tier],
      };
    }, {} as PricingInterface);
  }

  async getPublicPlans(): Promise<PublicPlan[]> {
    return (await this.activePlans()).map((p) => ({
      key: p.key,
      name: p.name,
      description: p.description,
      tier: p.tier,
      monthlyPriceUsd: p.monthlyPriceUsd,
      yearlyPriceUsd: p.yearlyPriceUsd,
      trialDays: p.trialDays,
      mostPopular: p.mostPopular,
      channels: p.channels,
      teamMembers: p.teamMembers,
      postsPerMonth: p.postsPerMonth,
      aiCredits: p.aiCredits,
      features: Array.isArray(p.features) ? (p.features as string[]) : [],
    }));
  }

  listForAdmin() {
    return this._repository.list(false);
  }

  // Paying workspaces must never lose limits because of a plan change: their
  // tier's limits apply to them at once (team members, AI) or at the next Stripe
  // renewal (channels). Refuse any change that would make the effective limits
  // of a tier lower while subscriptions exist on it. Raising is always allowed.
  private async assertNoLowerLimits(
    tier: SubscriptionTier,
    next: PricingInnerInterface
  ) {
    const current = (await this._repository.list(true)).find(
      (p) => p.tier === tier
    );
    const now = current ? overlay(pricing[tier], current) : pricing[tier];
    const lowered = LIMITS.filter((l) => l.lower(next, now)).map((l) => l.label);
    if (!lowered.length) {
      return;
    }
    const paying = await this._repository.countSubscriptions(tier);
    if (!paying) {
      return;
    }
    throw new HttpException(
      `This would lower ${lowered.join(', ')} for ${paying} workspace${
        paying === 1 ? '' : 's'
      } already subscribed to the ${tier} tier. Existing subscribers keep their limits: keep the values at least at today's, or sell the smaller plan on a tier nobody is subscribed to.`,
      400
    );
  }

  // Checkout is keyed by Postiz tier, so only one active plan may sell a tier.
  private async assertTierFree(body: PlanDto, id?: string) {
    if (!body.active) {
      return;
    }
    const clash = (await this._repository.list(true)).find(
      (p) => p.tier === body.tier && p.id !== id
    );
    if (clash) {
      throw new HttpException(
        `${clash.name} already uses the ${body.tier} tier. Deactivate it or pick another tier.`,
        400
      );
    }
  }

  private async assertKeyFree(key: string, id?: string) {
    const existing = await this._repository.getByKey(key);
    if (existing && existing.id !== id) {
      throw new HttpException(`A plan with the key "${key}" already exists.`, 400);
    }
  }

  async create(body: PlanDto) {
    await this.assertKeyFree(body.key);
    await this.assertTierFree(body);
    if (body.active) {
      await this.assertNoLowerLimits(body.tier, overlay(pricing[body.tier], body));
    }
    const plan = await this._repository.create(body);
    if (plan.mostPopular) {
      await this._repository.clearMostPopular(plan.id);
    }
    this.invalidate();
    return plan;
  }

  async update(id: string, body: PlanDto) {
    const existing = await this._repository.getById(id);
    if (!existing) {
      throw new HttpException('Plan not found', 404);
    }
    await this.assertKeyFree(body.key, id);
    await this.assertTierFree(body, id);
    // Hiding the plan or moving it to another tier hands its old tier back to
    // Postiz's static limits
    if (existing.active && (!body.active || existing.tier !== body.tier)) {
      await this.assertNoLowerLimits(existing.tier, pricing[existing.tier]);
    }
    if (body.active) {
      await this.assertNoLowerLimits(body.tier, overlay(pricing[body.tier], body));
    }
    const plan = await this._repository.update(id, body);
    if (plan.mostPopular) {
      await this._repository.clearMostPopular(plan.id);
    }
    this.invalidate();
    return plan;
  }

  async remove(id: string) {
    const existing = await this._repository.getById(id);
    if (!existing) {
      throw new HttpException('Plan not found', 404);
    }
    if (existing.active) {
      await this.assertNoLowerLimits(existing.tier, pricing[existing.tier]);
    }
    await this._repository.remove(id);
    this.invalidate();
    return { id };
  }

  // Creates the four Tadween plans (placeholder prices) when there are none.
  // Their limits equal Postiz's for each tier, so this never lowers what paying
  // workspaces have; the check below keeps it that way if the defaults change.
  async seedDefaults() {
    if ((await this._repository.list(false)).length) {
      throw new HttpException(
        'Plans already exist. Edit them instead of loading the defaults.',
        400
      );
    }
    for (const plan of DEFAULT_PLANS) {
      await this.assertNoLowerLimits(plan.tier, overlay(pricing[plan.tier], plan));
    }
    for (const plan of DEFAULT_PLANS) {
      await this._repository.create({ ...plan, active: true });
    }
    this.invalidate();
    return this.listForAdmin();
  }
}
