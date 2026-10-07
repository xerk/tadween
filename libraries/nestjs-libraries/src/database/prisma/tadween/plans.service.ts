import { HttpException, Injectable } from '@nestjs/common';
import { Plan } from '@prisma/client';
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

// Overlay one DB plan onto the static Postiz entry for its tier. Fields the plan
// does not model (webhooks, autoPost, videos…) keep Postiz's values.
const overlay = (
  base: PricingInnerInterface,
  plan: Plan
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
    const plan = await this._repository.create(body);
    if (plan.mostPopular) {
      await this._repository.clearMostPopular(plan.id);
    }
    this.invalidate();
    return plan;
  }

  async update(id: string, body: PlanDto) {
    if (!(await this._repository.getById(id))) {
      throw new HttpException('Plan not found', 404);
    }
    await this.assertKeyFree(body.key, id);
    await this.assertTierFree(body, id);
    const plan = await this._repository.update(id, body);
    if (plan.mostPopular) {
      await this._repository.clearMostPopular(plan.id);
    }
    this.invalidate();
    return plan;
  }

  async remove(id: string) {
    if (!(await this._repository.getById(id))) {
      throw new HttpException('Plan not found', 404);
    }
    await this._repository.remove(id);
    this.invalidate();
    return { id };
  }

  // Creates the four Tadween plans (placeholder prices) when there are none.
  async seedDefaults() {
    if ((await this._repository.list(false)).length) {
      throw new HttpException(
        'Plans already exist. Edit them instead of loading the defaults.',
        400
      );
    }
    for (const plan of DEFAULT_PLANS) {
      await this._repository.create({ ...plan, active: true });
    }
    this.invalidate();
    return this.listForAdmin();
  }
}
