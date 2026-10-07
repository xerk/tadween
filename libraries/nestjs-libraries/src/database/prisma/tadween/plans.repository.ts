import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { PlanDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.console.dto';

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
      data: body,
    });
  }

  update(id: string, body: PlanDto) {
    return this._plans.model.plan.update({
      where: { id },
      data: body,
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
