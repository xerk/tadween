import { HttpException, Injectable } from '@nestjs/common';
import { Plan, SubscriptionTier } from '@prisma/client';
import { PlansRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.repository';
import { PlanDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.console.dto';
import {
  pricing,
  PricingInnerInterface,
  PricingInterface,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import {
  DEFAULT_PLANS,
  DEFAULT_YEARLY_DISCOUNT_PERCENT,
  FeatureKey,
} from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';

const TTL_MS = 15_000;
const UNLIMITED = 1000000;

// One generated line of a plan's feature list. `key` is translated by the app
// (tdw_plan_feature_<key>); `value` is the number it shows (-1 = unlimited).
export interface PlanFeatureItem {
  key: string;
  value?: number;
}

// The founder offer as the pricing page shows it
export interface FounderOffer {
  open: boolean;
  cap: number;
  spotsLeft: number;
  endsAt: string | null;
}

// A plan as the pricing page and billing see it (no provider price ids).
export interface PublicPlan {
  key: string;
  name: string;
  description: string | null;
  tier: string;
  // What checkout charges today: the founder price while the founder window
  // is open, else the list price
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  // The regular price, charged once the founder window closes
  listMonthlyPriceUsd: number;
  listYearlyPriceUsd: number;
  // The founder price (null: no founder offer on this plan)
  founderMonthlyPriceUsd: number | null;
  founderYearlyPriceUsd: number | null;
  // true while the founder price is what checkout charges
  founderPrice: boolean;
  trialDays: number;
  mostPopular: boolean;
  channels: number;
  teamMembers: number;
  postsPerMonth: number;
  aiCredits: number;
  // Generated from the plan's limits, in a fixed order so plans compare line
  // by line; `features` is the same list in English plus the admin's extras.
  featureItems: PlanFeatureItem[];
  extraFeatures: string[];
  features: string[];
  yearlyDiscountPercent: number;
}

// Yearly price = 12 months minus the discount, in whole dollars.
export const yearlyPriceFrom = (monthly: number, discountPercent: number) =>
  Math.round(monthly * 12 * (1 - discountPercent / 100));

const featureText = (item: PlanFeatureItem) => {
  const n = item.value ?? 0;
  const count = (one: string, many: string) =>
    n < 0 ? `Unlimited ${many}` : `${n} ${n === 1 ? one : many}`;
  switch (item.key) {
    case 'channels':
      return count('channel', 'channels');
    case 'posts':
      return `${count('post', 'posts')} per month`;
    case 'team':
      return count('team member', 'team members');
    case 'ai_writing':
      return 'AI auto-complete and copilots';
    case 'ai_images':
      return `${count('AI image', 'AI images')} per month`;
    case 'picture_editor':
      return 'Advanced picture editor';
    case 'autopost':
      return 'RSS auto-post';
    case 'public_api':
      return 'Public API, MCP and AI agents';
    case 'webhooks':
      return count('webhook', 'webhooks');
    default:
      return item.key;
  }
};

// The list a plan's card shows: only what the app enforces for the plan (its
// overlaid tier values) and what the instance has switched on in /admin.
const featureItemsFor = (
  plan: Plan,
  values: PricingInnerInterface,
  on: Record<FeatureKey, boolean>
): PlanFeatureItem[] => {
  const items: PlanFeatureItem[] = [
    { key: 'channels', value: plan.channels },
    { key: 'posts', value: plan.postsPerMonth },
  ];
  if (plan.teamMembers !== 0) {
    items.push({ key: 'team', value: plan.teamMembers });
  }
  if (values.ai && on.ai) {
    items.push({ key: 'ai_writing' });
    if (values.image_generator) {
      items.push({ key: 'ai_images', value: plan.aiCredits });
    }
  }
  if (on.media) {
    items.push({ key: 'picture_editor' });
  }
  if (values.autoPost && on.autopost) {
    items.push({ key: 'autopost' });
  }
  if (values.public_api && on.publicApi) {
    items.push({ key: 'public_api' });
  }
  if (values.webhooks && on.webhooks) {
    items.push({ key: 'webhooks', value: values.webhooks >= 10000 ? -1 : values.webhooks });
  }
  return items;
};

type PlanLimits = Pick<
  Plan,
  'monthlyPriceUsd' | 'yearlyPriceUsd' | 'channels' | 'teamMembers' | 'postsPerMonth' | 'aiCredits'
> & { webhooks?: number | null };

// Overlay one DB plan onto the static Postiz entry for its tier. Fields the plan
// does not model (videos, clipping…) keep Postiz's values. Every Tadween plan
// has RSS auto-post, and AI images whenever it has AI credits.
const overlay = (
  base: PricingInnerInterface,
  plan: PlanLimits
): PricingInnerInterface => ({
  ...base,
  month_price: plan.monthlyPriceUsd,
  year_price: plan.yearlyPriceUsd,
  channel: plan.channels,
  team_members: plan.teamMembers !== 0,
  team_members_count: plan.teamMembers,
  posts_per_month: plan.postsPerMonth < 0 ? UNLIMITED : plan.postsPerMonth,
  ai: plan.aiCredits !== 0,
  image_generator: plan.aiCredits !== 0,
  image_generation_count:
    plan.aiCredits < 0 ? UNLIMITED : plan.aiCredits,
  autoPost: true,
  webhooks:
    plan.webhooks === undefined || plan.webhooks === null
      ? base.webhooks
      : plan.webhooks < 0
      ? UNLIMITED
      : plan.webhooks,
});

// The founder price when the window is open and the plan has one below its
// list price, else the list price
const chargedMonthly = (
  plan: Pick<Plan, 'monthlyPriceUsd' | 'founderMonthlyPriceUsd'>,
  founderOpen: boolean
) =>
  founderOpen &&
  plan.founderMonthlyPriceUsd !== null &&
  plan.founderMonthlyPriceUsd < plan.monthlyPriceUsd
    ? plan.founderMonthlyPriceUsd
    : plan.monthlyPriceUsd;

// Members besides the owner a tier allows (Infinity = unlimited).
export const teamSeats = (v: PricingInnerInterface) =>
  !v.team_members
    ? 0
    : v.team_members_count === undefined || v.team_members_count < 0
    ? Infinity
    : v.team_members_count;

// The entitlements a plan overlays, and how to tell that one is lower.
const LIMITS: Array<{
  label: string;
  lower: (next: PricingInnerInterface, now: PricingInnerInterface) => boolean;
}> = [
  { label: 'channels', lower: (n, c) => (n.channel ?? 0) < (c.channel ?? 0) },
  {
    label: 'team members',
    lower: (n, c) => teamSeats(n) < teamSeats(c),
  },
  { label: 'posts per month', lower: (n, c) => n.posts_per_month < c.posts_per_month },
  { label: 'AI', lower: (n, c) => c.ai && !n.ai },
  {
    label: 'AI credits',
    lower: (n, c) => n.image_generation_count < c.image_generation_count,
  },
  { label: 'webhooks', lower: (n, c) => n.webhooks < c.webhooks },
];

@Injectable()
export class PlansService {
  private _cache: { at: number; plans: Plan[] } | null = null;
  private _founderCache: { at: number; offer: FounderOffer } | null = null;

  constructor(
    private _repository: PlansRepository,
    private _settings: PlatformSettingsService
  ) {}

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
    this._founderCache = null;
  }

  // Whether checkout charges founder prices now: the window has a cap, has
  // not ended, and fewer paying workspaces than the cap subscribed in it. The
  // count comes from the database (Subscription.status from Stripe webhooks).
  async getFounderOffer(): Promise<FounderOffer> {
    if (this._founderCache && Date.now() - this._founderCache.at < TTL_MS) {
      return this._founderCache.offer;
    }
    const window = await this._settings.getFounderWindow();
    let paying = 0;
    try {
      paying = await this._repository.countPayingSubscriptions(
        window.startsAt ? new Date(window.startsAt) : null
      );
    } catch (e) {
      // Columns not pushed yet: no founder offer rather than a broken checkout
      paying = window.cap;
    }
    const spotsLeft = Math.max(0, window.cap - paying);
    const offer: FounderOffer = {
      open:
        spotsLeft > 0 &&
        (!window.endsAt || Date.now() < new Date(window.endsAt).getTime()),
      cap: window.cap,
      spotsLeft,
      endsAt: window.endsAt,
    };
    this._founderCache = { at: Date.now(), offer };
    return offer;
  }

  // The pricing map every consumer used to import statically, with active DB
  // plans overlaid per tier. No plans → exactly the static map. Prices are
  // what checkout charges now (founder prices while the window is open).
  async getPricing(): Promise<PricingInterface> {
    const plans = await this.activePlans();
    const [founder, discount] = plans.some(
      (p) => p.founderMonthlyPriceUsd !== null
    )
      ? await Promise.all([
          this.getFounderOffer(),
          this._settings.getYearlyDiscountPercent(),
        ])
      : [null, 0];
    return Object.keys(pricing).reduce((all, tier) => {
      const plan = plans.find((p) => p.tier === tier);
      if (!plan) {
        return { ...all, [tier]: pricing[tier] };
      }
      const monthly = chargedMonthly(plan, !!founder?.open);
      return {
        ...all,
        [tier]: overlay(pricing[tier], {
          ...plan,
          monthlyPriceUsd: monthly,
          yearlyPriceUsd:
            monthly === plan.monthlyPriceUsd
              ? plan.yearlyPriceUsd
              : yearlyPriceFrom(monthly, discount),
        }),
      };
    }, {} as PricingInterface);
  }

  async getPublicPlans(): Promise<PublicPlan[]> {
    const [plans, pricingMap, on, yearlyDiscountPercent, founder] =
      await Promise.all([
        this.activePlans(),
        this.getPricing(),
        this._settings.getFeatures(),
        this._settings.getYearlyDiscountPercent(),
        this.getFounderOffer(),
      ]);
    return plans.map((p) => {
      const featureItems = featureItemsFor(p, pricingMap[p.tier], on);
      const extraFeatures = Array.isArray(p.features)
        ? (p.features as string[])
        : [];
      const hasFounder =
        p.founderMonthlyPriceUsd !== null &&
        p.founderMonthlyPriceUsd < p.monthlyPriceUsd;
      return {
        key: p.key,
        name: p.name,
        description: p.description,
        tier: p.tier,
        monthlyPriceUsd: pricingMap[p.tier].month_price,
        yearlyPriceUsd: pricingMap[p.tier].year_price,
        listMonthlyPriceUsd: p.monthlyPriceUsd,
        listYearlyPriceUsd: p.yearlyPriceUsd,
        founderMonthlyPriceUsd: hasFounder ? p.founderMonthlyPriceUsd : null,
        founderYearlyPriceUsd: hasFounder
          ? yearlyPriceFrom(p.founderMonthlyPriceUsd!, yearlyDiscountPercent)
          : null,
        founderPrice: hasFounder && founder.open,
        trialDays: p.trialDays,
        mostPopular: p.mostPopular,
        channels: p.channels,
        teamMembers: p.teamMembers,
        postsPerMonth: p.postsPerMonth,
        aiCredits: p.aiCredits,
        featureItems,
        extraFeatures,
        features: [...featureItems.map(featureText), ...extraFeatures],
        yearlyDiscountPercent,
      };
    });
  }

  // What customers see for a tier (Stripe product name): the plan's name
  async getPlanName(tier: string) {
    const plan = (await this.activePlans()).find((p) => p.tier === tier);
    return plan?.name || tier.charAt(0) + tier.slice(1).toLowerCase();
  }

  // The active plan selling a tier (none: the tier is not for sale)
  async getActivePlan(tier: string) {
    return (await this.activePlans()).find((p) => p.tier === tier);
  }

  // Free trial length for a tier's checkout: the plan's, else Postiz's 7 days.
  async getTrialDays(tier: string) {
    const plan = (await this.activePlans()).find((p) => p.tier === tier);
    return plan ? plan.trialDays : 7;
  }

  async listForAdmin() {
    return {
      plans: await this._repository.list(false),
      yearlyDiscountPercent: await this._settings.getYearlyDiscountPercent(),
      subscribers: await this._repository.countSubscriptionsByTier(),
      founderWindow: await this._settings.getFounderWindow(),
      founder: await this.getFounderOffer(),
    };
  }

  async setFounderWindow(
    founder: { cap: number; startsAt?: string | null; endsAt?: string | null },
    userId: string
  ) {
    await this._settings.setFounderWindow(
      {
        cap: founder.cap,
        startsAt: founder.startsAt || null,
        endsAt: founder.endsAt || null,
      },
      userId
    );
    this.invalidate();
    return this.listForAdmin();
  }

  // The yearly price is never typed: it follows the monthly price and the
  // instance's yearly discount.
  private async withYearlyPrice(
    body: PlanDto
  ): Promise<PlanDto & { yearlyPriceUsd: number }> {
    return {
      ...body,
      yearlyPriceUsd: yearlyPriceFrom(
        body.monthlyPriceUsd,
        await this._settings.getYearlyDiscountPercent()
      ),
    };
  }

  // Saving the discount reprices every plan's yearly price. Stripe Prices are
  // matched by amount at checkout, so new checkouts get a new Price and
  // existing subscriptions keep the one they pay.
  async setYearlyDiscount(percent: number, userId: string) {
    await this._settings.setYearlyDiscountPercent(percent, userId);
    for (const plan of await this._repository.list(false)) {
      await this._repository.setYearlyPrice(
        plan.id,
        yearlyPriceFrom(plan.monthlyPriceUsd, percent)
      );
    }
    this.invalidate();
    return this.listForAdmin();
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

  async create(input: PlanDto) {
    const body = await this.withYearlyPrice(input);
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

  async update(id: string, input: PlanDto) {
    const body = await this.withYearlyPrice(input);
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

  // Loads the default plans and the default yearly discount. Each default
  // takes over the active plan already selling its tier (so its subscribers
  // keep one continuous plan), else the plan with its key, else it is
  // created. Keys move with it: a plan that holds a default's key but is not
  // its target is renamed to "<key>-old". Other active plans are hidden,
  // except on tiers with subscribers (they stay, with a warning). The
  // lower-limits guard applies to every change, so paying workspaces never
  // lose anything.
  async seedDefaults(userId: string) {
    const warnings: string[] = [];
    await this._settings.setYearlyDiscountPercent(
      DEFAULT_YEARLY_DISCOUNT_PERCENT,
      userId
    );
    const discount = DEFAULT_YEARLY_DISCOUNT_PERCENT;
    const existing = await this._repository.list(false);

    const targets = DEFAULT_PLANS.map((plan) => ({
      plan,
      current:
        existing.find((p) => p.active && p.tier === plan.tier) ||
        existing.find((p) => p.key === plan.key),
    }));
    const targetIds = targets.map((t) => t.current?.id).filter(Boolean);

    for (const plan of existing.filter(
      (p) => p.active && !targetIds.includes(p.id)
    )) {
      const paying = await this._repository.countSubscriptions(plan.tier);
      if (paying) {
        warnings.push(
          `${plan.name} stays visible: ${paying} workspace${
            paying === 1 ? ' is' : 's are'
          } subscribed to its ${plan.tier} tier.`
        );
        continue;
      }
      await this._repository.setActive(plan.id, false);
      this.invalidate();
    }

    // Free the default keys first: a target can hold another default's key
    // (the old Business plan sells PRO, which Agency takes over)
    const taken = new Set(existing.map((p) => p.key));
    for (const { plan, current } of targets) {
      const holder = existing.find(
        (p) => p.key === plan.key && p.id !== current?.id
      );
      if (!holder) {
        continue;
      }
      let key = `${plan.key}-old`;
      for (let n = 2; taken.has(key); n++) {
        key = `${plan.key}-old-${n}`;
      }
      taken.add(key);
      await this._repository.setKey(holder.id, key);
      holder.key = key;
    }

    for (const { plan, current } of targets) {
      const body: PlanDto = {
        ...plan,
        yearlyPriceUsd: yearlyPriceFrom(plan.monthlyPriceUsd, discount),
        active: true,
      };
      try {
        if (current) {
          await this.update(current.id, body);
        } else {
          await this.create(body);
        }
      } catch (e) {
        warnings.push(
          `${plan.name} was not ${current ? 'updated' : 'added'}: ${
            e instanceof HttpException ? e.message : 'unexpected error'
          }`
        );
      }
    }
    this.invalidate();
    return { ...(await this.listForAdmin()), warnings };
  }
}
