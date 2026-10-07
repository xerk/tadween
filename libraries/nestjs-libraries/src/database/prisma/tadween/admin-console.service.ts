import { HttpException, Injectable } from '@nestjs/common';
import { AdminConsoleRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/admin-console.repository';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { PaymentService } from '@gitroom/nestjs-libraries/services/payment/payment.service';

const PAGE_SIZE = 20;

@Injectable()
export class AdminConsoleService {
  constructor(
    private _repository: AdminConsoleRepository,
    private _subscriptionService: SubscriptionService,
    private _paymentService: PaymentService
  ) {}

  overview() {
    return this._repository.overview(new Date());
  }

  async listUsers(search: string, page: number) {
    const safePage = Math.max(0, page || 0);
    const { total, users } = await this._repository.listUsers(
      search || '',
      safePage,
      PAGE_SIZE
    );
    return {
      total,
      page: safePage,
      pageSize: PAGE_SIZE,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      users,
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
