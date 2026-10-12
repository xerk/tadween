import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { PlanDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.console.dto';
import { SubscriptionTier } from '@prisma/client';

// Only the fields the DTO describes reach the database (ValidationPipe does
// not strip unknown keys).
const toData = (body: PlanDto) => ({
  key: body.key,
  name: body.name,
  description: body.description ?? null,
  tier: body.tier,
  monthlyPriceUsd: body.monthlyPriceUsd,
  yearlyPriceUsd: body.yearlyPriceUsd,
  // undefined leaves the stored value as it is (older clients)
  founderMonthlyPriceUsd: body.founderMonthlyPriceUsd,
  webhooks: body.webhooks,
  trialDays: body.trialDays,
  mostPopular: body.mostPopular,
  channels: body.channels,
  teamMembers: body.teamMembers,
  postsPerMonth: body.postsPerMonth,
  aiCredits: body.aiCredits,
  features: body.features,
  providerPriceIdMonthly: body.providerPriceIdMonthly ?? null,
  providerPriceIdYearly: body.providerPriceIdYearly ?? null,
  active: body.active,
  position: body.position,
});

@Injectable()
export class PlansRepository {
  constructor(
    private _plans: PrismaRepository<'plan'>,
    private _subscriptions: PrismaRepository<'subscription'>,
    private _organizations: PrismaRepository<'organization'>
  ) {}

  // Workspaces whose limits come from this tier (lifetime and cancelling ones
  // included: they keep the tier until it ends).
  countSubscriptions(tier: SubscriptionTier) {
    return this._subscriptions.model.subscription.count({
      where: { subscriptionTier: tier, deletedAt: null },
    });
  }

  list(onlyActive: boolean) {
    return this._plans.model.plan.findMany({
      where: {
        deletedAt: null,
        ...(onlyActive ? { active: true } : {}),
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  getById(id: string) {
    return this._plans.model.plan.findFirst({
      where: { id, deletedAt: null },
    });
  }

  getByKey(key: string) {
    return this._plans.model.plan.findFirst({
      where: { key, deletedAt: null },
    });
  }

  create(body: PlanDto) {
    return this._plans.model.plan.create({
      data: toData(body),
    });
  }

  update(id: string, body: PlanDto) {
    return this._plans.model.plan.update({
      where: { id },
      data: toData(body),
    });
  }

  // Soft delete; the key is freed so a new plan can reuse it.
  remove(id: string) {
    return this._plans.model.plan.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
        key: `deleted-${id}`,
      },
      select: { id: true },
    });
  }

  setYearlyPrice(id: string, yearlyPriceUsd: number) {
    return this._plans.model.plan.update({
      where: { id },
      data: { yearlyPriceUsd },
      select: { id: true },
    });
  }

  // Frees a key for a default plan (PlansService.seedDefaults)
  setKey(id: string, key: string) {
    return this._plans.model.plan.update({
      where: { id },
      data: { key },
      select: { id: true },
    });
  }

  // Founder spots taken since the window started (cancelled founders
  // included: Organization.founderSince is never cleared)
  countFounderSpots(since: Date | null) {
    return this._organizations.model.organization.count({
      where: { founderSince: since ? { gte: since } : { not: null } },
    });
  }

  // The workspace paying through this provider customer takes a founder spot,
  // once (a later subscription of the same workspace keeps the first date)
  claimFounderSpot(customerId: string) {
    return this._organizations.model.organization.updateMany({
      where: { paymentId: customerId, founderSince: null },
      data: { founderSince: new Date() },
    });
  }

  setActive(id: string, active: boolean) {
    return this._plans.model.plan.update({
      where: { id },
      data: { active },
      select: { id: true },
    });
  }

  // Live subscriptions per tier, for the admin's plan list.
  async countSubscriptionsByTier() {
    const rows = await this._subscriptions.model.subscription.groupBy({
      by: ['subscriptionTier'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    return rows.reduce(
      (all, row) => ({ ...all, [row.subscriptionTier]: row._count._all }),
      {} as Record<string, number>
    );
  }

  clearMostPopular(exceptId: string) {
    return this._plans.model.plan.updateMany({
      where: { id: { not: exceptId }, mostPopular: true },
      data: { mostPopular: false },
    });
  }
}
