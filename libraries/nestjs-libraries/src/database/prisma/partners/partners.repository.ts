import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  PartnerKind,
  PartnerPayoutPreference,
  PartnerStatus,
  Prisma,
  ReferralRewardStatus,
  ReferralRewardType,
  ReferralSource,
  ReferralStatus,
} from '@prisma/client';
import { PAYMENT_FAILED_STATUSES } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';

// What a partner's own screens and the console read of a partner: never the
// encrypted payout details (only `payoutDetailsFor` returns them, for the
// super admin's payout export).
const PARTNER_SELECT = {
  id: true,
  organizationId: true,
  userId: true,
  kind: true,
  status: true,
  code: true,
  tier: true,
  commissionRate: true,
  commissionMonths: true,
  ambassador: true,
  country: true,
  mawthooqNumber: true,
  payoutPreference: true,
  payoutMethod: true,
  taxFormAcceptedAt: true,
  approvedAt: true,
  createdAt: true,
} satisfies Prisma.PartnerSelect;

const REWARD_SELECT = {
  id: true,
  partnerId: true,
  organizationId: true,
  referralId: true,
  type: true,
  status: true,
  amountCents: true,
  credits: true,
  rate: true,
  step: true,
  note: true,
  availableAt: true,
  invoiceId: true,
  payoutId: true,
  appliedAt: true,
  createdAt: true,
} satisfies Prisma.ReferralRewardSelect;

export type PartnerRow = Prisma.PartnerGetPayload<{
  select: typeof PARTNER_SELECT;
}>;
export type RewardRow = Prisma.ReferralRewardGetPayload<{
  select: typeof REWARD_SELECT;
}>;

export interface NewReward {
  id: string;
  partnerId: string | null;
  organizationId: string;
  referralId?: string | null;
  type: ReferralRewardType;
  status: ReferralRewardStatus;
  amountCents?: number;
  credits?: number;
  rate?: number | null;
  step?: number | null;
  note?: string | null;
  availableAt?: Date | null;
  invoiceId?: string | null;
}

// Tadween partners program: partners, referrals, paid invoices of referred
// workspaces, the rewards ledger and manual payouts. Every write selects only
// ids; organizations and users are read with explicit selects (no tokens).
@Injectable()
export class PartnersRepository {
  constructor(
    private _partner: PrismaRepository<'partner'>,
    private _referral: PrismaRepository<'referral'>,
    private _invoice: PrismaRepository<'referralInvoice'>,
    private _reward: PrismaRepository<'referralReward'>,
    private _payout: PrismaRepository<'partnerPayout'>,
    private _organization: PrismaRepository<'organization'>,
    private _user: PrismaRepository<'user'>,
    private _userOrganization: PrismaRepository<'userOrganization'>
  ) {}

  // ── Partners ───────────────────────────────────────────────────────────────
  getPartnerByOrganization(organizationId: string) {
    return this._partner.model.partner.findUnique({
      where: { organizationId },
      select: PARTNER_SELECT,
    });
  }

  getPartnerByCode(code: string) {
    return this._partner.model.partner.findUnique({
      where: { code },
      select: PARTNER_SELECT,
    });
  }

  getPartnerById(id: string) {
    return this._partner.model.partner.findUnique({
      where: { id },
      select: PARTNER_SELECT,
    });
  }

  createPartner(data: {
    organizationId: string;
    userId: string;
    code: string;
    kind?: PartnerKind;
    approvedAt?: Date;
    approvedById?: string;
    commissionRate?: number | null;
  }) {
    return this._partner.model.partner.create({
      data,
      select: PARTNER_SELECT,
    });
  }

  updatePartner(
    id: string,
    data: Partial<{
      kind: PartnerKind;
      status: PartnerStatus;
      tier: number;
      commissionRate: number | null;
      commissionMonths: number;
      ambassador: boolean;
      country: string | null;
      mawthooqNumber: string | null;
      payoutPreference: PartnerPayoutPreference;
      payoutMethod: string | null;
      payoutDetails: string | null;
      taxFormAcceptedAt: Date | null;
      approvedAt: Date | null;
      approvedById: string | null;
      userId: string;
    }>
  ) {
    return this._partner.model.partner.update({
      where: { id },
      data,
      select: PARTNER_SELECT,
    });
  }

  // The encrypted payout details: only the super admin's payout list reads them
  async payoutDetailsFor(ids: string[]) {
    const rows = await this._partner.model.partner.findMany({
      where: { id: { in: ids } },
      select: { id: true, payoutDetails: true },
    });
    return new Map(rows.map((r) => [r.id, r.payoutDetails]));
  }

  async hasPayoutDetails(id: string) {
    const row = await this._partner.model.partner.findUnique({
      where: { id },
      select: { payoutDetails: true },
    });
    return row?.payoutDetails || null;
  }

  listPartners(
    where: Prisma.PartnerWhereInput,
    orderBy: Prisma.PartnerOrderByWithRelationInput[],
    skip: number,
    take: number
  ) {
    return Promise.all([
      this._partner.model.partner.count({ where }),
      this._partner.model.partner.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          ...PARTNER_SELECT,
          _count: { select: { referrals: true } },
        },
      }),
    ]);
  }

  // ── Organizations and users (explicit selects, nothing sensitive) ────────
  getOrganizations(ids: string[]) {
    return this._organization.model.organization.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        createdAt: true,
        paymentId: true,
        isTrailing: true,
        subscription: {
          select: {
            subscriptionTier: true,
            period: true,
            priceCents: true,
            status: true,
            isLifetime: true,
            deletedAt: true,
          },
        },
      },
    });
  }

  getOrganization(id: string) {
    return this._organization.model.organization.findUnique({
      where: { id },
      select: { id: true, name: true, createdAt: true, paymentId: true },
    });
  }

  getUsers(ids: string[]) {
    return this._user.model.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, name: true, ip: true, agent: true },
    });
  }

  isMember(userId: string, organizationId: string) {
    return this._userOrganization.model.userOrganization.count({
      where: { userId, organizationId, disabled: false },
    });
  }

  // Members of a workspace (to compare sign-up IPs and browsers)
  membersOf(organizationId: string) {
    return this._userOrganization.model.userOrganization.findMany({
      where: { organizationId },
      select: { user: { select: { id: true, ip: true, agent: true } } },
    });
  }

  // The workspace an affiliate is created for: the user's own (owner) one first
  findUserWorkspace(email: string) {
    return this._user.model.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
      select: {
        id: true,
        email: true,
        organizations: {
          where: { disabled: false, organization: { deletedAt: null } },
          orderBy: { createdAt: 'asc' },
          select: { role: true, organizationId: true },
        },
      },
    });
  }

  // Referred workspaces that are paying today: a live, non-lifetime
  // subscription that is neither in trial nor failing (admin console rules)
  countPaying(organizationIds: string[]) {
    if (!organizationIds.length) {
      return Promise.resolve(0);
    }
    return this._organization.model.organization.count({
      where: {
        id: { in: organizationIds },
        isTrailing: false,
        subscription: {
          is: {
            deletedAt: null,
            isLifetime: false,
            OR: [
              { status: null },
              { status: { notIn: PAYMENT_FAILED_STATUSES } },
            ],
          },
        },
      },
    });
  }

  // ── Referrals ──────────────────────────────────────────────────────────────
  getReferralByOrganization(organizationId: string) {
    return this._referral.model.referral.findUnique({
      where: { organizationId },
      select: {
        id: true,
        partnerId: true,
        organizationId: true,
        userId: true,
        source: true,
        status: true,
        signedUpAt: true,
        firstPaidAt: true,
        qualifiedAt: true,
        fraudFlags: true,
        partner: { select: PARTNER_SELECT },
      },
    });
  }

  createReferral(data: {
    partnerId: string;
    organizationId: string;
    userId: string | null;
    source: ReferralSource;
    fraudFlags: string[];
  }) {
    return this._referral.model.referral.create({
      data,
      select: { id: true },
    });
  }

  updateReferral(
    id: string,
    data: Partial<{
      status: ReferralStatus;
      firstPaidAt: Date;
      qualifiedAt: Date;
      rejectionReason: string | null;
    }>
  ) {
    return this._referral.model.referral.update({
      where: { id },
      data,
      select: { id: true },
    });
  }

  // Moves a referral only from the expected status (a replayed webhook is a no-op)
  async moveReferral(
    id: string,
    from: ReferralStatus[],
    data: Partial<{
      status: ReferralStatus;
      firstPaidAt: Date;
      qualifiedAt: Date;
      rejectionReason: string | null;
    }>
  ) {
    const { count } = await this._referral.model.referral.updateMany({
      where: { id, status: { in: from } },
      data,
    });
    return count === 1;
  }

  referralsOf(partnerId: string) {
    return this._referral.model.referral.findMany({
      where: { partnerId },
      orderBy: { signedUpAt: 'desc' },
      take: 500,
      select: {
        id: true,
        organizationId: true,
        source: true,
        status: true,
        signedUpAt: true,
        firstPaidAt: true,
        qualifiedAt: true,
      },
    });
  }

  countReferrals(partnerId: string, status?: ReferralStatus[]) {
    return this._referral.model.referral.count({
      where: { partnerId, ...(status ? { status: { in: status } } : {}) },
    });
  }

  // Paid referrals on a yearly plan whose 30 days have passed: they count on
  // the ladder without a second invoice (evaluated when read, no cron)
  dueYearlyReferrals(partnerId: string, paidBefore: Date) {
    return this._referral.model.referral.findMany({
      where: {
        partnerId,
        status: 'PAID',
        firstPaidAt: { lte: paidBefore },
        invoices: { some: { interval: 'year', refundedAt: null } },
      },
      select: { id: true, firstPaidAt: true },
    });
  }

  listReferrals(
    where: Prisma.ReferralWhereInput,
    orderBy: Prisma.ReferralOrderByWithRelationInput[],
    skip: number,
    take: number
  ) {
    return Promise.all([
      this._referral.model.referral.count({ where }),
      this._referral.model.referral.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          organizationId: true,
          userId: true,
          source: true,
          status: true,
          signedUpAt: true,
          firstPaidAt: true,
          qualifiedAt: true,
          rejectionReason: true,
          fraudFlags: true,
          partner: {
            select: { id: true, code: true, kind: true, organizationId: true },
          },
          _count: { select: { invoices: true } },
        },
      }),
    ]);
  }

  getReferral(id: string) {
    return this._referral.model.referral.findUnique({
      where: { id },
      select: { id: true, status: true, partnerId: true },
    });
  }

  // ── Paid invoices of referred workspaces ──────────────────────────────────
  // true when this invoice is new (a replayed webhook answers false)
  async addInvoice(data: {
    id: string;
    referralId: string;
    paymentId: string | null;
    amountCents: number;
    currency: string;
    interval: string | null;
    paidAt: Date;
  }) {
    const { count } = await this._invoice.model.referralInvoice.createMany({
      data: [data],
      skipDuplicates: true,
    });
    return count === 1;
  }

  countPaidInvoices(referralId: string) {
    return this._invoice.model.referralInvoice.count({
      where: { referralId, refundedAt: null },
    });
  }

  findInvoiceByPayment(paymentId: string) {
    return this._invoice.model.referralInvoice.findFirst({
      where: { paymentId },
      select: {
        id: true,
        referralId: true,
        amountCents: true,
        refundedAt: true,
      },
    });
  }

  markInvoiceRefunded(id: string, at: Date) {
    return this._invoice.model.referralInvoice.updateMany({
      where: { id, refundedAt: null },
      data: { refundedAt: at },
    });
  }

  // ── Rewards ledger ─────────────────────────────────────────────────────────
  // Inserts the reward once (the id is the event); true when it is new
  async addReward(reward: NewReward) {
    const { count } = await this._reward.model.referralReward.createMany({
      data: [reward],
      skipDuplicates: true,
    });
    return count === 1;
  }

  getReward(id: string) {
    return this._reward.model.referralReward.findUnique({
      where: { id },
      select: REWARD_SELECT,
    });
  }

  rewards(where: Prisma.ReferralRewardWhereInput, take = 500) {
    return this._reward.model.referralReward.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      select: REWARD_SELECT,
    });
  }

  // Takes a reward for applying: only one caller wins (true)
  async claimReward(id: string, from: ReferralRewardStatus[] = ['AVAILABLE']) {
    const { count } = await this._reward.model.referralReward.updateMany({
      where: { id, status: { in: from } },
      data: { status: 'APPLYING' },
    });
    return count === 1;
  }

  setReward(
    id: string,
    data: Partial<{
      status: ReferralRewardStatus;
      amountCents: number;
      appliedAt: Date | null;
      note: string | null;
      payoutId: string | null;
    }>
  ) {
    return this._reward.model.referralReward.update({
      where: { id },
      data,
      select: { id: true },
    });
  }

  // Holds that ended: PENDING → AVAILABLE
  releaseHolds(partnerId: string, now: Date) {
    return this._reward.model.referralReward.updateMany({
      where: { partnerId, status: 'PENDING', availableAt: { lte: now } },
      data: { status: 'AVAILABLE' },
    });
  }

  countCreditRewardsSince(partnerId: string, since: Date) {
    return this._reward.model.referralReward.count({
      where: {
        partnerId,
        type: 'CREDITS',
        status: 'PAID',
        appliedAt: { gte: since },
      },
    });
  }

  // Sums per status and type for a partner (stats and balances)
  sumRewards(partnerId: string) {
    return this._reward.model.referralReward.groupBy({
      by: ['type', 'status'],
      where: { partnerId },
      _sum: { amountCents: true, credits: true },
      _count: { _all: true },
    });
  }

  voidReferralRewards(referralId: string) {
    return this._reward.model.referralReward.updateMany({
      where: {
        referralId,
        partnerId: { not: null },
        status: { in: ['PENDING', 'AVAILABLE'] },
      },
      data: { status: 'VOID', note: 'referral_rejected' },
    });
  }

  // Cash commission ready to pay, per partner that asked for cash
  async cashBalances() {
    const rows = await this._reward.model.referralReward.groupBy({
      by: ['partnerId'],
      where: {
        type: 'COMMISSION',
        status: 'AVAILABLE',
        payoutId: null,
        partner: { payoutPreference: 'CASH', kind: 'AFFILIATE' },
      },
      _sum: { amountCents: true },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      partnerId: r.partnerId as string,
      amountCents: r._sum.amountCents || 0,
      rewards: r._count._all,
    }));
  }

  // Ties every available commission row of a partner to one payout (cash
  // or Tadween balance) in one transaction; answers the payout's total
  async attachAvailableCommission(partnerId: string, payoutId: string) {
    await this._reward.model.referralReward.updateMany({
      where: {
        partnerId,
        type: 'COMMISSION',
        status: 'AVAILABLE',
        payoutId: null,
      },
      data: { status: 'APPLYING', payoutId },
    });
    const sum = await this._reward.model.referralReward.aggregate({
      where: { payoutId },
      _sum: { amountCents: true },
    });
    return sum._sum.amountCents || 0;
  }

  settlePayoutRewards(payoutId: string, paid: boolean, at: Date) {
    return this._reward.model.referralReward.updateMany({
      where: { payoutId, status: 'APPLYING' },
      data: paid
        ? { status: 'PAID', appliedAt: at }
        : { status: 'AVAILABLE', payoutId: null },
    });
  }

  // ── Payouts ────────────────────────────────────────────────────────────────
  createPayout(data: {
    partnerId: string;
    amountCents: number;
    method: string;
    reference: string | null;
    createdById: string;
    paidAt: Date | null;
  }) {
    return this._payout.model.partnerPayout.create({
      data,
      select: { id: true },
    });
  }

  updatePayout(
    id: string,
    data: Partial<{
      amountCents: number;
      status: 'PAID' | 'CANCELLED';
      paidAt: Date | null;
    }>
  ) {
    return this._payout.model.partnerPayout.update({
      where: { id },
      data,
      select: { id: true },
    });
  }

  payoutsOf(partnerId: string) {
    return this._payout.model.partnerPayout.findMany({
      where: { partnerId, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        amountCents: true,
        method: true,
        status: true,
        paidAt: true,
        createdAt: true,
      },
    });
  }

  listPayouts(skip: number, take: number) {
    return Promise.all([
      this._payout.model.partnerPayout.count(),
      this._payout.model.partnerPayout.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          partnerId: true,
          amountCents: true,
          method: true,
          reference: true,
          status: true,
          paidAt: true,
          createdAt: true,
          partner: { select: { code: true, organizationId: true } },
        },
      }),
    ]);
  }
}
