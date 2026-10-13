import { HttpException, Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { AdminApplyCouponDto } from '@gitroom/nestjs-libraries/dtos/billing/admin.apply.coupon.dto';

export type PaymentPlatform = 'web' | 'mobile';

// One row of the billing history, in a provider neutral shape
export interface PaymentInvoice {
  id: string;
  number: string | null;
  // pricing key and MONTHLY / YEARLY the invoice was for, when the provider knows it
  tier: string | null;
  period: string | null;
  description: string | null;
  // minor units (cents)
  amount: number;
  currency: string;
  // unix seconds
  created: number;
  periodEnd: number;
  status: 'paid' | 'pending' | 'failed' | 'void';
  downloadUrl: string | null;
  viewUrl: string | null;
}

// Every billing use-case goes through this contract. Webhooks and `platform`
// are mandatory; everything else has a default that says "not supported on
// this platform" so a provider only implements what its platform offers
// (e.g. app stores have no hosted checkout / portal / coupons).
export abstract class PaymentProviderAbstract {
  // Where the subscription is bought / managed. An organization can only be
  // subscribed on one platform at a time, the other platform is blocked.
  abstract platform: PaymentPlatform;

  // Turn the raw webhook request into a trusted event (throw on bad signature / secret)
  abstract validateWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<any> | any;

  // Apply a validated webhook event to our subscriptions
  abstract processWebhook(event: any): Promise<any>;

  protected notSupported(): never {
    throw new HttpException(
      `This action is not supported on ${this.platform}`,
      400
    );
  }

  // --- subscription lifecycle -------------------------------------------

  // Client initiated re-check of the organization subscription against the
  // provider (mobile app after purchase / restore)
  async syncSubscription(organizationId: string): Promise<{ active: boolean }> {
    return this.notSupported();
  }

  // Hosted checkout page
  async subscribe(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ): Promise<any> {
    return this.notSupported();
  }

  // Embedded checkout (client secret rendered inside our page)
  async embedded(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ): Promise<any> {
    return this.notSupported();
  }

  // One-time purchase of an AI credits pack (embedded checkout); credited by
  // the provider's webhook. Answers { client_secret, check }.
  async embeddedAiCredits(
    organizationId: string,
    userId: string,
    packId: string
  ): Promise<any> {
    return this.notSupported();
  }

  // Start the plan's free trial without a payment method
  async startTrial(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ): Promise<any> {
    return this.notSupported();
  }

  // A workspace on the card-less trial chose its plan and saved a card in
  // the embedded checkout: apply both to the running trial (same trial end).
  // Answers { check } to wait for, or { failed: true } when the card is refused.
  async applyTrialPlan(
    organizationId: string,
    sessionId: string
  ): Promise<{ check?: string; failed?: boolean }> {
    return this.notSupported();
  }

  // Store the provider's status, trial end and price on the subscription row
  // (for rows written before the provider reported them). No-op by default.
  async refreshSubscriptionState(organizationId: string): Promise<void> {
    return;
  }

  // Trial end date and whether a payment method is on file (null: no trial)
  async getTrialInfo(
    organizationId: string
  ): Promise<{ trialEnd: Date | null; hasPaymentMethod: boolean } | null> {
    return null;
  }

  // Price difference preview when switching plans
  async prorate(
    organizationId: string,
    body: BillingSubscribeDto
  ): Promise<any> {
    return this.notSupported();
  }

  // Toggle cancel-at-period-end
  async setToCancel(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  // Cancel everything right now (account deletion). Must not throw when the
  // provider has nothing to cancel server side.
  async cancelAllSubscriptions(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  // Self-service portal (payment method / invoices)
  async portalLink(organizationId: string): Promise<{ url: string }> {
    return this.notSupported();
  }

  // Billing history (invoices) of the organization
  async getInvoices(organizationId: string): Promise<PaymentInvoice[]> {
    return this.notSupported();
  }

  // Post-checkout poll: is this subscription id active for the org
  async checkSubscription(
    organizationId: string,
    subscriptionId: string
  ): Promise<any> {
    return this.notSupported();
  }

  // Available plans / prices
  async getPackages(): Promise<any> {
    return this.notSupported();
  }

  // --- trial & discounts --------------------------------------------------

  async finishTrial(organization: Organization): Promise<any> {
    return this.notSupported();
  }

  async checkDiscount(organization: Organization): Promise<boolean> {
    return false;
  }

  async applyDiscount(organization: Organization): Promise<any> {
    return this.notSupported();
  }

  async lifetimeDeal(organizationId: string, code: string): Promise<any> {
    return this.notSupported();
  }

  // --- admin --------------------------------------------------------------

  async getCharges(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  async refundCharges(
    organizationId: string,
    chargeIds: string[]
  ): Promise<any> {
    return this.notSupported();
  }

  async cancelSubscription(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  async getCouponInfo(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  async applyCoupon(
    organizationId: string,
    body: AdminApplyCouponDto
  ): Promise<any> {
    return this.notSupported();
  }

  async cancelCoupon(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  async chatbaseRefundPreview(organizationId: string): Promise<any> {
    return this.notSupported();
  }

  async chatbaseRefund(
    organizationId: string
  ): Promise<{ refunded: boolean; amount?: number; currency?: string }> {
    return this.notSupported();
  }

  // --- partners program (docs/tadween/partners.md) ------------------------

  // Credit the workspace's account balance, used on its next invoices (a
  // free month, an affiliate's commission taken as Tadween balance).
  // `idempotencyKey` is the reward or payout id, so a retry grants once.
  // Answers granted: false when the platform has no balance (the default) or
  // the workspace can't take one yet; the reward then stays to apply later.
  // Throwing means "unknown outcome": the caller retries with the same key,
  // so an implementation must not grant twice for one key.
  async grantAccountCredit(
    organizationId: string,
    amountCents: number,
    reason: string,
    idempotencyKey: string
  ): Promise<{ granted: boolean; reason?: string }> {
    return { granted: false, reason: 'not_supported' };
  }

  // Fingerprints of the cards saved on the workspace's billing account, so
  // the partners program can refuse a referral paid with the referrer's card
  async getPaymentFingerprints(organizationId: string): Promise<string[]> {
    return [];
  }

  // After a login swap, keep the provider's customer email in sync (no-op by default)
  async syncCustomerEmailsAfterSwitch(
    accounts: { id: string; email: string }[]
  ): Promise<void> {}
}

export interface PaymentProviderParams {
  provider: string;
}

export function PaymentProvider(params: PaymentProviderParams) {
  return function (target: any) {
    Injectable()(target);

    const existingMetadata =
      Reflect.getMetadata('payment-provider', PaymentProviderAbstract) || [];

    existingMetadata.push({ target, provider: params.provider });

    Reflect.defineMetadata(
      'payment-provider',
      existingMetadata,
      PaymentProviderAbstract
    );
  };
}
