import Stripe from 'stripe';
import { placeholderEmailDomain } from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';
import { BadRequestException } from '@nestjs/common';
import { Organization, User } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { groupBy } from 'lodash';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { PlansService } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.service';
import { aiCreditPacks } from '@gitroom/nestjs-libraries/openai/ai.config';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { TrackService } from '@gitroom/nestjs-libraries/track/track.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import {
  PaymentPlatform,
  PaymentProvider,
  PaymentProviderAbstract,
} from '@gitroom/nestjs-libraries/services/payment/payment.provider.interface';

import { STRIPE_PROVIDER } from '@gitroom/nestjs-libraries/services/payment/payment.providers';
import { PartnersService } from '@gitroom/nestjs-libraries/database/prisma/partners/partners.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_nothing');

@PaymentProvider({ provider: STRIPE_PROVIDER })
export class StripeService extends PaymentProviderAbstract {
  platform: PaymentPlatform = 'web';

  constructor(
    private _subscriptionService: SubscriptionService,
    private _organizationService: OrganizationService,
    private _userService: UsersService,
    private _trackService: TrackService,
    private _plans: PlansService,
    private _partners: PartnersService
  ) {
    super();
  }
  validateRequest(rawBody: Buffer, signature: string, endpointSecret: string) {
    return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  }

  validateWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ) {
    return this.validateRequest(
      rawBody,
      headers['stripe-signature'] as string,
      process.env.STRIPE_SIGNING_KEY
    );
  }

  async processWebhook(event: Stripe.Event) {
    // Maybe it comes from another stripe webhook. Invoices don't carry the
    // subscription's metadata: their handlers check it on the subscription.
    if (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      event?.data?.object?.metadata?.service !== 'gitroom' &&
      event.type !== 'invoice.payment_succeeded' &&
      event.type !== 'invoice.payment_failed' &&
      event.type !== 'invoice.paid' &&
      // partners program: rewards land before the invoice is finalised, and
      // refunds / disputes take commission back (charges carry no metadata)
      event.type !== 'invoice.created' &&
      event.type !== 'charge.refunded' &&
      event.type !== 'charge.dispute.created'
    ) {
      return { ok: true };
    }

    switch (event.type) {
      case 'invoice.payment_succeeded':
        return this.paymentSucceeded(event);
      case 'invoice.payment_failed':
      case 'invoice.paid':
        return this.invoiceStatusChanged(event);
      case 'invoice.created':
        return this.invoiceCreated(event);
      case 'charge.refunded':
        return this.chargeRefunded(event);
      case 'charge.dispute.created':
        return this.chargeDisputed(event);
      case 'customer.subscription.created':
        return this.createSubscription(event);
      case 'customer.subscription.updated':
        return this.updateSubscription(event);
      case 'customer.subscription.deleted':
        return this.deleteSubscription(event);
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        return this.aiCreditsPaid(event);
      default:
        return { ok: true };
    }
  }

  async checkValidCard(
    event:
      | Stripe.CustomerSubscriptionCreatedEvent
      | Stripe.CustomerSubscriptionUpdatedEvent
  ) {
    if (event.data.object.status === 'incomplete') {
      return false;
    }

    const getOrgFromCustomer =
      await this._organizationService.getOrgByCustomerId(
        event.data.object.customer as string
      );

    if (!getOrgFromCustomer?.allowTrial) {
      return true;
    }

    console.log('Checking card');

    const paymentMethods = await stripe.paymentMethods.list({
      customer: event.data.object.customer as string,
    });

    // find the last one created
    const latestMethod = paymentMethods.data.reduce(
      (prev, current) => {
        if (prev.created < current.created) {
          return current;
        }
        return prev;
      },
      { created: -100 } as Stripe.PaymentMethod
    );

    if (!latestMethod.id) {
      // A trial started without a card ("Skip for now") has nothing to check;
      // Stripe cancels it at the end of the trial if no card is added.
      return event.data.object.status === 'trialing';
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 100,
        currency: 'usd',
        payment_method: latestMethod.id,
        customer: event.data.object.customer as string,
        off_session: true,
        capture_method: 'manual', // Authorize without capturing
        confirm: true, // Confirm the PaymentIntent
      });

      // The bank asks for 3-D Secure on every payment: the hold can't be
      // placed off-session, but the customer just passed 3-D Secure in Checkout
      if (paymentIntent.status === 'requires_action') {
        await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
        return true;
      }

      if (paymentIntent.status !== 'requires_capture') {
        console.error('Cant charge');
        await stripe.paymentMethods.detach(latestMethod.id);
        await stripe.subscriptions.cancel(event.data.object.id as string);
        return false;
      }

      await stripe.paymentIntents.cancel(paymentIntent.id as string);
      return true;
    } catch (err) {
      // Same 3-D Secure case, reported as an error by the off-session confirm
      const stripeError = err as Stripe.errors.StripeError;
      if (stripeError?.code === 'authentication_required') {
        const intent = stripeError.payment_intent;
        if (intent?.id) {
          await stripe.paymentIntents.cancel(intent.id).catch(() => {});
        }
        return true;
      }
      try {
        await stripe.paymentMethods.detach(latestMethod.id);
        await stripe.subscriptions.cancel(event.data.object.id as string);
      } catch (err) {
        /*dont do anything*/
      }
      return false;
    }
  }

  async createSubscription(event: Stripe.CustomerSubscriptionCreatedEvent) {
    const { uniqueId, billing, period } = event.data.object.metadata as {
      billing: 'STANDARD' | 'PRO';
      period: 'MONTHLY' | 'YEARLY';
      uniqueId: string;
    };

    const liveSubscriptions = await this.getLiveSubscriptions(
      event.data.object.customer as string
    );
    const isDuplicate = liveSubscriptions.some(
      (f) =>
        f.id !== event.data.object.id &&
        (f.created < event.data.object.created ||
          (f.created === event.data.object.created &&
            f.id < event.data.object.id))
    );
    if (isDuplicate) {
      if (liveSubscriptions.some((f) => f.id === event.data.object.id)) {
        await stripe.subscriptions.cancel(event.data.object.id);
      }
      console.log('stripe_duplicate_subscription_cancelled', {
        stripe_event_type: event.type,
        stripe_event_id: event.id,
        stripe_subscription_id: event.data.object.id,
      });
      return { ok: true };
    }

    try {
      const check = await this.checkValidCard(event);
      if (!check) {
        return { ok: false };
      }
    } catch (err) {
      return { ok: false };
    }

    const plan = (await this._plans.getPricing())[billing];
    if (!plan || !period) {
      console.error('stripe_subscription_metadata_missing', {
        stripe_event_type: event.type,
        stripe_event_id: event.id,
        stripe_subscription_id: event.data.object.id,
      });
      return { ok: false };
    }

    const saved = await this._subscriptionService.createOrUpdateSubscription(
      STRIPE_PROVIDER,
      event.data.object.status !== 'active',
      uniqueId,
      event.data.object.customer as string,
      plan.channel!,
      billing,
      period,
      event.data.object.cancel_at
    );
    await this.saveProviderState(event.data.object);
    return saved;
  }
  async updateSubscription(event: Stripe.CustomerSubscriptionUpdatedEvent) {
    const { uniqueId, billing, period } = event.data.object.metadata as {
      billing: 'STANDARD' | 'PRO';
      period: 'MONTHLY' | 'YEARLY';
      uniqueId: string;
    };

    try {
      const check = await this.checkValidCard(event);
      if (!check) {
        return { ok: false };
      }
    } catch (err) {
      return { ok: false };
    }

    const plan = (await this._plans.getPricing())[billing];
    if (!plan || !period) {
      console.error('stripe_subscription_metadata_missing', {
        stripe_event_type: event.type,
        stripe_event_id: event.id,
        stripe_subscription_id: event.data.object.id,
      });
      return { ok: false };
    }

    const saved = await this._subscriptionService.createOrUpdateSubscription(
      STRIPE_PROVIDER,
      event.data.object.status !== 'active',
      uniqueId,
      event.data.object.customer as string,
      plan.channel!,
      billing,
      period,
      event.data.object.cancel_at
    );
    await this.saveProviderState(event.data.object);
    return saved;
  }

  async deleteSubscription(event: Stripe.CustomerSubscriptionDeletedEvent) {
    const customer = event.data.object.customer as string;
    const [survivor] = await this.getLiveSubscriptions(customer);
    if (!survivor) {
      await this._subscriptionService.deleteSubscription(
        customer,
        STRIPE_PROVIDER
      );
      return;
    }

    const { uniqueId, billing, period } = survivor.metadata as {
      billing: 'STANDARD' | 'PRO';
      period: 'MONTHLY' | 'YEARLY';
      uniqueId: string;
    };
    const plan = (await this._plans.getPricing())[billing];
    console.log('stripe_subscription_deleted_survivor_kept', {
      stripe_event_type: event.type,
      stripe_event_id: event.id,
      stripe_subscription_id: event.data.object.id,
      stripe_survivor_id: survivor.id,
      outcome: plan && period ? 'resynced' : 'metadata_missing',
    });
    if (!plan || !period) {
      return;
    }

    const saved = await this._subscriptionService.createOrUpdateSubscription(
      STRIPE_PROVIDER,
      survivor.status !== 'active',
      uniqueId,
      customer,
      plan.channel!,
      billing,
      period,
      survivor.cancel_at
    );
    await this.saveProviderState(survivor);
    return saved;
  }

  // Stripe's status, trial end and price on the workspace's subscription row,
  // so the app can tell a failed renewal (past_due) from a trial. Reached from
  // webhooks: never throws.
  private async saveProviderState(subscription: Stripe.Subscription) {
    try {
      const customer =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;
      if (!customer) {
        return;
      }
      const priceCents =
        subscription.items?.data?.[0]?.price?.unit_amount ?? null;
      await this._subscriptionService.updateProviderState(
        customer,
        STRIPE_PROVIDER,
        {
          status: subscription.status,
          trialEndsAt: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
          priceCents,
        }
      );
      // Founder spots are taken on the first paid invoice (paymentSucceeded)
    } catch (err) {
      console.error('stripe_subscription_state_not_saved', {
        stripe_subscription_id: subscription?.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async refreshSubscriptionState(organizationId: string): Promise<void> {
    try {
      const org = await this._organizationService.getOrgById(organizationId);
      const [subscription] = await this.getLiveSubscriptions(
        this.stripeCustomerId(org)
      );
      if (subscription) {
        await this.saveProviderState(subscription);
      }
    } catch (err) {
      console.error('stripe_subscription_state_not_refreshed', {
        organization_id: organizationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // A renewal failed (the subscription goes past_due) or an invoice got paid
  // (back to active): refresh the stored status from the subscription itself.
  // customer.subscription.updated reports the same change; this is the belt.
  async invoiceStatusChanged(
    event: Stripe.InvoicePaymentFailedEvent | Stripe.InvoicePaidEvent
  ) {
    try {
      const subscriptionId =
        event.data.object.parent?.subscription_details?.subscription;
      if (!subscriptionId) {
        return { ok: true };
      }
      const subscription = await stripe.subscriptions.retrieve(
        typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id
      );
      if (subscription.metadata?.service !== 'gitroom') {
        return { ok: true };
      }
      await this.saveProviderState(subscription);
    } catch (err) {
      console.error('stripe_invoice_status_not_saved', {
        stripe_event_type: event.type,
        stripe_event_id: event.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return { ok: true };
  }

  // After a login swap, move each Stripe customer's email to the login that
  // now owns it. Owner-only so a member's switch can't rewrite a shared org's
  // billing email, deduped per customer, and skipping admin-granted
  // subscriptions (their paymentId is a user id, not a `cus_...` customer).
  async syncCustomerEmailsAfterSwitch(
    accounts: { id: string; email: string }[]
  ) {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      return;
    }
    const emailByCustomer = new Map<string, string>();
    for (const account of accounts) {
      const organizations = await this._organizationService.getOrgsByUserId(
        account.id
      );
      for (const org of organizations) {
        if (
          org.users?.[0]?.role === 'SUPERADMIN' &&
          org.paymentId?.startsWith('cus_') &&
          !emailByCustomer.has(org.paymentId)
        ) {
          emailByCustomer.set(org.paymentId, account.email);
        }
      }
    }
    await Promise.all(
      [...emailByCustomer].map(([customerId, email]) =>
        stripe.customers
          .update(customerId, {
            email: email.indexOf('@') > -1 ? email : `${email}@${placeholderEmailDomain()}`,
          })
          .catch(() => {})
      )
    );
  }

  // Plans granted by an admin used to store the owner's user id in paymentId
  // (Postiz's add-subscription). Only a `cus_…` id is a Stripe customer; any
  // other value means the workspace has no customer yet.
  private stripeCustomerId(organization?: { paymentId?: string | null } | null) {
    return organization?.paymentId?.startsWith('cus_')
      ? organization.paymentId
      : undefined;
  }

  async createOrGetCustomer(organization: Organization) {
    const existing = this.stripeCustomerId(organization);
    if (existing) {
      return existing;
    }

    const users = await this._organizationService.getTeam(organization.id);
    const customer = await stripe.customers.create({
      email:
        users.users[0].user.email.indexOf('@') > -1
          ? users.users[0].user.email
          : `${users.users[0].user.email}@${placeholderEmailDomain()}`,
      name: organization.name,
    });
    await this._subscriptionService.updateCustomerId(
      organization.id,
      customer.id
    );
    return customer.id;
  }

  async getPackages() {
    const products = await stripe.prices.list({
      active: true,
      expand: ['data.tiers', 'data.product'],
      lookup_keys: [
        'standard_monthly',
        'standard_yearly',
        'pro_monthly',
        'pro_yearly',
      ],
    });

    const productsList = groupBy(
      products.data.map((p) => ({
        name: (p.product as Stripe.Product)?.name,
        recurring: p?.recurring?.interval!,
        price: p?.tiers?.[0]?.unit_amount! / 100,
      })),
      'recurring'
    );

    return { ...productsList };
  }

  async prorate(organizationId: string, body: BillingSubscribeDto) {
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const findPrice = await this.findOrCreatePrice(body);

    const currentUserSubscription = {
      data: (
        await stripe.subscriptions.list({
          customer,
          status: 'all',
        })
      ).data.filter((f) => f.status === 'active' || f.status === 'trialing'),
    };

    try {
      const price = await stripe.invoices.createPreview({
        customer,
        subscription: currentUserSubscription?.data?.[0]?.id,
        subscription_details: {
          proration_behavior: 'always_invoice',
          items: [
            {
              id: currentUserSubscription?.data?.[0]?.items?.data?.[0]?.id,
              price: findPrice?.id!,
              quantity: 1,
            },
          ],
        },
      });

      return {
        price: price?.amount_due ? price?.amount_due / 100 : 0,
      };
    } catch (err) {
      console.error('Error calculating proration:', err);
      return { price: 0 };
    }
  }

  async getCustomerSubscriptions(organizationId: string) {
    const org = (await this._organizationService.getOrgById(organizationId))!;
    const customer = this.stripeCustomerId(org);
    if (!customer) {
      return { data: [] as Stripe.Subscription[] };
    }
    return stripe.subscriptions.list({
      customer,
      status: 'all',
    });
  }

  private async getLiveSubscriptions(customer?: string | null) {
    if (!customer || !customer.startsWith('cus_')) {
      return [];
    }

    return (
      await stripe.subscriptions.list({
        customer,
        status: 'all',
        expand: ['data.latest_invoice'],
      })
    ).data.filter(
      (f) =>
        f.status !== 'canceled' &&
        f.status !== 'incomplete' &&
        f.status !== 'incomplete_expired'
    );
  }

  async setToCancel(organizationId: string) {
    const id = makeId(10);
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const subscriptions = await this.getLiveSubscriptions(customer);

    const sub = subscriptions[0];

    if (!sub) {
      throw new BadRequestException('No active subscription found');
    }

    // If the user is toggling back (un-cancelling), just remove the cancel
    if (sub.cancel_at_period_end) {
      let cancel_at: number | null = null;
      for (const s of subscriptions) {
        const updated = await stripe.subscriptions.update(s.id, {
          cancel_at_period_end: false,
          metadata: { service: 'gitroom', id },
        });
        cancel_at = cancel_at || updated.cancel_at;
      }
      await this._subscriptionService.updateCancelAt(organizationId, cancel_at);

      return {
        id,
        cancel_at: cancel_at ? new Date(cancel_at * 1000) : undefined,
      };
    }

    // Check if the latest invoice has a failed payment
    const latestInvoice = sub.latest_invoice as Stripe.Invoice | null;
    const hasFailedPayment =
      sub.status === 'past_due' ||
      latestInvoice?.status === 'open' ||
      latestInvoice?.status === 'uncollectible';

    if (hasFailedPayment) {
      // Payment already failed — cancel immediately and delete subscription
      for (const s of subscriptions) {
        await stripe.subscriptions.cancel(s.id);
      }
      await this._subscriptionService.deleteSubscription(
        customer,
        STRIPE_PROVIDER
      );

      return {
        id,
        cancel_at: new Date(),
      };
    }

    // Payment succeeded — cancel at end of billing period
    let cancel_at: number | null = null;
    for (const s of subscriptions) {
      const updated = await stripe.subscriptions.update(s.id, {
        cancel_at_period_end: true,
        metadata: { service: 'gitroom', id },
      });
      if (updated.cancel_at && (!cancel_at || updated.cancel_at < cancel_at)) {
        cancel_at = updated.cancel_at;
      }
    }
    await this._subscriptionService.updateCancelAt(organizationId, cancel_at);

    return {
      id,
      cancel_at: cancel_at ? new Date(cancel_at * 1000) : undefined,
    };
  }

  async cancelAllSubscriptions(organizationId: string) {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      return;
    }
    // getOrgById must not filter deletedAt, this can run for an organization
    // that was already soft deleted by an account deletion
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = this.stripeCustomerId(org);
    if (!org || !customer) {
      return;
    }

    const subscriptions = await stripe.subscriptions.list({
      customer,
      status: 'all',
      limit: 100,
    });

    for (const subscription of subscriptions.data.filter(
      (f) => f.status !== 'canceled'
    )) {
      await stripe.subscriptions.cancel(subscription.id);
    }

    await this._subscriptionService.deleteSubscription(
      customer,
      STRIPE_PROVIDER
    );
  }

  async getCustomerByOrganizationId(organizationId: string) {
    const org = (await this._organizationService.getOrgById(organizationId))!;
    return this.stripeCustomerId(org);
  }

  async createBillingPortalLink(customer: string) {
    return stripe.billingPortal.sessions.create({
      customer,
      return_url: process.env['FRONTEND_URL'] + '/billing',
    });
  }

  /**
   * Find an active promotion code with autoapply: true metadata
   * Only returns codes that are active and not expired
   * Returns the promotion code id, applied to the Checkout Session
   */
  private async findAutoApplyPromotionCode(): Promise<string | null> {
    try {
      const promotionCodes = await stripe.promotionCodes.list({
        active: true,
        limit: 100,
      });

      const now = Math.floor(Date.now() / 1000);

      for (const promoCode of promotionCodes.data) {
        const coupon =
          typeof promoCode.promotion.coupon === 'string'
            ? null
            : promoCode.promotion.coupon;

        // Check if it has autoapply metadata set to true (check both promo and coupon metadata)
        const autoApply = Object.assign(
          {},
          promoCode.metadata,
          coupon?.metadata
        )?.autoapply;
        if (autoApply !== 'true') continue;

        // Check if the promotion code has expired
        if (promoCode.expires_at && promoCode.expires_at < now) continue;

        // Check if the coupon has expired (redeem_by)
        if (coupon?.redeem_by && coupon.redeem_by < now) continue;

        // Check if max redemptions reached
        if (
          promoCode.max_redemptions &&
          promoCode.times_redeemed >= promoCode.max_redemptions
        )
          continue;

        // Found a valid auto-apply promotion code
        return promoCode.id;
      }

      return null;
    } catch (err) {
      console.error('Error finding auto-apply promotion code:', err);
      return null;
    }
  }

  private async createEmbeddedCheckout(
    ud: string,
    uniqueId: string,
    customer: string,
    body: BillingSubscribeDto,
    price: string,
    userId: string,
    allowTrial: boolean
  ) {
    const user = await this._userService.getUserById(userId);

    try {
      await stripe.customers.update(customer, {
        email:
          user.email.indexOf('@') > -1
            ? user.email
            : `${user.email}@${placeholderEmailDomain()}`,
        ...(body.dub
          ? {
              metadata: {
                dubCustomerExternalId: userId,
                dubClickId: body.dub,
              },
            }
          : {}),
      });
    } catch (err) {}

    // Check for auto-apply promotion code (only for monthly plans)
    let autoApplyPromoCode: string | null = null;
    if (body.period === 'MONTHLY') {
      autoApplyPromoCode = await this.findAutoApplyPromotionCode();
    }

    const trialDays = allowTrial
      ? await this.trialDaysFor(customer, body.billing)
      : 0;
    // Stripe Embedded Checkout, mounted inside the billing page. The app waits
    // for the webhook (GET /billing/check/:uniqueId) before showing success.
    const { client_secret } = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      redirect_on_completion: 'never',
      customer,
      mode: 'subscription',
      // Local currency at checkout (also needs Adaptive Pricing on in the
      // Stripe Dashboard); prices stay USD in Stripe and in the app.
      adaptive_pricing: { enabled: true },
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: {
          service: 'gitroom',
          ...body,
          userId,
          uniqueId,
          ud,
        },
      },
      ...(body.datafast_session_id && body.datafast_visitor_id
        ? {
            metadata: {
              datafast_visitor_id: body.datafast_visitor_id,
              datafast_session_id: body.datafast_session_id,
            },
          }
        : {}),
      // Stripe allows either a pre-applied promotion or the code field
      ...(autoApplyPromoCode
        ? { discounts: [{ promotion_code: autoApplyPromoCode }] }
        : { allow_promotion_codes: body.period === 'MONTHLY' }),
      line_items: [
        {
          price,
          quantity: 1,
        },
      ],
    });

    return {
      client_secret,
      check: uniqueId,
    };
  }

  private async createCheckoutSession(
    ud: string,
    uniqueId: string,
    customer: string,
    body: BillingSubscribeDto,
    price: string,
    userId: string,
    allowTrial: boolean
  ) {
    const isUtm = body.utm ? `&utm_source=${body.utm}` : '';

    if (body.dub) {
      await stripe.customers.update(customer, {
        metadata: {
          dubCustomerExternalId: userId,
          dubClickId: body.dub,
        },
      });
    }

    const trialDays = await this.trialDaysFor(customer, body.billing);
    const { url } = await stripe.checkout.sessions.create({
      customer,
      cancel_url: process.env['FRONTEND_URL'] + `/billing?cancel=true${isUtm}`,
      success_url:
        process.env['FRONTEND_URL'] +
        `/launches?onboarding=true&trialStart=true&check=${uniqueId}${isUtm}`,
      mode: 'subscription',
      adaptive_pricing: { enabled: true },
      subscription_data: {
        ...(allowTrial && trialDays > 0
          ? { trial_period_days: trialDays }
          : {}),
        metadata: {
          service: 'gitroom',
          ...body,
          userId,
          uniqueId,
          ud,
        },
      },
      allow_promotion_codes: body.period === 'MONTHLY',
      line_items: [
        {
          price,
          quantity: 1,
        },
      ],
    });

    return { url };
  }

  async portalLink(organizationId: string) {
    const customer = await this.getCustomerByOrganizationId(organizationId);
    return this.createBillingPortalLink(customer);
  }

  async finishTrial(organization: Organization) {
    const customer = this.stripeCustomerId(organization);
    if (!customer) {
      return;
    }
    const list = (
      await stripe.subscriptions.list({
        customer,
      })
    ).data.filter((f) => f.status === 'trialing');

    return stripe.subscriptions.update(list[0].id, {
      trial_end: 'now',
    });
  }

  async checkDiscount(organization: Organization) {
    const customer = this.stripeCustomerId(organization);
    if (!process.env.STRIPE_DISCOUNT_ID || !customer) {
      return false;
    }

    const list = await stripe.charges.list({
      customer,
      limit: 1,
    });

    if (!list.data.filter((f) => f.amount > 1000).length) {
      return false;
    }

    const currentUserSubscription = {
      data: (
        await stripe.subscriptions.list({
          customer,
          status: 'all',
          expand: ['data.discounts'],
        })
      ).data.find((f) => f.status === 'active' || f.status === 'trialing'),
    };

    if (!currentUserSubscription) {
      return false;
    }

    if (
      currentUserSubscription.data?.items.data[0]?.price.recurring?.interval ===
        'year' ||
      currentUserSubscription.data?.discounts.length
    ) {
      return false;
    }

    return true;
  }

  async applyDiscount(organization: Organization) {
    const customer = this.stripeCustomerId(organization);
    const check = this.checkDiscount(organization);
    if (!check) {
      return false;
    }

    const currentUserSubscription = {
      data: (
        await stripe.subscriptions.list({
          customer,
          status: 'all',
          expand: ['data.discounts'],
        })
      ).data.find((f) => f.status === 'active' || f.status === 'trialing'),
    };

    await stripe.subscriptions.update(currentUserSubscription.data.id, {
      discounts: [
        {
          coupon: process.env.STRIPE_DISCOUNT_ID!,
        },
      ],
    });

    return true;
  }

  async checkSubscription(organizationId: string, subscriptionId: string) {
    const orgValue = await this._subscriptionService.checkSubscription(
      organizationId,
      subscriptionId
    );

    if (orgValue) {
      return 2;
    }

    const getCustomerSubscriptions = await this.getCustomerSubscriptions(
      organizationId
    );
    if (getCustomerSubscriptions.data.length === 0) {
      return 0;
    }

    if (
      getCustomerSubscriptions.data.find(
        (p) => p.metadata.uniqueId === subscriptionId
      )?.canceled_at
    ) {
      return 1;
    }

    return 0;
  }

  // The Stripe price for a plan and period: found by amount on the tier's
  // product, created when the admin changed the plan's price.
  private async findOrCreatePrice(body: BillingSubscribeDto) {
    const priceData = (await this._plans.getPricing())[body.billing];
    const amount =
      (body.period === 'MONTHLY'
        ? priceData.month_price
        : priceData.year_price) * 100;
    const allProducts = await stripe.products.list({
      active: true,
      limit: 100,
    });

    // Products are keyed by tier (metadata, or the name on older products)
    // and carry the plan's name, which Checkout, invoices and the portal show.
    const name = await this._plans.getPlanName(body.billing);
    const existing =
      allProducts.data.find((product) => product.metadata?.tier === body.billing) ||
      allProducts.data.find(
        // Products created before plan names: named exactly as the tier
        (product) => !product.metadata?.tier && product.name === body.billing
      );
    const findProduct = existing
      ? existing.name === name && existing.metadata?.tier === body.billing
        ? existing
        : await stripe.products.update(existing.id, {
            name,
            metadata: { tier: body.billing },
          })
      : await stripe.products.create({
          active: true,
          name,
          metadata: { tier: body.billing },
        });

    const pricesList = await stripe.prices.list({
      active: true,
      product: findProduct!.id,
      limit: 100,
    });

    return (
      pricesList.data.find(
        (p) =>
          p?.recurring?.interval?.toLowerCase() ===
            (body.period === 'MONTHLY' ? 'month' : 'year') &&
          p?.unit_amount === amount
      ) ||
      (await stripe.prices.create({
        active: true,
        product: findProduct!.id,
        currency: 'usd',
        nickname: body.billing + ' ' + body.period,
        unit_amount: amount,
        recurring: {
          interval: body.period === 'MONTHLY' ? 'month' : 'year',
        },
      }))
    );
  }

  // The plan's trial, longer for a workspace an affiliate brought
  private async trialDaysFor(customer: string, tier: string) {
    const days = await this._plans.getTrialDays(tier);
    const org = await this._organizationService.getOrgByCustomerId(customer);
    return org ? this._partners.trialDaysFor(org.id, days) : days;
  }

  // "Skip for now": the plan's free trial without a card. Stripe cancels the
  // subscription when the trial ends without a payment method, and the
  // deleted webhook puts the workspace back on the paywall.
  async startTrial(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ) {
    // Only a plan on sale can be tried, and only with its own trial length
    const plan = await this._plans.getActivePlan(body.billing);
    const trialDays =
      allowTrial && plan
        ? await this._partners.trialDaysFor(organizationId, plan.trialDays)
        : 0;
    if (!trialDays) {
      throw new BadRequestException('This plan has no free trial to start');
    }
    const id = makeId(10);
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    if ((await this.getLiveSubscriptions(customer)).length) {
      return { blocked: true };
    }
    const price = await this.findOrCreatePrice(body);
    await stripe.subscriptions.create({
      customer,
      items: [{ price: price.id, quantity: 1 }],
      trial_period_days: trialDays,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: {
        service: 'gitroom',
        ...body,
        userId,
        uniqueId: id,
        ud: uniqueId,
      },
    });
    return { check: id };
  }

  // Trial end and whether a card is on file, for the in-app trial banner
  async getTrialInfo(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    const [subscription] = await this.getLiveSubscriptions(
      this.stripeCustomerId(org)
    );
    if (!subscription || subscription.status !== 'trialing') {
      return null;
    }
    const methods = await stripe.paymentMethods.list({
      customer: subscription.customer as string,
      limit: 1,
    });
    return {
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      hasPaymentMethod:
        !!subscription.default_payment_method || methods.data.length > 0,
    };
  }

  // AI credits top-up: a one-time payment in Embedded Checkout. The pack and
  // the workspace travel in the session metadata; the webhook credits them.
  async embeddedAiCredits(
    organizationId: string,
    userId: string,
    packId: string
  ) {
    const pack = aiCreditPacks.find((p) => p.id === packId)!;
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);

    const { id, client_secret } = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      redirect_on_completion: 'never',
      customer,
      mode: 'payment',
      adaptive_pricing: { enabled: true },
      metadata: {
        service: 'gitroom',
        type: 'ai_credits',
        organizationId,
        userId,
        credits: String(pack.credits),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: pack.amount,
            product_data: {
              name: `${pack.credits} AI credits`,
            },
          },
        },
      ],
    });

    return {
      client_secret,
      check: id,
    };
  }

  // Webhook: credits a paid top-up once (keyed by the session id). Must not
  // throw: a failure is logged with what is needed to credit it by hand.
  async aiCreditsPaid(
    event:
      | Stripe.CheckoutSessionCompletedEvent
      | Stripe.CheckoutSessionAsyncPaymentSucceededEvent
  ) {
    try {
      const session = event.data.object;
      if (
        session.mode !== 'payment' ||
        session.metadata?.type !== 'ai_credits' ||
        session.payment_status !== 'paid' ||
        !session.metadata?.organizationId
      ) {
        return { ok: true };
      }

      const credits = parseInt(session.metadata.credits || '', 10);
      if (!Number.isFinite(credits) || credits <= 0) {
        console.error('AI credits checkout without a credits amount', session.id);
        return { ok: true };
      }

      await this._subscriptionService.addAiCreditPurchase(
        session.id,
        session.metadata.organizationId,
        credits,
        session.amount_total || 0,
        session.currency || 'usd',
        'stripe'
      );
    } catch (e) {
      console.error('Error processing AI credits payment:', e);
    }

    return { ok: true };
  }

  async embedded(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ) {
    const id = makeId(10);
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    if ((await this.getLiveSubscriptions(customer)).length) {
      return { blocked: true };
    }
    const findPrice = await this.findOrCreatePrice(body);

    return this.createEmbeddedCheckout(
      uniqueId,
      id,
      customer,
      body,
      findPrice!.id,
      userId,
      allowTrial
    );
  }

  async subscribe(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ) {
    const id = makeId(10);
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const findPrice = await this.findOrCreatePrice(body);

    const getCurrentSubscriptions =
      await this._subscriptionService.getSubscription(organizationId);

    if (!getCurrentSubscriptions) {
      return this.createCheckoutSession(
        uniqueId,
        id,
        customer,
        body,
        findPrice!.id,
        userId,
        allowTrial
      );
    }

    // A plan granted by an admin has no Stripe subscription to change: the
    // app takes the workspace through Checkout for the new plan instead
    if (!(await this.getLiveSubscriptions(customer)).length) {
      return { checkout: true };
    }

    const currentUserSubscription = {
      data: (
        await stripe.subscriptions.list({
          customer,
          status: 'all',
        })
      ).data.filter((f) => f.status === 'active' || f.status === 'trialing'),
    };

    try {
      await stripe.subscriptions.update(currentUserSubscription.data[0].id, {
        cancel_at_period_end: false,
        metadata: {
          service: 'gitroom',
          ...body,
          userId,
          id,
          ud: uniqueId,
        },
        proration_behavior: 'always_invoice',
        items: [
          {
            id: currentUserSubscription.data[0].items.data[0].id,
            price: findPrice!.id,
            quantity: 1,
          },
        ],
      });

      return { id };
    } catch (err) {
      const { url } = await this.createBillingPortalLink(customer);
      return {
        portal: url,
      };
    }
  }

  async paymentSucceeded(event: Stripe.InvoicePaymentSucceededEvent) {
    // get subscription from payment
    const subscriptionId =
      event.data.object.parent?.subscription_details?.subscription;
    if (!subscriptionId) {
      return { ok: true };
    }
    const subscription = await stripe.subscriptions.retrieve(
      typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id
    );

    const { userId, ud } = subscription.metadata;
    const user = await this._userService.getUserById(userId);
    if (user && user.ip && user.agent) {
      this._trackService.track(ud, user.ip, user.agent, TrackEnum.Purchase, {
        value: event.data.object.amount_paid / 100,
      });
    }

    // A trial's $0 invoice is not a payment: founder spots and partner
    // rewards start at the first invoice that took money
    if (
      event.data.object.amount_paid > 0 &&
      subscription.metadata?.service === 'gitroom'
    ) {
      const customer =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
      if (subscription.metadata.billing) {
        await this._plans.recordFounderSpot(
          customer,
          subscription.metadata.billing,
          subscription.items?.data?.[0]?.price?.unit_amount ?? null
        );
      }
      await this.recordPartnerInvoice(event.data.object, subscription, customer);
    }

    return { ok: true };
  }

  // Partners program: a paid invoice of a referred workspace, in USD cents
  // without tax. Webhook path: logs, never throws.
  private async recordPartnerInvoice(
    invoice: Stripe.Invoice,
    subscription: Stripe.Subscription,
    customer: string
  ) {
    try {
      const org = await this._organizationService.getOrgByCustomerId(customer);
      if (!org || !(await this._partners.isReferred(org.id))) {
        return;
      }
      const taxes = (invoice.total_taxes || []).reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );
      const paid = Math.max(0, invoice.amount_paid - taxes);
      const price = subscription.items?.data?.[0]?.price;
      // Adaptive Pricing can settle in the local currency: the USD price
      // scaled by the share of the invoice that was paid
      const amountCents =
        invoice.currency === 'usd'
          ? paid
          : price?.currency === 'usd' && price.unit_amount
          ? Math.round(
              (price.unit_amount * paid) /
                Math.max(1, invoice.subtotal || invoice.amount_paid)
            )
          : 0;
      const payment = await this.invoicePayment(invoice.id!);
      await this._partners.invoicePaid({
        invoiceId: invoice.id!,
        organizationId: org.id,
        customerId: customer,
        paymentId: payment.paymentIntentId,
        amountCents,
        currency: invoice.currency,
        interval:
          (price?.recurring?.interval as 'month' | 'year' | undefined) || null,
        paidAt: new Date(
          (invoice.status_transitions?.paid_at || invoice.created) * 1000
        ),
        paymentFingerprints: payment.fingerprint ? [payment.fingerprint] : [],
      });
    } catch (err) {
      console.error('stripe_partner_invoice_failed', {
        stripe_invoice_id: invoice?.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // The payment intent that paid an invoice and its card's fingerprint
  private async invoicePayment(invoiceId: string) {
    const payments = await stripe.invoicePayments.list({
      invoice: invoiceId,
      limit: 5,
    });
    const paid = payments.data.find(
      (p) => p.status === 'paid' && p.payment?.payment_intent
    );
    const intent = paid?.payment?.payment_intent;
    const paymentIntentId =
      typeof intent === 'string' ? intent : intent?.id || null;
    if (!paymentIntentId) {
      return { paymentIntentId: null, fingerprint: null };
    }
    const retrieved = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });
    const charge = retrieved.latest_charge as Stripe.Charge | null;
    return {
      paymentIntentId,
      fingerprint: charge?.payment_method_details?.card?.fingerprint || null,
    };
  }

  // A new invoice (still a draft, finalised about an hour later): apply the
  // balance the workspace earned so this invoice already uses it
  async invoiceCreated(event: Stripe.InvoiceCreatedEvent) {
    try {
      const customer = event.data.object.customer;
      const id = typeof customer === 'string' ? customer : customer?.id;
      const org = id
        ? await this._organizationService.getOrgByCustomerId(id)
        : null;
      if (org) {
        await this._partners.settleForOrganization(org.id);
      }
    } catch (err) {
      console.error('stripe_invoice_created_failed', {
        stripe_event_id: event.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return { ok: true };
  }

  async chargeRefunded(event: Stripe.ChargeRefundedEvent) {
    const charge = event.data.object;
    const intent = charge.payment_intent;
    const paymentId = typeof intent === 'string' ? intent : intent?.id;
    if (paymentId && charge.amount > 0) {
      await this._partners.paymentReversed({
        paymentId,
        ratio: charge.amount_refunded / charge.amount,
        at: new Date(event.created * 1000),
        reason: 'refund',
      });
    }
    return { ok: true };
  }

  async chargeDisputed(event: Stripe.ChargeDisputeCreatedEvent) {
    const intent = event.data.object.payment_intent;
    const paymentId = typeof intent === 'string' ? intent : intent?.id;
    if (paymentId) {
      await this._partners.paymentReversed({
        paymentId,
        ratio: 1,
        at: new Date(event.created * 1000),
        reason: 'dispute',
      });
    }
    return { ok: true };
  }

  // A credit on the customer's Stripe balance, used by its next invoices.
  // Only USD balances: a customer billed in another currency is left to the
  // admin (granted: false keeps the reward).
  async grantAccountCredit(
    organizationId: string,
    amountCents: number,
    reason: string,
    idempotencyKey: string
  ) {
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = this.stripeCustomerId(org);
    if (!customer || amountCents <= 0) {
      return { granted: false, reason: 'no_customer' };
    }
    const current = await stripe.customers.retrieve(customer);
    if (current.deleted) {
      return { granted: false, reason: 'no_customer' };
    }
    const currency = (current as Stripe.Customer).currency;
    if (currency && currency !== 'usd') {
      return { granted: false, reason: `currency_${currency}` };
    }
    await stripe.customers.createBalanceTransaction(
      customer,
      {
        amount: -amountCents,
        currency: 'usd',
        description: reason,
        metadata: { service: 'gitroom', organizationId, reward: idempotencyKey },
      },
      { idempotencyKey: `tadween_${idempotencyKey}` }
    );
    return { granted: true };
  }

  async getPaymentFingerprints(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = this.stripeCustomerId(org);
    if (!customer) {
      return [];
    }
    const methods = await stripe.paymentMethods.list({
      customer,
      type: 'card',
      limit: 20,
    });
    return methods.data
      .map((m) => m.card?.fingerprint)
      .filter((f): f is string => !!f);
  }

  async getCharges(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = this.stripeCustomerId(org);
    if (!customer) {
      return [];
    }

    const charges = await stripe.charges.list({
      customer,
      limit: 100,
    });

    const chargeList = charges.data
      .filter((f) => f.status === 'succeeded')
      .map((charge) => ({
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        created: charge.created,
        status: charge.status,
        refunded: charge.refunded,
        amount_refunded: charge.amount_refunded,
        description: charge.description,
        receipt_url: charge.receipt_url || null,
        invoice: (charge as any).invoice || null,
      }));

    const invoiceIds = chargeList
      .map((c) => c.invoice)
      .filter((id): id is string => !!id && typeof id === 'string');

    const invoicePdfMap: Record<string, string> = {};
    for (const invoiceId of invoiceIds) {
      try {
        const inv = await stripe.invoices.retrieve(invoiceId);
        if (inv.invoice_pdf) {
          invoicePdfMap[invoiceId] = inv.invoice_pdf;
        }
      } catch {
        // ignore if invoice can't be fetched
      }
    }

    return chargeList.map((charge) => ({
      ...charge,
      invoice_pdf:
        charge.invoice && invoicePdfMap[charge.invoice as string]
          ? invoicePdfMap[charge.invoice as string]
          : null,
    }));
  }

  async refundCharges(organizationId: string, chargeIds: string[]) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (!this.stripeCustomerId(org)) {
      throw new Error('No payment customer found for this organization');
    }

    const refunded: string[] = [];
    const failed: string[] = [];

    for (const chargeId of chargeIds) {
      try {
        await stripe.refunds.create({ charge: chargeId });
        refunded.push(chargeId);
      } catch (err) {
        failed.push(chargeId);
      }
    }

    return { refunded, failed };
  }

  async cancelSubscription(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = this.stripeCustomerId(org);
    if (!customer) {
      throw new Error('No payment customer found for this organization');
    }

    const subscriptions = await this.getLiveSubscriptions(customer);

    if (!subscriptions.length) {
      throw new Error('No active subscription found');
    }

    for (const subscription of subscriptions) {
      await stripe.subscriptions.cancel(subscription.id);
    }
    await this._subscriptionService.deleteSubscription(
      customer,
      STRIPE_PROVIDER
    );

    return { cancelled: true };
  }

  private mapSubscriptionDiscounts(subscription?: Stripe.Subscription) {
    return (subscription?.discounts || [])
      .filter(
        (discount): discount is Stripe.Discount => typeof discount !== 'string'
      )
      .map((discount) => {
        const coupon =
          typeof discount.source?.coupon === 'string'
            ? null
            : discount.source?.coupon;
        return {
          type: coupon?.percent_off ? 'percentage' : 'amount',
          value: coupon?.percent_off || (coupon?.amount_off || 0) / 100,
          duration: coupon?.duration || 'once',
          durationInMonths: coupon?.duration_in_months || null,
          remainingMonths: discount.end
            ? Math.max(
                0,
                Math.ceil(
                  (discount.end - Date.now() / 1000) / (30 * 24 * 60 * 60)
                )
              )
            : null,
        };
      });
  }

  private async getActiveStripeSubscription(paymentId?: string | null) {
    if (!paymentId || !paymentId.startsWith('cus_')) {
      return undefined;
    }

    return (
      await stripe.subscriptions.list({
        customer: paymentId,
        status: 'all',
        expand: ['data.discounts.source.coupon'],
      })
    ).data.find((f) => f.status === 'active' || f.status === 'trialing');
  }

  async getCouponInfo(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    const subscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );

    const stripeSubscription = await this.getActiveStripeSubscription(
      this.stripeCustomerId(org)
    );

    const coupons = this.mapSubscriptionDiscounts(stripeSubscription);
    const priceData = subscription
      ? (await this._plans.getPricing())[subscription.subscriptionTier]
      : undefined;
    // A locked founder price stays what the subscription pays after the
    // plan's price changed: Stripe's price (stored by the webhooks) wins
    const paid =
      typeof subscription?.priceCents === 'number'
        ? subscription.priceCents / 100
        : null;
    const monthlyPrice =
      paid !== null && subscription?.period === 'MONTHLY'
        ? paid
        : priceData?.month_price || 0;

    let nextPayment: number | null = null;
    if (stripeSubscription) {
      try {
        const preview = await stripe.invoices.createPreview({
          customer: this.stripeCustomerId(org)!,
          subscription: stripeSubscription.id,
        });
        nextPayment = preview.total / 100;
      } catch (err) {
        /* no upcoming invoice */
      }
    }

    return {
      tier: subscription?.subscriptionTier || null,
      period: subscription?.period || null,
      isLifetime: !!subscription?.isLifetime,
      monthlyPrice,
      planPrice:
        subscription?.period === 'YEARLY'
          ? paid ?? (priceData?.year_price || 0)
          : monthlyPrice,
      nextPayment,
      coupons,
      supported:
        !!subscription &&
        !!stripeSubscription &&
        subscription.period === 'MONTHLY' &&
        !subscription.isLifetime &&
        !coupons.length,
    };
  }

  async applyCoupon(
    organizationId: string,
    body: { type: string; value: number; months: number }
  ) {
    const info = await this.getCouponInfo(organizationId);
    if (!info.supported) {
      return {
        applied: false,
        reason: 'Applying a coupon is not supported for this user',
      };
    }

    if (
      body.type === 'percentage'
        ? body.value < 1 || body.value > 100
        : body.value < 1 || body.value > info.monthlyPrice
    ) {
      return { applied: false, reason: 'Invalid coupon value' };
    }

    const org = await this._organizationService.getOrgById(organizationId);
    const stripeSubscription = await this.getActiveStripeSubscription(
      org?.paymentId
    );

    if (!stripeSubscription) {
      return {
        applied: false,
        reason: 'No active subscription found for this customer',
      };
    }

    const coupon = await stripe.coupons.create({
      name: `Admin coupon for ${org!.name}`,
      ...(body.type === 'percentage'
        ? { percent_off: body.value }
        : { amount_off: Math.round(body.value * 100), currency: 'usd' }),
      ...(body.months === 1
        ? { duration: 'once' }
        : { duration: 'repeating', duration_in_months: body.months }),
      metadata: { service: 'gitroom', organizationId },
    });

    await stripe.subscriptions.update(stripeSubscription.id, {
      discounts: [
        {
          coupon: coupon.id,
        },
      ],
    });

    return { applied: true };
  }

  async cancelCoupon(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    const stripeSubscription = await this.getActiveStripeSubscription(
      org?.paymentId
    );

    if (!stripeSubscription) {
      return {
        cancelled: false,
        reason: 'No active subscription found for this customer',
      };
    }

    if (!stripeSubscription.discounts.length) {
      return {
        cancelled: false,
        reason: 'No coupon is applied to this subscription',
      };
    }

    await stripe.subscriptions.deleteDiscount(stripeSubscription.id);

    return { cancelled: true };
  }

  async chatbaseRefundPreview(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = this.stripeCustomerId(org);
    if (!customer) {
      return {
        eligible: false as const,
        reason: 'No payment customer found for this organization',
      };
    }

    const subscriptions = (
      await stripe.subscriptions.list({
        customer,
        status: 'all',
      })
    ).data.filter((f) => f.status !== 'canceled');

    if (!subscriptions.length) {
      return {
        eligible: false as const,
        reason: 'No active subscription found for this customer',
      };
    }

    const charges = (
      await stripe.charges.list({
        customer,
        limit: 100,
      })
    ).data.filter((f) => f.status === 'succeeded');

    if (charges.some((f) => f.refunded || f.amount_refunded > 0)) {
      return {
        eligible: false as const,
        reason: 'A refund was already issued for this customer',
      };
    }

    // only refund a charge that was created by the active subscription,
    // never a one-off payment
    let lastCharge: (typeof charges)[number] | undefined = undefined;
    let chargeSubscription: (typeof subscriptions)[number] | undefined =
      undefined;

    for (const charge of charges) {
      const invoiceId = (charge as any).invoice;
      if (!invoiceId || typeof invoiceId !== 'string') {
        continue;
      }

      try {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        const invoiceSubscription =
          invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof invoiceSubscription === 'string'
            ? invoiceSubscription
            : invoiceSubscription?.id;

        chargeSubscription = subscriptions.find((f) => f.id === subscriptionId);

        if (chargeSubscription) {
          lastCharge = charge;
          break;
        }
      } catch {
        // ignore if invoice can't be fetched
      }
    }

    if (!lastCharge || !chargeSubscription) {
      return {
        eligible: false as const,
        reason: 'No subscription payment found for this customer',
      };
    }

    const sixtyDaysAgo = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60;
    if (lastCharge.created < sixtyDaysAgo) {
      return {
        eligible: false as const,
        reason: 'The last subscription payment is older than 60 days',
      };
    }

    const interval =
      chargeSubscription.items?.data?.[0]?.price?.recurring?.interval;

    // maximum refund is one month worth of the subscription
    const amount =
      interval === 'year'
        ? Math.floor(lastCharge.amount / 12)
        : lastCharge.amount;

    const currentSubscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );

    return {
      eligible: true as const,
      chargeId: lastCharge.id,
      amount: amount / 100,
      currency: lastCharge.currency,
      tier: currentSubscription?.subscriptionTier || null,
      period: currentSubscription?.period || null,
      subscriptionIds: subscriptions.map((f) => f.id),
    };
  }

  async chatbaseRefund(organizationId: string) {
    const preview = await this.chatbaseRefundPreview(organizationId);
    if (!preview.eligible) {
      return {
        refunded: false,
        reason: preview.reason,
      };
    }

    const org = await this._organizationService.getOrgById(organizationId);

    await stripe.refunds.create({
      charge: preview.chargeId,
      amount: Math.round(preview.amount * 100),
      metadata: {
        reason: 'chatbase_refund',
        organizationId,
      },
    });

    for (const subscriptionId of preview.subscriptionIds) {
      await stripe.subscriptions.cancel(subscriptionId);
    }

    if (preview.subscriptionIds.length) {
      await this._subscriptionService.deleteSubscription(
        org?.paymentId!,
        STRIPE_PROVIDER
      );
    }

    return {
      refunded: true,
      amount: preview.amount,
      currency: preview.currency,
      subscriptionCancelled: preview.subscriptionIds.length > 0,
    };
  }

  async lifetimeDeal(organizationId: string, code: string) {
    const getCurrentSubscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    if (getCurrentSubscription && !getCurrentSubscription?.isLifetime) {
      throw new Error('You already have a non lifetime subscription');
    }

    try {
      const testCode = AuthService.fixedDecryption(code);
      const findCode = await this._subscriptionService.getCode(testCode);
      if (findCode) {
        return {
          success: false,
        };
      }

      const nextPackage = !getCurrentSubscription ? 'STANDARD' : 'PRO';
      const findPricing = pricing[nextPackage];

      await this._subscriptionService.createOrUpdateSubscription(
        STRIPE_PROVIDER,
        false,
        makeId(10),
        organizationId,
        getCurrentSubscription?.subscriptionTier === 'PRO'
          ? getCurrentSubscription.totalChannels + 5
          : findPricing.channel!,
        nextPackage,
        'MONTHLY',
        null,
        testCode,
        organizationId
      );
      return {
        success: true,
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
      };
    }
  }
}
