import { HttpException, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import {
  PartnerPayoutPreference,
  PartnerStatus,
  Prisma,
  ReferralSource,
  ReferralStatus,
} from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import {
  PartnerRow,
  PartnersRepository,
  RewardRow,
} from '@gitroom/nestjs-libraries/database/prisma/partners/partners.repository';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { PaymentService } from '@gitroom/nestjs-libraries/services/payment/payment.service';
import { PlansService } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.service';
import {
  PARTNERS,
  REFERRER_LADDER,
} from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';
import {
  paging,
  sorting,
} from '@gitroom/nestjs-libraries/database/prisma/tadween/admin-console.service';
import {
  AdminPartnersQueryDto,
  AdminReferralsQueryDto,
} from '@gitroom/nestjs-libraries/dtos/partners/partners.dto';
import { AdminListQueryDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.list.dto';

// Sortable columns of the console lists (anything else: the first entry)
const PARTNER_SORT: Record<
  string,
  (order: Prisma.SortOrder) => Prisma.PartnerOrderByWithRelationInput
> = {
  createdAt: (order) => ({ createdAt: order }),
  code: (order) => ({ code: order }),
  referrals: (order) => ({ referrals: { _count: order } }),
};

const REFERRAL_SORT: Record<
  string,
  (order: Prisma.SortOrder) => Prisma.ReferralOrderByWithRelationInput
> = {
  signedUpAt: (order) => ({ signedUpAt: order }),
  firstPaidAt: (order) => ({ firstPaidAt: order }),
  status: (order) => ({ status: order }),
};

const DAY = 24 * 60 * 60 * 1000;
// No 0/O/1/I/L: codes are read out loud and typed from a post
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// A paid invoice of any workspace, as the payment provider reports it.
// `amountCents` is what was paid in USD cents, excluding tax.
export interface PaidInvoiceEvent {
  invoiceId: string;
  organizationId: string;
  customerId: string | null;
  paymentId: string | null;
  amountCents: number;
  currency: string;
  interval: 'month' | 'year' | null;
  paidAt: Date;
  // cards that paid it (to refuse a referral paid with the referrer's card)
  paymentFingerprints: string[];
  // already refunded or disputed when this event is handled (the provider's
  // refund / dispute event can arrive before the paid-invoice one)
  reversed?: { ratio: number; reason: 'refund' | 'dispute' } | null;
}

// A refund or a dispute on a payment. `ratio` is the part taken back (0-1).
export interface PaymentReversedEvent {
  paymentId: string;
  ratio: number;
  at: Date;
  reason: 'refund' | 'dispute';
}

export const normalizeCode = (code?: string | null) => {
  const value = (code || '').trim().toUpperCase();
  return /^[A-Z0-9_-]{3,32}$/.test(value) ? value : null;
};

// "Acme Studio" → "AS": the referrer sees initials, never names or people
const initials = (name?: string | null) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toUpperCase() || '')
    .join('') || '?';

const tierFor = (paying: number) =>
  [...PARTNERS.tierRates].reverse().find((t) => paying >= t.minPaying) ||
  PARTNERS.tierRates[0];

const startOfMonth = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};

const mask = (value?: string | null) =>
  value ? `•••• ${value.replace(/\s+/g, '').slice(-4)}` : null;

// Tadween partners program: attribution at sign-up, rewards from paid
// invoices (webhooks), clawback on refunds, the referrer ladder, affiliate
// commission and payouts. docs/tadween/partners.md has the rules. Everything
// reached from a payment webhook logs and never throws.
@Injectable()
export class PartnersService {
  constructor(
    private _repository: PartnersRepository,
    private _settings: PlatformSettingsService,
    private _subscriptions: SubscriptionService,
    private _payments: PaymentService,
    private _plans: PlansService
  ) {}

  async enabled() {
    try {
      return (await this._settings.getFeatures()).affiliate === true;
    } catch (e) {
      return false;
    }
  }

  private async assertEnabled() {
    if (!(await this.enabled())) {
      throw new HttpException('Not found', 404);
    }
  }

  // ── Partner rows ───────────────────────────────────────────────────────────
  private async createWithCode(data: {
    organizationId: string;
    userId: string;
    kind?: 'REFERRER' | 'AFFILIATE';
    approvedAt?: Date;
    approvedById?: string;
  }): Promise<PartnerRow> {
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = Array.from(
        { length: 8 },
        () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
      ).join('');
      try {
        return await this._repository.createPartner({ ...data, code });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          // the workspace got its row in a parallel request: use that one
          const existing = await this._repository.getPartnerByOrganization(
            data.organizationId
          );
          if (existing) {
            return existing;
          }
          continue; // code collision: try another code
        }
        throw e;
      }
    }
    throw new HttpException('Could not create a referral code', 500);
  }

  // Every workspace has a REFERRER code, made the first time it is needed
  async ensurePartner(organizationId: string, userId: string) {
    return (
      (await this._repository.getPartnerByOrganization(organizationId)) ||
      (await this.createWithCode({ organizationId, userId }))
    );
  }

  // ── Attribution ────────────────────────────────────────────────────────────
  // At sign-up (the `ref` cookie or link, source LINK) or from "Who invited
  // you?" (source CODE). One referral per workspace; it never changes.
  // Self-referrals are refused; a shared sign-up IP or browser is flagged.
  async attribute(
    organizationId: string,
    userId: string,
    rawCode: string | undefined | null,
    source: ReferralSource
  ): Promise<{ ok: boolean; reason?: string }> {
    const code = normalizeCode(rawCode);
    if (!code || !(await this.enabled())) {
      return { ok: false, reason: 'invalid_code' };
    }
    const partner = await this._repository.getPartnerByCode(code);
    if (!partner || partner.status !== 'ACTIVE') {
      return { ok: false, reason: 'invalid_code' };
    }
    if (
      partner.organizationId === organizationId ||
      partner.userId === userId ||
      (await this._repository.isMember(userId, partner.organizationId))
    ) {
      return { ok: false, reason: 'self_referral' };
    }
    if (await this._repository.getReferralByOrganization(organizationId)) {
      return { ok: false, reason: 'already_referred' };
    }

    // flag, don't block: the referrer's members signed up from the same IP
    // or browser as the new user
    const [referred] = await this._repository.getUsers([userId]);
    const members = (
      await this._repository.membersOf(partner.organizationId)
    ).map((m) => m.user);
    const fraudFlags = [
      referred?.ip && members.some((m) => m.ip === referred.ip)
        ? 'shared_ip'
        : null,
      referred?.agent && members.some((m) => m.agent === referred.agent)
        ? 'shared_agent'
        : null,
    ].filter(Boolean) as string[];

    try {
      await this._repository.createReferral({
        partnerId: partner.id,
        organizationId,
        userId,
        source,
        fraudFlags,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return { ok: false, reason: 'already_referred' };
      }
      throw e;
    }
    return { ok: true };
  }

  // Sign-up hook: registration must never fail because of a referral
  async attributeSignup(
    organizationId: string,
    userId: string,
    code?: string | null
  ) {
    if (!code) {
      return;
    }
    try {
      await this.attribute(organizationId, userId, code, 'LINK');
    } catch (e) {
      console.error('referral_not_attributed', {
        organization_id: organizationId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // "Who invited you?": a code typed in the first days after sign-up
  async claim(
    organization: { id: string; createdAt: Date },
    userId: string,
    code: string
  ) {
    await this.assertEnabled();
    if (
      Date.now() - new Date(organization.createdAt).getTime() >
      PARTNERS.claimWindowDays * DAY
    ) {
      throw new HttpException(
        `A code can be added during the first ${PARTNERS.claimWindowDays} days.`,
        400
      );
    }
    const result = await this.attribute(organization.id, userId, code, 'CODE');
    if (!result.ok) {
      throw new HttpException(
        result.reason === 'self_referral'
          ? 'You can’t use your own code.'
          : result.reason === 'already_referred'
          ? 'This workspace already has an inviter.'
          : 'This code doesn’t exist.',
        400
      );
    }
    return { ok: true };
  }

  // Free trial length for a workspace: an affiliate's audience gets longer
  async trialDaysFor(organizationId: string, planDays: number) {
    try {
      if (!planDays) {
        return planDays;
      }
      const referral = await this._repository.getReferralByOrganization(
        organizationId
      );
      return referral &&
        referral.status !== 'REJECTED' &&
        referral.partner.kind === 'AFFILIATE'
        ? Math.max(planDays, PARTNERS.affiliateTrialDays)
        : planDays;
    } catch (e) {
      return planDays;
    }
  }

  // What billing shows this workspace: the longer trial when an affiliate
  // brought it (no partner row is created)
  async invitedTrial(organizationId: string) {
    if (!(await this.enabled())) {
      return { trialDays: null };
    }
    const days = await this.trialDaysFor(organizationId, 1);
    return { trialDays: days > 1 ? days : null };
  }

  // ── Webhooks: paid invoices ────────────────────────────────────────────────
  // Cheap check before the provider looks up payment details
  async isReferred(organizationId: string) {
    const referral = await this._repository.getReferralByOrganization(
      organizationId
    );
    return !!referral && !['REJECTED', 'REFUNDED'].includes(referral.status);
  }

  // Any paid, non-zero invoice. Only referred workspaces do anything. Every
  // step is keyed by the invoice or the event, so a replay is a no-op.
  async invoicePaid(event: PaidInvoiceEvent) {
    try {
      const referral = await this._repository.getReferralByOrganization(
        event.organizationId
      );
      if (!referral || ['REJECTED', 'REFUNDED'].includes(referral.status)) {
        return;
      }
      const partner = referral.partner;

      await this._repository.addInvoice({
        id: event.invoiceId,
        referralId: referral.id,
        paymentId: event.paymentId,
        amountCents: event.amountCents,
        currency: event.currency,
        interval: event.interval,
        paidAt: event.paidAt,
      });

      let firstPaidAt = referral.firstPaidAt;
      if (referral.status === 'SIGNED_UP') {
        const selfReason = await this.selfReferralOnPayment(partner, event);
        if (selfReason) {
          await this._repository.moveReferral(referral.id, ['SIGNED_UP'], {
            status: 'REJECTED',
            rejectionReason: selfReason,
          });
          return;
        }
        firstPaidAt = event.paidAt;
        await this._repository.moveReferral(referral.id, ['SIGNED_UP'], {
          status: 'PAID',
          firstPaidAt,
        });
        // the referred workspace's own bonus, on its first payment
        const id = `fr_${referral.id}`;
        await this._repository.addReward({
          id,
          partnerId: null,
          organizationId: event.organizationId,
          referralId: referral.id,
          type: 'CREDITS',
          status: 'AVAILABLE',
          credits:
            partner.kind === 'AFFILIATE'
              ? PARTNERS.affiliateAudienceCredits
              : PARTNERS.friendCredits,
          note: 'friend_bonus',
        });
        await this.applyCredits(id);
      }

      if (partner.status === 'ACTIVE' && partner.kind === 'AFFILIATE') {
        await this.addCommission(partner, referral.id, firstPaidAt, event);
      }

      if (
        partner.kind === 'REFERRER' &&
        referral.status !== 'QUALIFIED' &&
        firstPaidAt &&
        event.paidAt.getTime() - firstPaidAt.getTime() >=
          PARTNERS.secondPaymentMinDays * DAY
      ) {
        if ((await this._repository.countPaidInvoices(referral.id)) >= 2) {
          await this._repository.moveReferral(referral.id, ['PAID'], {
            status: 'QUALIFIED',
            qualifiedAt: event.paidAt,
          });
        }
      }

      if (event.reversed && event.paymentId && event.reversed.ratio > 0) {
        await this.paymentReversed({
          paymentId: event.paymentId,
          ratio: event.reversed.ratio,
          at: event.paidAt,
          reason: event.reversed.reason,
        });
      }

      await this.settle(partner.id, true, event.paidAt);
    } catch (e) {
      console.error('partners_invoice_not_processed', {
        invoice_id: event.invoiceId,
        organization_id: event.organizationId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Same billing account or same card as the referrer: a self-referral
  private async selfReferralOnPayment(
    partner: PartnerRow,
    event: PaidInvoiceEvent
  ) {
    const [referrerOrg] = await this._repository.getOrganizations([
      partner.organizationId,
    ]);
    if (event.customerId && referrerOrg?.paymentId === event.customerId) {
      return 'same_billing_account';
    }
    // someone who is in both workspaces (joined the referrer's team, or
    // invited the referrer into theirs after signing up)
    const [referredMembers, referrerMembers] = await Promise.all([
      this._repository.membersOf(event.organizationId),
      this._repository.membersOf(partner.organizationId),
    ]);
    const referrerIds = new Set(referrerMembers.map((m) => m.user.id));
    if (referredMembers.some((m) => referrerIds.has(m.user.id))) {
      return 'shared_member';
    }
    if (event.paymentFingerprints.length) {
      const referrerCards = await this._payments.getPaymentFingerprints(
        partner.organizationId
      );
      if (event.paymentFingerprints.some((f) => referrerCards.includes(f))) {
        return 'same_card';
      }
    }
    return null;
  }

  // Affiliates: rate × what was paid (USD, no tax), for invoices within the
  // commission months from the first payment; held 30 days
  private async addCommission(
    partner: PartnerRow,
    referralId: string,
    firstPaidAt: Date | null,
    event: PaidInvoiceEvent
  ) {
    if (
      !firstPaidAt ||
      event.amountCents <= 0 ||
      event.paidAt >= addMonths(firstPaidAt, partner.commissionMonths)
    ) {
      return;
    }
    const paying = await this.payingCount(partner.id);
    const tier = tierFor(paying);
    if (tier.tier !== partner.tier) {
      await this._repository.updatePartner(partner.id, { tier: tier.tier });
    }
    const rate = partner.commissionRate ?? tier.rate;
    await this._repository.addReward({
      id: `com_${event.invoiceId}`,
      partnerId: partner.id,
      organizationId: partner.organizationId,
      referralId,
      type: 'COMMISSION',
      status: 'PENDING',
      amountCents: Math.round((event.amountCents * rate) / 100),
      rate,
      availableAt: new Date(event.paidAt.getTime() + PARTNERS.holdDays * DAY),
      invoiceId: event.invoiceId,
    });
  }

  private async payingCount(partnerId: string) {
    const referrals = await this._repository.referralsOf(partnerId);
    return this._repository.countPaying(
      referrals
        .filter((r) => r.status === 'PAID' || r.status === 'QUALIFIED')
        .map((r) => r.organizationId)
    );
  }

  // ── Webhooks: refunds and disputes ─────────────────────────────────────────
  // Commission of a refunded payment is cut by the refunded part: held
  // commission is voided, available commission is clawed back, commission
  // already paid out is subtracted from the next payout (a negative row).
  async paymentReversed(event: PaymentReversedEvent) {
    try {
      const invoice = await this._repository.findInvoiceByPayment(
        event.paymentId
      );
      if (!invoice) {
        return;
      }
      const ratio = Math.min(1, Math.max(0, event.ratio));
      if (ratio >= 1) {
        await this._repository.markInvoiceRefunded(invoice.id, event.at);
        // a referral whose only payments were refunded never counted
        if ((await this._repository.countPaidInvoices(invoice.referralId)) === 0) {
          await this._repository.moveReferral(invoice.referralId, ['PAID'], {
            status: 'REFUNDED',
          });
        }
      }

      const rewards = await this._repository.rewards({
        invoiceId: invoice.id,
        type: 'COMMISSION',
      });
      for (const reward of rewards) {
        if (reward.id.startsWith('cb_') || !reward.rate) {
          continue;
        }
        const original = Math.round((invoice.amountCents * reward.rate) / 100);
        const target = Math.round(original * (1 - ratio));
        await this.reduceCommission(reward, original, target, event.reason);
      }
    } catch (e) {
      console.error('partners_reversal_not_processed', {
        payment_id: event.paymentId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  private async reduceCommission(
    reward: RewardRow,
    original: number,
    target: number,
    reason: string
  ) {
    // only ever down: an older refund event arriving late changes nothing
    if (
      (reward.status === 'PENDING' || reward.status === 'AVAILABLE') &&
      !reward.payoutId
    ) {
      if (target >= reward.amountCents) {
        return;
      }
      const done = await this._repository.setRewardIfFree(
        reward.id,
        target > 0
          ? { amountCents: target, note: `reduced_${reason}` }
          : {
              status: reward.status === 'PENDING' ? 'VOID' : 'CLAWED_BACK',
              note: reason,
            }
      );
      if (done) {
        return;
      }
      // a payout took it meanwhile: handled like a paid reward below
      reward = (await this._repository.getReward(reward.id)) || reward;
    }
    if (
      (reward.status === 'PAID' || reward.status === 'APPLYING') &&
      reward.partnerId
    ) {
      // paid (or being paid) already: take it back from the next payout
      const id = `cb_${reward.id}`;
      const delta = target - original;
      const existing = await this._repository.getReward(id);
      if (!existing) {
        await this._repository.addReward({
          id,
          partnerId: reward.partnerId,
          organizationId: reward.organizationId,
          referralId: reward.referralId,
          type: 'COMMISSION',
          status: 'AVAILABLE',
          amountCents: delta,
          note: `clawback_${reason}`,
          invoiceId: reward.invoiceId,
        });
      } else if (delta < existing.amountCents) {
        await this._repository.setRewardIfFree(id, { amountCents: delta });
      }
      return;
    }
  }


  // ── Settling: holds, ladder, applying rewards ──────────────────────────────
  // Evaluated whenever a partner's data is read or one of its events arrives
  // (no cron). `apply` also grants account balance through the payment
  // provider; reads only do the database part.
  // `at`: the time of the webhook event being handled. The clock used is the
  // later of it and now, so Stripe test clocks (events in the future) can
  // move holds forward in test mode; live events are never ahead of now.
  async settle(partnerId: string, apply: boolean, at?: Date) {
    const partner = await this._repository.getPartnerById(partnerId);
    if (!partner) {
      return;
    }
    const now = new Date(Math.max(Date.now(), at?.getTime() || 0));

    // yearly plans count on the ladder 30 days after the first payment
    for (const r of await this._repository.dueYearlyReferrals(
      partner.id,
      new Date(now.getTime() - PARTNERS.yearlyQualifyDays * DAY)
    )) {
      await this._repository.moveReferral(r.id, ['PAID'], {
        status: 'QUALIFIED',
        qualifiedAt: new Date(
          r.firstPaidAt!.getTime() + PARTNERS.yearlyQualifyDays * DAY
        ),
      });
    }

    await this._repository.releaseHolds(partner.id, now);

    if (partner.kind === 'REFERRER' && partner.status === 'ACTIVE') {
      await this.climbLadder(partner);
    }

    // credits: database only, at most N credit rewards a month
    for (const reward of await this._repository.rewards({
      partnerId: partner.id,
      type: 'CREDITS',
      status: 'AVAILABLE',
    })) {
      const used = await this._repository.countCreditRewardsSince(
        partner.id,
        startOfMonth(now)
      );
      if (used >= PARTNERS.maxCreditRewardsPerMonth) {
        break;
      }
      await this.applyCredits(reward.id);
    }

    if (!apply) {
      return;
    }

    await this.recoverStuck(partner, now);

    for (const reward of await this._repository.rewards({
      partnerId: partner.id,
      type: 'ACCOUNT_CREDIT',
      status: 'AVAILABLE',
    })) {
      await this.applyFreeMonth(reward);
    }

    if (
      partner.kind === 'AFFILIATE' &&
      partner.status === 'ACTIVE' &&
      partner.payoutPreference === 'BALANCE'
    ) {
      await this.payCommissionAsBalance(partner);
    }
  }

  // Webhook entry for a workspace's own invoice (before it is finalised):
  // apply what the workspace earned so it lands on this invoice
  async settleForOrganization(organizationId: string, at?: Date) {
    try {
      const partner = await this._repository.getPartnerByOrganization(
        organizationId
      );
      if (partner) {
        await this.settle(partner.id, true, at);
      }
    } catch (e) {
      console.error('partners_settle_failed', {
        organization_id: organizationId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  private async climbLadder(partner: PartnerRow) {
    const qualified = await this._repository.countReferrals(partner.id, [
      'QUALIFIED',
    ]);
    for (const step of REFERRER_LADDER.filter((s) => s.step <= qualified)) {
      const id = `ms_${partner.id}_${step.step}`;
      const base = {
        id,
        partnerId: partner.id,
        organizationId: partner.organizationId,
        step: step.step,
        status: 'AVAILABLE' as const,
      };
      const created =
        step.reward === 'credits'
          ? await this._repository.addReward({
              ...base,
              type: 'CREDITS',
              credits: step.credits || 0,
            })
          : step.reward === 'free_month'
          ? await this._repository.addReward({
              ...base,
              type: 'ACCOUNT_CREDIT',
              note: 'free_month',
            })
          : // applied by the super admin (Admin → Growth → Partners)
            await this._repository.addReward({
              ...base,
              type: 'UPGRADE',
              note: step.reward,
            });
      if (created && step.ambassador && !partner.ambassador) {
        await this._repository.updatePartner(partner.id, { ambassador: true });
      }
    }
  }

  // Credits go through the AI credits ledger (AiCreditPurchase, id = reward)
  private async applyCredits(rewardId: string) {
    const reward = await this._repository.getReward(rewardId);
    if (!reward || reward.status !== 'AVAILABLE' || reward.credits <= 0) {
      return;
    }
    if (!(await this._repository.claimReward(reward.id))) {
      return;
    }
    const added = await this._subscriptions.addAiCreditPurchase(
      reward.id,
      reward.organizationId,
      reward.credits,
      0,
      'usd',
      'referral'
    );
    await this._repository.setReward(
      reward.id,
      added
        ? { status: 'PAID', appliedAt: new Date() }
        : { status: 'AVAILABLE' }
    );
  }

  // One month of the referrer's current plan, as account balance
  private async applyFreeMonth(reward: RewardRow) {
    const subscription =
      await this._subscriptions.getSubscriptionByOrganizationId(
        reward.organizationId
      );
    if (!subscription || subscription.isLifetime) {
      return; // stays available until the workspace subscribes
    }
    const monthCents =
      subscription.period === 'MONTHLY' &&
      typeof subscription.priceCents === 'number'
        ? subscription.priceCents
        : ((await this._plans.getPricing())[subscription.subscriptionTier]
            ?.month_price || 0) * 100;
    if (monthCents <= 0 || !(await this._repository.claimReward(reward.id))) {
      return;
    }
    await this._repository.setReward(reward.id, { amountCents: monthCents });
    await this.grantFreeMonth(reward.id, reward.organizationId, monthCents);
  }

  private async grantFreeMonth(
    rewardId: string,
    organizationId: string,
    monthCents: number
  ) {
    const result = await this._payments.grantAccountCredit(
      organizationId,
      monthCents,
      'Invite & earn: free month',
      rewardId
    );
    if (result.reason === 'error') {
      // unknown outcome: stays APPLYING and is retried with the same key
      return;
    }
    await this._repository.setReward(
      rewardId,
      result.granted
        ? { status: 'PAID', amountCents: monthCents, appliedAt: new Date() }
        : { status: 'AVAILABLE', note: `free_month:${result.reason || 'not_granted'}` }
    );
  }

  // Rewards left APPLYING (a crash, a provider timeout): grants are
  // idempotent by reward / payout id, so they are simply tried again
  private async recoverStuck(partner: PartnerRow, now: Date) {
    const stuck = await this._repository.stuckRewards(
      partner.id,
      new Date(Math.min(Date.now(), now.getTime()) - 10 * 60 * 1000)
    );
    for (const reward of stuck) {
      if (reward.type === 'CREDITS') {
        const added = await this._subscriptions.addAiCreditPurchase(
          reward.id,
          reward.organizationId,
          reward.credits,
          0,
          'usd',
          'referral'
        );
        if (added) {
          await this._repository.setReward(reward.id, {
            status: 'PAID',
            appliedAt: new Date(),
          });
        }
      } else if (reward.type === 'ACCOUNT_CREDIT' && reward.amountCents > 0) {
        await this.grantFreeMonth(reward.id, reward.organizationId, reward.amountCents);
      } else if (reward.type === 'ACCOUNT_CREDIT') {
        await this._repository.setReward(reward.id, { status: 'AVAILABLE' });
      }
      // commission rows are retried through their pending payout
    }
  }

  // Affiliates who chose Tadween balance: available commission × 1.5. One
  // balance payout at a time; its id is the grant's idempotency key, so a
  // payout whose grant had an unknown outcome is retried with the same id.
  private async payCommissionAsBalance(partner: PartnerRow) {
    const pending = await this._repository.pendingBalancePayout(partner.id);
    let payoutId = pending?.id;
    let amount = 0;
    if (pending) {
      amount = await this._repository.payoutTotal(pending.id);
    } else {
      const available = await this._repository.rewards({
        partnerId: partner.id,
        type: 'COMMISSION',
        status: 'AVAILABLE',
        payoutId: null,
      });
      if (available.reduce((sum, r) => sum + r.amountCents, 0) <= 0) {
        return;
      }
      const payout = await this._repository.createPayout({
        partnerId: partner.id,
        amountCents: 0,
        method: 'balance',
        reference: null,
        createdById: 'system',
        paidAt: null,
      });
      payoutId = payout.id;
      amount = await this._repository.attachAvailableCommission(
        partner.id,
        payout.id
      );
    }
    const now = new Date();
    const result =
      amount > 0
        ? await this._payments.grantAccountCredit(
            partner.organizationId,
            Math.round(amount * PARTNERS.balanceMultiplier),
            'Partner commission as Tadween balance',
            payoutId!
          )
        : { granted: false, reason: 'nothing_to_pay' };
    if (result.reason === 'error') {
      return; // unknown outcome: retried next time with the same payout id
    }
    await this._repository.settlePayoutRewards(payoutId!, result.granted, now);
    if (result.granted) {
      await this._repository.updatePayout(payoutId!, {
        amountCents: amount,
        paidAt: now,
        status: 'PAID',
      });
    } else {
      // nothing was paid (no billing account yet, another currency): no row
      await this._repository.deletePayout(payoutId!);
    }
  }

  // ── The workspace's own view (Invite & earn, /partners) ───────────────────
  async getMine(organization: { id: string; createdAt: Date }, userId: string) {
    await this.assertEnabled();
    const partner = await this.ensurePartner(organization.id, userId);
    await this.settle(partner.id, false);
    const fresh = (await this._repository.getPartnerById(partner.id))!;

    const [referrals, sums, ownBonus, invitedBy, payouts, hasDetails] =
      await Promise.all([
        this._repository.referralsOf(fresh.id),
        this._repository.sumRewards(fresh.id),
        this._repository.rewards({
          organizationId: organization.id,
          partnerId: null,
        }),
        this._repository.getReferralByOrganization(organization.id),
        this._repository.payoutsOf(fresh.id),
        this._repository.hasPayoutDetails(fresh.id),
      ]);
    const orgs = new Map(
      (
        await this._repository.getOrganizations(
          referrals.map((r) => r.organizationId)
        )
      ).map((o) => [o.id, o])
    );
    const qualified = referrals.filter((r) => r.status === 'QUALIFIED').length;
    const rewards = await this._repository.rewards({ partnerId: fresh.id }, 100);

    const sum = (type: string, status: string[]) =>
      sums
        .filter((s) => s.type === type && status.includes(s.status))
        .reduce((all, s) => all + (s._sum.amountCents || 0), 0);
    const paying = await this._repository.countPaying(
      referrals
        .filter((r) => r.status === 'PAID' || r.status === 'QUALIFIED')
        .map((r) => r.organizationId)
    );
    const tier = tierFor(paying);

    return {
      code: fresh.code,
      kind: fresh.kind,
      status: fresh.status,
      ambassador: fresh.ambassador,
      ladder: REFERRER_LADDER.map((s) => ({
        step: s.step,
        reward: s.reward,
        credits: s.credits || null,
        reached: qualified >= s.step,
      })),
      friendCredits:
        fresh.kind === 'AFFILIATE'
          ? PARTNERS.affiliateAudienceCredits
          : PARTNERS.friendCredits,
      trialDays: fresh.kind === 'AFFILIATE' ? PARTNERS.affiliateTrialDays : null,
      qualified,
      creditsEarned: rewards
        .filter((r) => r.type === 'CREDITS' && r.status === 'PAID')
        .reduce((all, r) => all + r.credits, 0),
      rewards: rewards
        .filter((r) => r.type !== 'COMMISSION')
        .map((r) => ({
          id: r.id,
          type: r.type,
          status: r.status,
          step: r.step,
          credits: r.credits,
          amountCents: r.amountCents,
          note: r.note,
          appliedAt: r.appliedAt,
          createdAt: r.createdAt,
        })),
      referrals: referrals.map((r) => ({
        id: r.id,
        initials: initials(orgs.get(r.organizationId)?.name),
        status: r.status,
        source: r.source,
        signedUpAt: r.signedUpAt,
        firstPaidAt: r.firstPaidAt,
        qualifiedAt: r.qualifiedAt,
      })),
      // this workspace as the one invited
      invited: {
        by: invitedBy && invitedBy.status !== 'REJECTED' ? invitedBy.partner.code : null,
        canClaim:
          !invitedBy &&
          Date.now() - new Date(organization.createdAt).getTime() <=
            PARTNERS.claimWindowDays * DAY,
        claimUntil: new Date(
          new Date(organization.createdAt).getTime() +
            PARTNERS.claimWindowDays * DAY
        ),
        bonus: ownBonus.map((r) => ({
          credits: r.credits,
          status: r.status,
          appliedAt: r.appliedAt,
        })),
      },
      affiliate:
        fresh.kind === 'AFFILIATE'
          ? {
              tier: fresh.commissionRate ? fresh.tier : tier.tier,
              rate: fresh.commissionRate ?? tier.rate,
              tiers: PARTNERS.tierRates,
              commissionMonths: fresh.commissionMonths,
              holdDays: PARTNERS.holdDays,
              balanceMultiplier: PARTNERS.balanceMultiplier,
              payoutMinimumCents: PARTNERS.payoutMinimumCents,
              stats: {
                signups: referrals.length,
                trials: referrals.filter((r) => r.status === 'SIGNED_UP').length,
                paying,
                revenueCents: await this.referredRevenue(fresh.id),
                pendingCents: sum('COMMISSION', ['PENDING']),
                availableCents: sum('COMMISSION', ['AVAILABLE', 'APPLYING']),
                paidCents: sum('COMMISSION', ['PAID']),
              },
              payout: {
                preference: fresh.payoutPreference,
                method: fresh.payoutMethod,
                details: hasDetails ? this.maskedDetails(hasDetails) : null,
                country: fresh.country,
                mawthooqNumber: fresh.mawthooqNumber,
                taxFormAcceptedAt: fresh.taxFormAcceptedAt,
                cashReady: this.cashReady(fresh, !!hasDetails),
              },
              payouts,
            }
          : null,
    };
  }

  private maskedDetails(encrypted: string) {
    try {
      return mask(AuthService.fixedDecryption(encrypted));
    } catch (e) {
      return '••••';
    }
  }

  private async referredRevenue(partnerId: string) {
    const rewards = await this._repository.rewards({
      partnerId,
      type: 'COMMISSION',
      status: { in: ['PENDING', 'AVAILABLE', 'APPLYING', 'PAID'] },
      rate: { not: null },
    });
    return rewards.reduce(
      (all, r) => all + Math.round((r.amountCents * 100) / (r.rate || 100)),
      0
    );
  }

  // Cash needs the W-8BEN acknowledgement, a country and payout details;
  // Saudi creators also need their Mawthooq licence number
  private cashReady(
    partner: Pick<PartnerRow, 'taxFormAcceptedAt' | 'country' | 'mawthooqNumber' | 'payoutMethod'>,
    hasDetails: boolean
  ) {
    return (
      !!partner.taxFormAcceptedAt &&
      !!partner.country &&
      !!partner.payoutMethod &&
      hasDetails &&
      (partner.country !== 'SA' || !!partner.mawthooqNumber)
    );
  }

  async updatePayoutSettings(
    organizationId: string,
    userId: string,
    body: {
      preference: PartnerPayoutPreference;
      method?: string | null;
      details?: string | null;
      country?: string | null;
      mawthooqNumber?: string | null;
      taxFormAccepted?: boolean;
    }
  ) {
    await this.assertEnabled();
    const partner = await this._repository.getPartnerByOrganization(
      organizationId
    );
    if (!partner || partner.kind !== 'AFFILIATE') {
      throw new HttpException('Not found', 404);
    }
    if (partner.userId !== userId) {
      throw new HttpException(
        'Only the partner’s own login can change payouts.',
        403
      );
    }
    const country = body.country ? body.country.toUpperCase() : partner.country;
    const next = {
      payoutMethod: body.method ?? partner.payoutMethod,
      country,
      mawthooqNumber:
        body.mawthooqNumber !== undefined
          ? body.mawthooqNumber || null
          : partner.mawthooqNumber,
      taxFormAcceptedAt: body.taxFormAccepted
        ? partner.taxFormAcceptedAt || new Date()
        : body.taxFormAccepted === false
        ? null
        : partner.taxFormAcceptedAt,
    };
    const details = body.details
      ? AuthService.fixedEncryption(body.details.trim())
      : await this._repository.hasPayoutDetails(partner.id);
    if (body.preference === 'CASH' && !this.cashReady(next, !!details)) {
      throw new HttpException(
        next.taxFormAcceptedAt && next.country && next.payoutMethod && details
          ? 'Cash payouts in Saudi Arabia need your Mawthooq licence number.'
          : 'Cash payouts need the W-8BEN confirmation, your country, a payout method and payout details.',
        400
      );
    }
    await this._repository.updatePartner(partner.id, {
      ...next,
      payoutPreference: body.preference,
      ...(body.details ? { payoutDetails: details } : {}),
    });
    return { ok: true };
  }

  // ── Super admin (Admin → Growth) ───────────────────────────────────────────
  async adminPartners(query: AdminPartnersQueryDto) {
    const { page, pageSize, skip } = paging(query);
    const q = (query.search || '').trim();
    const where: Prisma.PartnerWhereInput = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { organizationId: q },
              { userId: q },
            ],
          }
        : {}),
    };
    const { total, items } = await this.listPartners(
      where,
      sorting(PARTNER_SORT, query),
      skip,
      pageSize
    );
    return { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), items };
  }

  async adminReferrals(query: AdminReferralsQueryDto) {
    const { page, pageSize, skip } = paging(query);
    const q = (query.search || '').trim();
    const where: Prisma.ReferralWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.flags === 'flagged' ? { NOT: { fraudFlags: { isEmpty: true } } } : {}),
      ...(q
        ? {
            OR: [
              { partner: { code: { contains: q, mode: 'insensitive' } } },
              { organizationId: q },
              { partnerId: q },
            ],
          }
        : {}),
    };
    const { total, items } = await this.listReferrals(
      where,
      sorting(REFERRAL_SORT, query),
      skip,
      pageSize
    );
    return { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), items };
  }

  async adminPayouts(query: AdminListQueryDto) {
    const { page, pageSize, skip } = paging(query);
    const { total, items } = await this.listPayouts(skip, pageSize);
    return {
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      items,
      due: await this.payoutList(false),
      minimumCents: PARTNERS.payoutMinimumCents,
    };
  }

  private async listPartners(
    where: Prisma.PartnerWhereInput,
    orderBy: Prisma.PartnerOrderByWithRelationInput[],
    skip: number,
    take: number
  ) {
    const [total, partners] = await this._repository.listPartners(
      where,
      orderBy,
      skip,
      take
    );
    const [orgs, users] = await Promise.all([
      this._repository.getOrganizations(partners.map((p) => p.organizationId)),
      this._repository.getUsers(partners.map((p) => p.userId)),
    ]);
    const items = [];
    for (const p of partners) {
      const sums = await this._repository.sumRewards(p.id);
      const commission = (status: string[]) =>
        sums
          .filter((s) => s.type === 'COMMISSION' && status.includes(s.status))
          .reduce((all, s) => all + (s._sum.amountCents || 0), 0);
      const org = orgs.find((o) => o.id === p.organizationId);
      const user = users.find((u) => u.id === p.userId);
      items.push({
        ...p,
        organization: org ? { id: org.id, name: org.name } : null,
        user: user ? { id: user.id, email: user.email, name: user.name } : null,
        referrals: p._count.referrals,
        qualified: await this._repository.countReferrals(p.id, ['QUALIFIED']),
        paying: await this.payingCount(p.id),
        pendingCents: commission(['PENDING']),
        availableCents: commission(['AVAILABLE', 'APPLYING']),
        paidCents: commission(['PAID']),
        manualRewards: (
          await this._repository.rewards({
            partnerId: p.id,
            type: 'UPGRADE',
            status: 'AVAILABLE',
          })
        ).map((r) => ({ id: r.id, step: r.step, note: r.note, createdAt: r.createdAt })),
      });
    }
    return { total, items };
  }

  // Invite-only affiliates: the user's own workspace becomes an AFFILIATE
  async createAffiliate(
    adminId: string,
    body: { email: string; commissionRate?: number | null }
  ) {
    const user = await this._repository.findUserWorkspace(body.email.trim());
    const membership =
      user?.organizations.find((o) => o.role === 'SUPERADMIN') ||
      user?.organizations[0];
    if (!user || !membership) {
      throw new HttpException('No user with a workspace has this email.', 404);
    }
    const existing = await this._repository.getPartnerByOrganization(
      membership.organizationId
    );
    const partner =
      existing ||
      (await this.createWithCode({
        organizationId: membership.organizationId,
        userId: user.id,
      }));
    return this._repository.updatePartner(partner.id, {
      kind: 'AFFILIATE',
      status: 'ACTIVE',
      userId: user.id,
      approvedAt: new Date(),
      approvedById: adminId,
      commissionRate: body.commissionRate ?? null,
    });
  }

  async updatePartner(
    id: string,
    body: {
      status?: PartnerStatus;
      kind?: 'REFERRER' | 'AFFILIATE';
      commissionRate?: number | null;
      commissionMonths?: number;
      ambassador?: boolean;
    }
  ) {
    const partner = await this._repository.getPartnerById(id);
    if (!partner) {
      throw new HttpException('Partner not found', 404);
    }
    return this._repository.updatePartner(id, {
      ...(body.status ? { status: body.status } : {}),
      ...(body.kind ? { kind: body.kind } : {}),
      ...(body.commissionRate !== undefined
        ? { commissionRate: body.commissionRate }
        : {}),
      ...(body.commissionMonths ? { commissionMonths: body.commissionMonths } : {}),
      ...(body.ambassador !== undefined ? { ambassador: body.ambassador } : {}),
    });
  }

  // Grants what is due now (free months, balance) for one partner
  async applyNow(id: string) {
    await this.settle(id, true);
    return { ok: true };
  }

  // Next plan for a year / founder price for life: applied by hand in Stripe,
  // then marked here
  async markRewardApplied(id: string) {
    const reward = await this._repository.getReward(id);
    if (!reward || reward.type !== 'UPGRADE' || reward.status !== 'AVAILABLE') {
      throw new HttpException('Nothing to mark', 400);
    }
    await this._repository.setReward(id, {
      status: 'PAID',
      appliedAt: new Date(),
    });
    return { ok: true };
  }

  private async listReferrals(
    where: Prisma.ReferralWhereInput,
    orderBy: Prisma.ReferralOrderByWithRelationInput[],
    skip: number,
    take: number
  ) {
    const [total, referrals] = await this._repository.listReferrals(
      where,
      orderBy,
      skip,
      take
    );
    const orgs = new Map(
      (
        await this._repository.getOrganizations([
          ...referrals.map((r) => r.organizationId),
          ...referrals.map((r) => r.partner.organizationId),
        ])
      ).map((o) => [o.id, o])
    );
    return {
      total,
      items: referrals.map((r) => ({
        ...r,
        organization: { id: r.organizationId, name: orgs.get(r.organizationId)?.name || null },
        partner: {
          ...r.partner,
          organizationName: orgs.get(r.partner.organizationId)?.name || null,
        },
        invoices: r._count.invoices,
      })),
    };
  }

  async rejectReferral(id: string, reason: string) {
    const referral = await this._repository.getReferral(id);
    if (!referral) {
      throw new HttpException('Referral not found', 404);
    }
    await this._repository.updateReferral(id, {
      status: 'REJECTED' as ReferralStatus,
      rejectionReason: reason || 'rejected_by_admin',
    });
    await this._repository.voidReferralRewards(id);
    // commission already paid out (or being paid): taken from the next payout
    for (const reward of await this._repository.rewards({
      referralId: id,
      type: 'COMMISSION',
      status: { in: ['PAID', 'APPLYING'] },
    })) {
      if (!reward.id.startsWith('cb_')) {
        await this.reduceCommission(reward, reward.amountCents, 0, 'rejected');
      }
    }
    return { ok: true };
  }

  // Affiliates who asked for cash with at least the payout minimum available
  async payoutList(withDetails: boolean) {
    const balances = (await this._repository.cashBalances()).filter(
      (b) => b.amountCents >= PARTNERS.payoutMinimumCents
    );
    const partners = await Promise.all(
      balances.map((b) => this._repository.getPartnerById(b.partnerId))
    );
    const [orgs, users, details] = await Promise.all([
      this._repository.getOrganizations(
        partners.filter(Boolean).map((p) => p!.organizationId)
      ),
      this._repository.getUsers(partners.filter(Boolean).map((p) => p!.userId)),
      this._repository.payoutDetailsFor(balances.map((b) => b.partnerId)),
    ]);
    return balances.map((b, i) => {
      const p = partners[i]!;
      const encrypted = details.get(b.partnerId);
      let plain: string | null = null;
      try {
        plain =
          withDetails && encrypted ? AuthService.fixedDecryption(encrypted) : null;
      } catch (e) {
        plain = null;
      }
      return {
        partnerId: b.partnerId,
        code: p.code,
        organization: orgs.find((o) => o.id === p.organizationId)?.name || null,
        email: users.find((u) => u.id === p.userId)?.email || null,
        country: p.country,
        mawthooqNumber: p.mawthooqNumber,
        method: p.payoutMethod,
        ready: this.cashReady(p, !!encrypted),
        amountCents: b.amountCents,
        rewards: b.rewards,
        ...(withDetails ? { details: plain } : {}),
      };
    });
  }

  // The monthly cash list as CSV (cells quoted, never read as formulas)
  async payoutCsv() {
    const cell = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value);
      const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = await this.payoutList(true);
    return [
      ['code', 'workspace', 'email', 'country', 'mawthooq', 'method', 'details', 'amount_usd', 'ready'].join(','),
      ...rows.map((r) =>
        [r.code, r.organization, r.email, r.country, r.mawthooqNumber, r.method, r.details, (r.amountCents / 100).toFixed(2), r.ready ? 'yes' : 'no']
          .map(cell)
          .join(',')
      ),
    ].join('\n');
  }

  async markPaid(
    adminId: string,
    partnerId: string,
    body: { reference: string; method?: string; amountCents: number }
  ) {
    const partner = await this._repository.getPartnerById(partnerId);
    if (!partner || partner.kind !== 'AFFILIATE') {
      throw new HttpException('Partner not found', 404);
    }
    if (
      partner.payoutPreference !== 'CASH' ||
      !this.cashReady(partner, !!(await this._repository.hasPayoutDetails(partnerId)))
    ) {
      throw new HttpException(
        'This partner hasn’t completed cash payout details (W-8BEN, country, method, details; Mawthooq in Saudi Arabia).',
        400
      );
    }
    const now = new Date();
    const payout = await this._repository.createPayout({
      partnerId,
      amountCents: 0,
      method: body.method || partner.payoutMethod || 'manual',
      reference: body.reference,
      createdById: adminId,
      paidAt: now,
    });
    const amount = await this._repository.attachAvailableCommission(
      partnerId,
      payout.id
    );
    // the admin confirms the amount they sent; anything that became
    // available after the export waits for the next payout
    if (amount !== body.amountCents || amount < PARTNERS.payoutMinimumCents) {
      await this._repository.settlePayoutRewards(payout.id, false, now);
      await this._repository.deletePayout(payout.id);
      throw new HttpException(
        amount !== body.amountCents
          ? `The available balance changed to $${(amount / 100).toFixed(2)} since the export. Reload, pay the difference or mark the new amount.`
          : `The available balance is below $${PARTNERS.payoutMinimumCents / 100}.`,
        409
      );
    }
    await this._repository.settlePayoutRewards(payout.id, true, now);
    await this._repository.updatePayout(payout.id, {
      amountCents: amount,
      status: 'PAID',
    });
    return { id: payout.id, amountCents: amount };
  }

  private async listPayouts(skip: number, take: number) {
    const [total, payouts] = await this._repository.listPayouts(skip, take);
    const orgs = await this._repository.getOrganizations(
      payouts.map((p) => p.partner.organizationId)
    );
    return {
      total,
      items: payouts.map((p) => ({
        ...p,
        organization:
          orgs.find((o) => o.id === p.partner.organizationId)?.name || null,
      })),
    };
  }
}
