import { Injectable } from '@nestjs/common';
import {
  PrismaRepository,
  PrismaTransaction,
} from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import dayjs from 'dayjs';
import { Organization } from '@prisma/client';

@Injectable()
export class SubscriptionRepository {
  constructor(
    private readonly _subscription: PrismaRepository<'subscription'>,
    private readonly _organization: PrismaRepository<'organization'>,
    private readonly _user: PrismaRepository<'user'>,
    private readonly _credits: PrismaRepository<'credits'>,
    private _usedCodes: PrismaRepository<'usedCodes'>,
    private readonly _aiCreditPurchase: PrismaRepository<'aiCreditPurchase'>
  ) {}

  getUserAccount(userId: string) {
    return this._user.model.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        account: true,
        connectedAccount: true,
      },
    });
  }

  getCode(code: string) {
    return this._usedCodes.model.usedCodes.findFirst({
      where: {
        code,
      },
    });
  }

  updateAccount(userId: string, account: string) {
    return this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        account,
      },
    });
  }

  getSubscriptionByOrganizationId(organizationId: string) {
    return this._subscription.model.subscription.findFirst({
      where: {
        organizationId,
        deletedAt: null,
      },
    });
  }

  updateConnectedStatus(account: string, accountCharges: boolean) {
    return this._user.model.user.updateMany({
      where: {
        account,
      },
      data: {
        connectedAccount: accountCharges,
      },
    });
  }

  getCustomerIdByOrgId(organizationId: string) {
    return this._organization.model.organization.findFirst({
      where: {
        id: organizationId,
      },
      select: {
        paymentId: true,
      },
    });
  }

  checkSubscription(organizationId: string, subscriptionId: string) {
    return this._subscription.model.subscription.findFirst({
      where: {
        organizationId,
        identifier: subscriptionId,
        deletedAt: null,
      },
    });
  }

  deleteSubscriptionByCustomerId(customerId: string, provider: string) {
    return this._subscription.model.subscription.deleteMany({
      where: {
        provider,
        organization: {
          paymentId: customerId,
        },
      },
    });
  }

  deleteSubscriptionByOrgId(organizationId: string, provider: string) {
    return this._subscription.model.subscription.deleteMany({
      where: {
        organizationId,
        provider,
      },
    });
  }

  updateCustomerId(organizationId: string, customerId: string) {
    return this._organization.model.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        paymentId: customerId,
      },
    });
  }

  updateCancelAt(organizationId: string, cancelAt: number | null) {
    return this._subscription.model.subscription.updateMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      data: {
        cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
      },
    });
  }

  async getSubscriptionByOrgId(orgId: string) {
    return this._subscription.model.subscription.findFirst({
      where: {
        organizationId: orgId,
      },
    });
  }

  async getSubscriptionByCustomerId(customerId: string) {
    return this._subscription.model.subscription.findFirst({
      where: {
        organization: {
          paymentId: customerId,
        },
      },
    });
  }

  async getOrganizationByCustomerId(customerId: string) {
    return this._organization.model.organization.findFirst({
      where: {
        paymentId: customerId,
      },
    });
  }

  async createOrUpdateSubscription(
    provider: string,
    isTrailing: boolean,
    identifier: string,
    customerId: string,
    totalChannels: number,
    billing: 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE',
    period: 'MONTHLY' | 'YEARLY',
    cancelAt: number | null,
    code?: string,
    org?: { id: string }
  ) {
    const findOrg =
      org || (await this.getOrganizationByCustomerId(customerId))!;

    if (!findOrg) {
      return;
    }

    await this._subscription.model.subscription.upsert({
      where: {
        organizationId: findOrg.id,
        ...(!code && customerId
          ? {
              organization: {
                paymentId: customerId,
              },
            }
          : {}),
      },
      update: {
        subscriptionTier: billing,
        provider,
        totalChannels,
        period,
        identifier,
        isLifetime: !!code,
        cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
        deletedAt: null,
      },
      create: {
        organizationId: findOrg.id,
        subscriptionTier: billing,
        provider,
        isLifetime: !!code,
        totalChannels,
        period,
        cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
        identifier,
        deletedAt: null,
      },
    });

    await this._organization.model.organization.update({
      where: {
        id: findOrg.id,
      },
      data: {
        isTrailing,
        allowTrial: false,
      },
    });

    if (code) {
      await this._usedCodes.model.usedCodes.create({
        data: {
          code,
          orgId: findOrg.id,
        },
      });
    }
  }

  getSubscriptionByIdentifier(identifier: string) {
    return this._subscription.model.subscription.findFirst({
      where: {
        identifier,
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });
  }

  getSubscription(organizationId: string) {
    return this._subscription.model.subscription.findFirst({
      where: {
        organizationId,
        deletedAt: null,
      },
    });
  }

  async getCreditsFrom(
    organizationId: string,
    from: dayjs.Dayjs,
    type = 'ai_images'
  ) {
    const load = await this._credits.model.credits.groupBy({
      by: ['organizationId'],
      where: {
        organizationId,
        type,
        createdAt: {
          gte: from.toDate(),
        },
      },
      _sum: {
        credits: true,
      },
    });

    return load?.[0]?._sum?.credits || 0;
  }

  async useCredit<T>(
    org: Organization,
    type = 'ai_images',
    func: () => Promise<T>
  ) {
    const data = await this._credits.model.credits.create({
      data: {
        organizationId: org.id,
        credits: 1,
        type,
      },
    });

    try {
      return await func();
    } catch (err) {
      await this._credits.model.credits.delete({
        where: {
          id: data.id,
        },
      });
      throw err;
    }
  }

  // The caller picks the id, so charging the same work twice is one row
  chargeCredits(
    id: string,
    organizationId: string,
    type: string,
    credits: number
  ) {
    return this._credits.model.credits.upsert({
      where: {
        id,
      },
      create: {
        id,
        organizationId,
        credits,
        type,
      },
      update: {},
      select: {
        id: true,
      },
    });
  }

  refundCredits(organizationId: string, id: string) {
    return this._credits.model.credits.deleteMany({
      where: {
        id,
        organizationId,
      },
    });
  }

  // Tadween AI credits. Rows of type "ai_credits" hold the credits an action
  // cost; older "ai_images" rows are one image each and are counted, not summed
  async getAiCreditsUsage(organizationId: string, from: Date) {
    const [monthly, legacyImages, purchasedSpent, purchasedTotal] =
      await Promise.all([
        this._credits.model.credits.aggregate({
          where: {
            organizationId,
            type: 'ai_credits',
            createdAt: { gte: from },
          },
          _sum: { credits: true, purchased: true },
        }),
        this._credits.model.credits.count({
          where: {
            organizationId,
            type: 'ai_images',
            createdAt: { gte: from },
          },
        }),
        this._credits.model.credits.aggregate({
          where: { organizationId, type: 'ai_credits' },
          _sum: { purchased: true },
        }),
        this._aiCreditPurchase.model.aiCreditPurchase.aggregate({
          where: { organizationId },
          _sum: { credits: true },
        }),
      ]);

    return {
      monthlyUsed:
        (monthly._sum.credits || 0) - (monthly._sum.purchased || 0),
      legacyImages,
      purchasedUsed: purchasedSpent._sum.purchased || 0,
      purchasedTotal: purchasedTotal._sum.credits || 0,
    };
  }

  chargeAiCredits(
    organizationId: string,
    action: string,
    credits: number,
    purchased: number
  ) {
    return this._credits.model.credits.create({
      data: {
        organizationId,
        type: 'ai_credits',
        action,
        credits,
        purchased,
      },
      select: {
        id: true,
      },
    });
  }

  // The checkout session id is the primary key: a webhook delivered twice
  // credits the pack once
  addAiCreditPurchase(
    id: string,
    organizationId: string,
    credits: number,
    amount: number,
    currency: string,
    provider: string
  ) {
    return this._aiCreditPurchase.model.aiCreditPurchase.upsert({
      where: {
        id,
      },
      create: {
        id,
        organizationId,
        credits,
        amount,
        currency,
        provider,
      },
      update: {},
      select: {
        id: true,
      },
    });
  }

  getAiCreditPurchase(organizationId: string, id: string) {
    return this._aiCreditPurchase.model.aiCreditPurchase.findFirst({
      where: {
        id,
        organizationId,
      },
      select: {
        id: true,
        credits: true,
      },
    });
  }

  setCustomerId(orgId: string, customerId: string) {
    return this._organization.model.organization.update({
      where: {
        id: orgId,
      },
      data: {
        paymentId: customerId,
      },
    });
  }
}
