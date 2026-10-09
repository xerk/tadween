import { HttpException, Injectable } from '@nestjs/common';
import { AdminConsoleRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/admin-console.repository';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { PaymentService } from '@gitroom/nestjs-libraries/services/payment/payment.service';
import { PlansService } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.service';
import {
  AdminListQueryDto,
  AdminOrganizationsQueryDto,
  AdminUsersQueryDto,
  OrganizationStatus,
} from '@gitroom/nestjs-libraries/dtos/tadween/admin.list.dto';
import { Prisma } from '@prisma/client';

const PAGE_SIZE = 20;

// Sortable columns per list. Anything else falls back to the first entry.
const USER_SORT: Record<
  string,
  (order: Prisma.SortOrder) => Prisma.UserOrderByWithRelationInput
> = {
  createdAt: (order) => ({ createdAt: order }),
  lastOnline: (order) => ({ lastOnline: order }),
  email: (order) => ({ email: order }),
  name: (order) => ({ name: order }),
};

const ORGANIZATION_SORT: Record<
  string,
  (order: Prisma.SortOrder) => Prisma.OrganizationOrderByWithRelationInput
> = {
  createdAt: (order) => ({ createdAt: order }),
  name: (order) => ({ name: order }),
  tier: (order) => ({ subscription: { subscriptionTier: order } }),
  cancelAt: (order) => ({ subscription: { cancelAt: order } }),
  channels: (order) => ({ Integration: { _count: order } }),
  members: (order) => ({ users: { _count: order } }),
};

const paging = (query: AdminListQueryDto) => {
  const page = Math.max(0, query.page || 0);
  const pageSize = Math.min(100, Math.max(1, query.pageSize || PAGE_SIZE));
  return { page, pageSize, skip: page * pageSize };
};

// Whitelisted sort + a stable tie-breaker on id so pages never overlap.
const sorting = <T>(
  map: Record<string, (order: Prisma.SortOrder) => T>,
  query: AdminListQueryDto
): T[] => {
  const known =
    !!query.sort && Object.prototype.hasOwnProperty.call(map, query.sort);
  const key = known ? query.sort! : Object.keys(map)[0];
  const order: Prisma.SortOrder = query.order || (known ? 'asc' : 'desc');
  return [map[key](order), { id: 'asc' } as T];
};

const subscriptionStatus = (org: {
  isTrailing: boolean;
  subscription: {
    isLifetime: boolean;
    cancelAt: Date | null;
    deletedAt: Date | null;
  } | null;
}): OrganizationStatus => {
  const sub = org.subscription;
  if (!sub || sub.deletedAt) {
    return 'none';
  }
  if (sub.isLifetime) {
    return 'lifetime';
  }
  if (sub.cancelAt) {
    return 'cancelled';
  }
  return org.isTrailing ? 'trialing' : 'active';
};

@Injectable()
export class AdminConsoleService {
  constructor(
    private _repository: AdminConsoleRepository,
    private _subscriptionService: SubscriptionService,
    private _paymentService: PaymentService,
    private _plans: PlansService
  ) {}

  overview() {
    return this._repository.overview(new Date());
  }

  async listUsers(query: AdminUsersQueryDto) {
    const { page, pageSize, skip } = paging(query);
    const { total, users } = await this._repository.listUsers(
      query,
      sorting(USER_SORT, query),
      skip,
      pageSize
    );
    return {
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      items: users,
    };
  }

  async getUser(id: string) {
    const user = await this._repository.getUser(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    return user;
  }

  // Limits come from the Tadween plan selling the tier (Plan.channels /
  // teamMembers, -1 = unlimited); a subscription's own totalChannels wins for
  // channels because that is what Postiz enforces.
  private async limits() {
    const plans = await this._plans.getPublicPlans();
    return (tier: string | undefined, totalChannels: number | undefined) => {
      const plan = tier ? plans.find((p) => p.tier === tier) : undefined;
      return {
        planName: plan?.name || null,
        channels: totalChannels ?? plan?.channels ?? null,
        members: plan ? plan.teamMembers : null,
      };
    };
  }

  async listOrganizations(query: AdminOrganizationsQueryDto) {
    const { page, pageSize, skip } = paging(query);
    const [{ total, organizations }, limitsFor] = await Promise.all([
      this._repository.listOrganizations(
        query,
        sorting(ORGANIZATION_SORT, query),
        skip,
        pageSize
      ),
      this.limits(),
    ]);
    return {
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      items: organizations.map(({ users, _count, ...org }) => {
        const live =
          org.subscription && !org.subscription.deletedAt
            ? org.subscription
            : null;
        return {
          ...org,
          status: subscriptionStatus(org),
          tier: live?.subscriptionTier || null,
          owner: users[0]
            ? { membershipId: users[0].id, ...users[0].user }
            : null,
          usage: { channels: _count.Integration, members: _count.users },
          limits: limitsFor(live?.subscriptionTier, live?.totalChannels),
        };
      }),
    };
  }

  async organizationDetail(id: string) {
    const [org, limitsFor] = await Promise.all([
      this._repository.getOrganizationDetail(id, new Date()),
      this.limits(),
    ]);
    if (!org) {
      throw new HttpException('Workspace not found', 404);
    }
    const live =
      org.subscription && !org.subscription.deletedAt ? org.subscription : null;
    return {
      ...org,
      status: subscriptionStatus(org),
      tier: live?.subscriptionTier || null,
      limits: limitsFor(live?.subscriptionTier, live?.totalChannels),
    };
  }

  // Deactivating signs the user out on their next request (the auth middleware
  // re-reads `activated`). Admins can't lock themselves or other super admins out.
  async setActivated(adminId: string, userId: string, activated: boolean) {
    if (adminId === userId) {
      throw new HttpException('You can’t deactivate your own account.', 400);
    }
    const user = await this._repository.getUserForAdmin(userId);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    if (user.isSuperAdmin) {
      throw new HttpException('Super admins can’t be deactivated here.', 400);
    }
    return this._repository.setActivated(userId, activated);
  }

  // Grants a plan without a payment, the same way Postiz's admin "add
  // subscription" does. Workspaces paying through Stripe are refused: changing
  // only the database would leave Stripe charging the old plan.
  async setOrgTier(
    orgId: string,
    tier: 'FREE' | 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE'
  ) {
    const org = await this._repository.getOrgForAdmin(orgId);
    if (!org) {
      throw new HttpException('Workspace not found', 404);
    }
    if (org.subscription?.isLifetime) {
      throw new HttpException('This workspace has a lifetime deal.', 400);
    }
    if (org.paymentId?.startsWith('cus_')) {
      throw new HttpException(
        'This workspace pays through Stripe. Impersonate it and change the plan from Billing.',
        400
      );
    }

    const provider = this._paymentService.getDefaultProviderName('web');
    if (tier === 'FREE') {
      if (!org.subscription || !org.paymentId) {
        return { tier: 'FREE' };
      }
      await this._subscriptionService.deleteSubscription(
        org.paymentId,
        org.subscription.provider
      );
      return { tier: 'FREE' };
    }

    const ownerId = org.users[0]?.userId;
    if (!ownerId) {
      throw new HttpException('This workspace has no owner.', 400);
    }
    await this._subscriptionService.addSubscription(
      org.id,
      ownerId,
      tier,
      provider
    );
    return { tier };
  }
}
