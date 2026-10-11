import { Injectable } from '@nestjs/common';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { SubscriptionRepository } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { Organization } from '@prisma/client';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { PlansService } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.service';

// Stripe statuses of a renewal whose payment failed. Organization.isTrailing
// is also true for them (it stores "not active"), so trial-only limits must
// not apply: the workspace keeps working while Stripe retries the card.
export const PAYMENT_FAILED_STATUSES = ['past_due', 'unpaid'];

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly _subscriptionRepository: SubscriptionRepository,
    private readonly _integrationService: IntegrationService,
    private readonly _organizationService: OrganizationService,
    private readonly _plans: PlansService
  ) {}

  getSubscriptionByOrganizationId(organizationId: string) {
    return this._subscriptionRepository.getSubscriptionByOrganizationId(
      organizationId
    );
  }

  useCredit<T>(
    organization: Organization,
    type = 'ai_images',
    func: () => Promise<T>
  ): Promise<T> {
    return this._subscriptionRepository.useCredit(organization, type, func);
  }

  getCode(code: string) {
    return this._subscriptionRepository.getCode(code);
  }

  // On a real free trial: isTrailing, unless the subscription's last payment
  // failed. Organizations loaded without their subscription keep isTrailing.
  isOnTrial(org: {
    isTrailing: boolean;
    subscription?: { status?: string | null } | null;
  }) {
    return (
      org.isTrailing &&
      !PAYMENT_FAILED_STATUSES.includes(org.subscription?.status || '')
    );
  }

  // Customer-keyed flows must never touch a subscription owned by another provider
  private async isManagedBy(customerId: string, provider: string) {
    const current =
      await this._subscriptionRepository.getSubscriptionByCustomerId(
        customerId
      );
    return !current || current.provider === provider;
  }

  async deleteSubscription(customerId: string, provider: string) {
    // Reached from payment webhooks: log failures instead of throwing
    try {
      if (!(await this.isManagedBy(customerId, provider))) {
        return { count: 0 };
      }
      await this.modifySubscription(
        customerId,
        pricing.FREE.channel || 0,
        'FREE'
      );
    } catch (e) {
      console.error('Error downgrading subscription:', e);
    }
    try {
      return await this._subscriptionRepository.deleteSubscriptionByCustomerId(
        customerId,
        provider
      );
    } catch (e) {
      console.error('Error deleting subscription:', e);
      return { count: 0 };
    }
  }

  // Store-managed subscriptions (RevenueCat etc.) have no Stripe customer, they are keyed by org
  async deleteSubscriptionByOrgId(organizationId: string, provider: string) {
    const current = await this._subscriptionRepository.getSubscriptionByOrgId(
      organizationId
    );
    if (!current || current.provider !== provider || current.isLifetime) {
      return false;
    }

    // Reached from store webhooks (RevenueCat): log failures, never throw
    try {
      await this.modifySubscriptionByOrg(
        organizationId,
        pricing.FREE.channel || 0,
        'FREE'
      );
      return await this._subscriptionRepository.deleteSubscriptionByOrgId(
        organizationId,
        provider
      );
    } catch (e) {
      console.error('Error deleting subscription by organization:', e);
      return false;
    }
  }

  updateCustomerId(organizationId: string, customerId: string) {
    return this._subscriptionRepository.updateCustomerId(
      organizationId,
      customerId
    );
  }

  updateCancelAt(organizationId: string, cancelAt: number | null) {
    return this._subscriptionRepository.updateCancelAt(
      organizationId,
      cancelAt
    );
  }

  // Reached from payment webhooks: log failures instead of throwing
  async updateProviderState(
    customerId: string,
    provider: string,
    state: {
      status: string;
      trialEndsAt: Date | null;
      priceCents: number | null;
    }
  ) {
    try {
      return await this._subscriptionRepository.updateProviderState(
        customerId,
        provider,
        state
      );
    } catch (e) {
      console.error('Error saving subscription status:', e);
      return { count: 0 };
    }
  }

  async checkSubscription(organizationId: string, subscriptionId: string) {
    return await this._subscriptionRepository.checkSubscription(
      organizationId,
      subscriptionId
    );
  }

  async modifySubscriptionByOrg(
    organizationId: string,
    totalChannels: number,
    billing: 'FREE' | 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE'
  ) {
    if (!organizationId) {
      return false;
    }

    const getCurrentSubscription =
      (await this._subscriptionRepository.getSubscriptionByOrgId(
        organizationId
      ))!;

    // The admin's plans decide team members per tier, like every other limit
    const plans = await this._plans.getPricing();
    const from = plans[getCurrentSubscription?.subscriptionTier || 'FREE'];
    const to = plans[billing];

    const allChannels = await this._integrationService.getIntegrationsList(
      organizationId
    );
    const currentTotalChannels = allChannels.filter((f) => !f.disabled);

    if (currentTotalChannels.length > totalChannels) {
      await this._integrationService.disableIntegrations(
        organizationId,
        currentTotalChannels.length - totalChannels
      );
    }

    // channels are auto-disabled when a subscription lapses; once the new plan
    // can hold all of them and the limit grew, enable everything back (partial
    // enabling or same-plan updates would risk enabling channels the user
    // disabled on purpose)
    if (
      billing !== 'FREE' &&
      currentTotalChannels.length < allChannels.length &&
      allChannels.length <= totalChannels &&
      totalChannels > (getCurrentSubscription?.totalChannels || 0)
    ) {
      try {
        await this._integrationService.enableAllIntegrations(organizationId);
      } catch (err) {
        console.error(
          'Error enabling channels after subscription change:',
          err
        );
      }
    }

    if (from.team_members && !to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        organizationId,
        true
      );
    }

    if (!from.team_members && to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        organizationId,
        false
      );
    }

    if (billing === 'FREE') {
      await this._integrationService.changeActiveCron(organizationId);
    }

    return true;
  }

  async modifySubscription(
    customerId: string,
    totalChannels: number,
    billing: 'FREE' | 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE'
  ) {
    if (!customerId) {
      return false;
    }

    const getOrgByCustomerId =
      await this._subscriptionRepository.getOrganizationByCustomerId(
        customerId
      );

    const getCurrentSubscription =
      (await this._subscriptionRepository.getSubscriptionByCustomerId(
        customerId
      ))!;

    if (
      !getOrgByCustomerId ||
      (getCurrentSubscription && getCurrentSubscription?.isLifetime)
    ) {
      return false;
    }

    // The admin's plans decide team members per tier, like every other limit
    const plans = await this._plans.getPricing();
    const from = plans[getCurrentSubscription?.subscriptionTier || 'FREE'];
    const to = plans[billing];

    const allChannels = await this._integrationService.getIntegrationsList(
      getOrgByCustomerId?.id!
    );
    const currentTotalChannels = allChannels.filter((f) => !f.disabled);

    if (currentTotalChannels.length > totalChannels) {
      await this._integrationService.disableIntegrations(
        getOrgByCustomerId?.id!,
        currentTotalChannels.length - totalChannels
      );
    }

    // channels are auto-disabled when a subscription lapses; once the new plan
    // can hold all of them and the limit grew, enable everything back (partial
    // enabling or same-plan updates would risk enabling channels the user
    // disabled on purpose)
    if (
      billing !== 'FREE' &&
      currentTotalChannels.length < allChannels.length &&
      allChannels.length <= totalChannels &&
      totalChannels > (getCurrentSubscription?.totalChannels || 0)
    ) {
      try {
        await this._integrationService.enableAllIntegrations(
          getOrgByCustomerId?.id!
        );
      } catch (err) {
        console.error(
          'Error enabling channels after subscription change:',
          err
        );
      }
    }

    if (from.team_members && !to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        getOrgByCustomerId?.id!,
        true
      );
    }

    if (!from.team_members && to.team_members) {
      await this._organizationService.disableOrEnableNonSuperAdminUsers(
        getOrgByCustomerId?.id!,
        false
      );
    }

    if (billing === 'FREE') {
      await this._integrationService.changeActiveCron(getOrgByCustomerId?.id!);
    }

    return true;
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
    org?: string
  ) {
    if (!code) {
      try {
        if (!(await this.isManagedBy(customerId, provider))) {
          return {};
        }
        const load = await this.modifySubscription(
          customerId,
          totalChannels,
          billing
        );
        if (!load) {
          return {};
        }
      } catch (e) {
        console.error('Error modifying subscription:', e);
        return {};
      }
    }
    try {
      return await this._subscriptionRepository.createOrUpdateSubscription(
        provider,
        isTrailing,
        identifier,
        customerId,
        totalChannels,
        billing,
        period,
        cancelAt,
        code,
        org ? { id: org } : undefined
      );
    } catch (e) {
      console.error('Error saving subscription:', e);
      return {};
    }
  }

  async createOrUpdateSubscriptionByOrg(
    isTrailing: boolean,
    organizationId: string,
    provider: string,
    identifier: string,
    totalChannels: number,
    billing: 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE',
    period: 'MONTHLY' | 'YEARLY',
    cancelAt: number | null
  ) {
    const current = await this._subscriptionRepository.getSubscriptionByOrgId(
      organizationId
    );
    if (current && (current.isLifetime || current.provider !== provider)) {
      return {};
    }

    try {
      const load = await this.modifySubscriptionByOrg(
        organizationId,
        totalChannels,
        billing
      );
      if (!load) {
        return {};
      }
    } catch (e) {
      console.error('Error modifying subscription:', e);
      return {};
    }

    return this._subscriptionRepository.createOrUpdateSubscription(
      provider,
      isTrailing,
      identifier,
      '',
      totalChannels,
      billing,
      period,
      cancelAt,
      undefined,
      { id: organizationId }
    );
  }

  getSubscriptionByIdentifier(identifier: string) {
    return this._subscriptionRepository.getSubscriptionByIdentifier(identifier);
  }

  // For work that is metered (minutes) and outlives a single call, so it can't
  // be wrapped in useCredit: the caller picks the id, charging twice is one
  // row, and the same id refunds it on failure
  chargeCredits(
    id: string,
    organizationId: string,
    type: string,
    credits: number
  ) {
    return this._subscriptionRepository.chargeCredits(
      id,
      organizationId,
      type,
      credits
    );
  }

  refundCredits(organizationId: string, id: string) {
    return this._subscriptionRepository.refundCredits(organizationId, id);
  }

  async getSubscription(organizationId: string) {
    return this._subscriptionRepository.getSubscription(organizationId);
  }

  async checkCredits(organization: Organization, checkType = 'ai_images') {
    // @ts-ignore
    const type = organization?.subscription?.subscriptionTier || 'FREE';

    if (type === 'FREE') {
      return { credits: 0 };
    }

    // @ts-ignore
    let date = dayjs(organization.subscription.createdAt);
    while (date.isBefore(dayjs())) {
      date = date.add(1, 'month');
    }

    const checkFromMonth = date.subtract(1, 'month');
    const imageGenerationCount =
      checkType === 'ai_images'
        ? (await this._plans.getPricing())[type].image_generation_count
        : checkType === 'clipping_minutes'
        ? pricing[type].clipping_minutes
        : pricing[type].generate_videos;

    const totalUse = await this._subscriptionRepository.getCreditsFrom(
      organization.id,
      checkFromMonth,
      checkType
    );

    return {
      credits: imageGenerationCount - totalUse,
    };
  }

  // A plan granted without a payment: keyed by the workspace only. It used to
  // write the owner's user id into paymentId, which Stripe then rejected as a
  // customer id when the workspace later bought a plan.
  async addSubscription(orgId: string, subscription: any, provider: string) {
    return this.createOrUpdateSubscriptionByOrg(
      false,
      orgId,
      provider,
      makeId(5),
      (await this._plans.getPricing())[subscription].channel!,
      subscription,
      'MONTHLY',
      null
    );
  }

}
