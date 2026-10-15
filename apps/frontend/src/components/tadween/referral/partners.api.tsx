'use client';

// Data for the partners program pages: GET /partners/me (Invite & earn and the
// affiliate dashboard /partners) and the payout settings. One SWR hook per
// resource. The endpoint answers 404 while the `affiliate` switch is off; the
// hook's error then carries `status: 404`.
import { useCallback } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export type PartnerKind = 'REFERRER' | 'AFFILIATE';
export type PartnerStatus = 'ACTIVE' | 'SUSPENDED';
export type PartnerReferralStatus =
  | 'SIGNED_UP'
  | 'PAID'
  | 'QUALIFIED'
  | 'REJECTED'
  | 'REFUNDED';
export type PartnerRewardType =
  | 'COMMISSION'
  | 'CREDITS'
  | 'ACCOUNT_CREDIT'
  | 'UPGRADE'
  | 'BONUS';
export type PartnerRewardStatus =
  | 'PENDING'
  | 'AVAILABLE'
  | 'APPLYING'
  | 'PAID'
  | 'CLAWED_BACK'
  | 'VOID';
export type PartnerPayoutPreference = 'BALANCE' | 'CASH';
export type PartnerPayoutMethod = 'wise' | 'payoneer' | 'bank';

// A workspace this one invited: initials only, never names
export interface PartnerReferral {
  id: string;
  initials: string;
  status: PartnerReferralStatus;
  source: 'LINK' | 'CODE';
  signedUpAt: string;
  firstPaidAt: string | null;
  qualifiedAt: string | null;
}

// Ladder rewards, credits and free months (commission is in `affiliate.stats`)
export interface PartnerReward {
  id: string;
  type: PartnerRewardType;
  status: PartnerRewardStatus;
  step: number | null;
  credits: number;
  amountCents: number;
  note: string | null;
  appliedAt: string | null;
  createdAt: string;
}

export interface PartnerLadderStep {
  step: number;
  reward: 'credits' | 'free_month' | 'next_plan_year' | 'founder_for_life';
  credits: number | null;
  reached: boolean;
}

export interface PartnerTierRate {
  tier: number;
  minPaying: number;
  rate: number;
}

export interface PartnerPayout {
  id: string;
  amountCents: number;
  // wise | payoneer | bank | manual | balance
  method: string;
  status: 'PAID' | 'CANCELLED';
  paidAt: string | null;
  createdAt: string;
}

export interface PartnerAffiliateStats {
  signups: number;
  trials: number;
  paying: number;
  // USD cents, excluding tax
  revenueCents: number;
  pendingCents: number;
  availableCents: number;
  paidCents: number;
}

export interface PartnerAffiliate {
  tier: number;
  // percent of each paid invoice
  rate: number;
  tiers: PartnerTierRate[];
  commissionMonths: number;
  holdDays: number;
  balanceMultiplier: number;
  payoutMinimumCents: number;
  stats: PartnerAffiliateStats;
  payout: {
    preference: PartnerPayoutPreference;
    method: PartnerPayoutMethod | null;
    // masked: "•••• 1234"
    details: string | null;
    country: string | null;
    mawthooqNumber: string | null;
    taxFormAcceptedAt: string | null;
    cashReady: boolean;
  };
  payouts: PartnerPayout[];
}

export interface PartnerMe {
  code: string;
  kind: PartnerKind;
  status: PartnerStatus;
  ambassador: boolean;
  ladder: PartnerLadderStep[];
  friendCredits: number;
  trialDays: number | null;
  qualified: number;
  creditsEarned: number;
  rewards: PartnerReward[];
  referrals: PartnerReferral[];
  invited: {
    by: string | null;
    canClaim: boolean;
    claimUntil: string;
    bonus: { credits: number; status: PartnerRewardStatus; appliedAt: string | null }[];
  };
  affiliate: PartnerAffiliate | null;
}

export interface PartnerPayoutSettings {
  preference: PartnerPayoutPreference;
  method?: PartnerPayoutMethod;
  // sent only when changed; the server keeps the saved value otherwise
  details?: string;
  country?: string;
  mawthooqNumber?: string;
  taxFormAccepted?: boolean;
}

export class PartnersError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Nest answers { message } (a string or a validation list)
const readError = async (res: Response) => {
  try {
    const body = await res.json();
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message;
    return message || `Request failed (${res.status})`;
  } catch (e) {
    return `Request failed (${res.status})`;
  }
};

// `enabled` false (the program is switched off): nothing is asked
export const usePartnerMe = (enabled = true) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string): Promise<PartnerMe> => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new PartnersError(await readError(res), res.status);
    }
    return res.json();
  }, []);
  return useSWR<PartnerMe, PartnersError>(enabled ? '/partners/me' : null, load, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
};

// The longer trial of a workspace an affiliate brought (null: the plan's own).
// Only asked while the program is on.
export const useInvitedTrial = (enabled: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const res = await fetch(path);
    return res.ok
      ? ((await res.json()) as { trialDays: number | null })
      : { trialDays: null };
  }, []);
  return useSWR(enabled ? '/partners/invited' : null, load, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
};

// Cash goes out by hand around the 15th (docs/tadween/partners.md, runbook):
// the next one, for Admin → Payouts
const PAYOUT_DAY = 15;
export const nextPayoutDate = (now = dayjs()) =>
  now.date() <= PAYOUT_DAY ? now.date(PAYOUT_DAY) : now.add(1, 'month').date(PAYOUT_DAY);

// PUT /partners/payout: resolves, or throws with the server's message
export const useSavePartnerPayout = () => {
  const fetch = useFetch();
  return useCallback(async (body: PartnerPayoutSettings) => {
    const res = await fetch('/partners/payout', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new PartnersError(await readError(res), res.status);
    }
  }, []);
};
