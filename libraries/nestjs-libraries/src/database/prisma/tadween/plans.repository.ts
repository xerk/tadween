import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { PlanDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.console.dto';

// Only the fields the DTO describes reach the database (ValidationPipe does
// not strip unknown keys).
const toData = (body: PlanDto) => ({
  key: body.key,
  name: body.name,
  description: body.description ?? null,
  tier: body.tier,
  monthlyPriceUsd: body.monthlyPriceUsd,
  yearlyPriceUsd: body.yearlyPriceUsd,
  monthlyPriceEgp: body.monthlyPriceEgp,
  yearlyPriceEgp: body.yearlyPriceEgp,
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
  constructor(private _plans: PrismaRepository<'plan'>) {}

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

  clearMostPopular(exceptId: string) {
    return this._plans.model.plan.updateMany({
      where: { id: { not: exceptId }, mostPopular: true },
      data: { mostPopular: false },
    });
  }
}
