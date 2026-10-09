import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AdminOrganizationsQueryDto,
  AdminUsersQueryDto,
} from '@gitroom/nestjs-libraries/dtos/tadween/admin.list.dto';

// What the console shows of a user: no password, tokens or API keys.
const USER_SELECT = {
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
    where: { organization: { deletedAt: null as Date | null } },
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
              deletedAt: true,
            },
          },
          _count: {
            select: {
              Integration: { where: { deletedAt: null as Date | null } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

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

  private userWhere(query: AdminUsersQueryDto): Prisma.UserWhereInput {
    const q = (query.search || '').trim();
    return {
      deletedAt: null,
      ...(query.status ? { activated: query.status === 'active' } : {}),
      ...(query.role ? { isSuperAdmin: query.role === 'superadmin' } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
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

  async listUsers(
    query: AdminUsersQueryDto,
    orderBy: Prisma.UserOrderByWithRelationInput[],
    skip: number,
    take: number
  ) {
    const where = this.userWhere(query);
    const [total, users] = await Promise.all([
      this._user.model.user.count({ where }),
      this._user.model.user.findMany({
        where,
        orderBy,
        skip,
        take,
        select: USER_SELECT,
      }),
    ]);
    return { total, users };
  }

  // ── Organizations (subscribers) ────────────────────────────────────────────
  // Subscription status is derived from what Postiz stores, in this order:
  // no live row → none, isLifetime → lifetime, cancelAt → cancelled,
  // Organization.isTrailing → trialing, otherwise active.
  private organizationWhere(
    query: AdminOrganizationsQueryDto
  ): Prisma.OrganizationWhereInput {
    const q = (query.search || '').trim();
    const live = { deletedAt: null as Date | null, isLifetime: false };
    const and: Prisma.OrganizationWhereInput[] = [{ deletedAt: null }];
    const none: Prisma.OrganizationWhereInput = {
      OR: [
        { subscription: { is: null } },
        { subscription: { is: { deletedAt: { not: null } } } },
      ],
    };

    switch (query.status) {
      case 'none':
        and.push(none);
        break;
      case 'lifetime':
        and.push({ subscription: { is: { deletedAt: null, isLifetime: true } } });
        break;
      case 'cancelled':
        and.push({ subscription: { is: { ...live, cancelAt: { not: null } } } });
        break;
      case 'trialing':
        and.push({
          isTrailing: true,
          subscription: { is: { ...live, cancelAt: null } },
        });
        break;
      case 'active':
        and.push({
          isTrailing: false,
          subscription: { is: { ...live, cancelAt: null } },
        });
        break;
    }

    if (query.tier === 'NONE') {
      and.push(none);
    } else if (query.tier) {
      and.push({
        subscription: {
          is: { deletedAt: null, subscriptionTier: query.tier },
        },
      });
    }

    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { id: q },
          { paymentId: q },
          {
            users: {
              some: { user: { email: { contains: q, mode: 'insensitive' } } },
            },
          },
        ],
      });
    }
    return { AND: and };
  }

  async listOrganizations(
    query: AdminOrganizationsQueryDto,
    orderBy: Prisma.OrganizationOrderByWithRelationInput[],
    skip: number,
    take: number
  ) {
    const where = this.organizationWhere(query);
    const [total, organizations] = await Promise.all([
      this._organization.model.organization.count({ where }),
      this._organization.model.organization.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          name: true,
          createdAt: true,
          paymentId: true,
          isTrailing: true,
          allowTrial: true,
          subscription: {
            select: {
              subscriptionTier: true,
              period: true,
              isLifetime: true,
              provider: true,
              identifier: true,
              cancelAt: true,
              totalChannels: true,
              createdAt: true,
              deletedAt: true,
            },
          },
          users: {
            where: { role: 'SUPERADMIN' },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: {
              id: true,
              user: { select: { id: true, email: true, name: true } },
            },
          },
          _count: {
            select: {
              Integration: { where: { deletedAt: null } },
              users: { where: { disabled: false } },
            },
          },
        },
      }),
    ]);
    return { total, organizations };
  }

  // Detail drawer: members, channels (no tokens) and post counts.
  async getOrganizationDetail(id: string, now: Date) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const organization = await this._organization.model.organization.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        createdAt: true,
        paymentId: true,
        isTrailing: true,
        allowTrial: true,
        subscription: {
          select: {
            subscriptionTier: true,
            period: true,
            isLifetime: true,
            provider: true,
            identifier: true,
            cancelAt: true,
            totalChannels: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
          },
        },
        users: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            disabled: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                lastName: true,
                activated: true,
                isSuperAdmin: true,
                lastOnline: true,
              },
            },
          },
        },
        Integration: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            providerIdentifier: true,
            picture: true,
            disabled: true,
            refreshNeeded: true,
            inBetweenSteps: true,
            createdAt: true,
          },
        },
      },
    });
    if (!organization) {
      return null;
    }

    const posts = (where: Prisma.PostWhereInput) =>
      this._post.model.post.count({
        where: {
          organizationId: id,
          deletedAt: null,
          parentPostId: null,
          ...where,
        },
      });
    const [publishedMonth, publishedTotal, scheduled, failed30d] =
      await Promise.all([
        posts({ state: 'PUBLISHED', publishDate: { gte: monthStart } }),
        posts({ state: 'PUBLISHED' }),
        posts({ state: 'QUEUE', publishDate: { gte: now } }),
        posts({ state: 'ERROR', updatedAt: { gte: monthAgo } }),
      ]);

    return {
      ...organization,
      usage: { publishedMonth, publishedTotal, scheduled, failed30d },
    };
  }

  getUser(id: string) {
    return this._user.model.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });
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
