import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Read models for the super-admin console. Every query selects only the fields
// the console shows: no passwords, tokens or API keys.
@Injectable()
export class AdminConsoleRepository {
  constructor(
    private _user: PrismaRepository<'user'>,
    private _organization: PrismaRepository<'organization'>,
    private _integration: PrismaRepository<'integration'>,
    private _post: PrismaRepository<'post'>,
    private _subscription: PrismaRepository<'subscription'>
  ) {}

  async overview(now: Date) {
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [
      users,
      inactiveUsers,
      organizations,
      channels,
      disabledChannels,
      refreshNeeded,
      scheduled,
      failed24h,
      published24h,
      tiers,
    ] = await Promise.all([
      this._user.model.user.count({ where: { deletedAt: null } }),
      this._user.model.user.count({
        where: { deletedAt: null, activated: false },
      }),
      this._organization.model.organization.count({
        where: { deletedAt: null },
      }),
      this._integration.model.integration.count({
        where: { deletedAt: null },
      }),
      this._integration.model.integration.count({
        where: { deletedAt: null, disabled: true },
      }),
      this._integration.model.integration.count({
        where: { deletedAt: null, refreshNeeded: true },
      }),
      this._post.model.post.count({
        where: {
          deletedAt: null,
          parentPostId: null,
          state: 'QUEUE',
          publishDate: { gte: now },
        },
      }),
      this._post.model.post.count({
        where: {
          deletedAt: null,
          parentPostId: null,
          state: 'ERROR',
          updatedAt: { gte: dayAgo },
        },
      }),
      this._post.model.post.count({
        where: {
          deletedAt: null,
          parentPostId: null,
          state: 'PUBLISHED',
          publishDate: { gte: dayAgo, lte: now },
        },
      }),
      this._subscription.model.subscription.groupBy({
        by: ['subscriptionTier'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    return {
      users,
      inactiveUsers,
      organizations,
      channels,
      disabledChannels,
      refreshNeeded,
      scheduled,
      failed24h,
      published24h,
      subscriptions: tiers.map((t) => ({
        tier: t.subscriptionTier,
        count: t._count._all,
      })),
    };
  }

  private userWhere(search: string): Prisma.UserWhereInput {
    const q = search.trim();
    return {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { id: q },
              {
                organizations: {
                  some: {
                    organization: { name: { contains: q, mode: 'insensitive' } },
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  async listUsers(search: string, page: number, pageSize: number) {
    const where = this.userWhere(search);
    const [total, users] = await Promise.all([
      this._user.model.user.count({ where }),
      this._user.model.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          providerName: true,
          activated: true,
          isSuperAdmin: true,
          createdAt: true,
          lastOnline: true,
          organizations: {
            where: { organization: { deletedAt: null } },
            select: {
              id: true,
              role: true,
              disabled: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  subscription: {
                    select: {
                      subscriptionTier: true,
                      period: true,
                      isLifetime: true,
                      provider: true,
                      cancelAt: true,
                    },
                  },
                  _count: {
                    select: {
                      Integration: { where: { deletedAt: null } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);
    return { total, users };
  }

  getUserForAdmin(id: string) {
    return this._user.model.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, isSuperAdmin: true, activated: true },
    });
  }

  setActivated(id: string, activated: boolean) {
    return this._user.model.user.update({
      where: { id },
      data: { activated },
      select: { id: true, activated: true },
    });
  }

  getOrgForAdmin(id: string) {
    return this._organization.model.organization.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        paymentId: true,
        subscription: {
          select: { subscriptionTier: true, provider: true, isLifetime: true },
        },
        users: {
          where: { role: 'SUPERADMIN' },
          select: { userId: true },
          take: 1,
        },
      },
    });
  }
}
