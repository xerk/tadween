'use client';

// An affiliate's numbers on /partners:
// - EarningsHeader: commission earned so far (the hero number), then what is
//   available with the next payout, what is held, and what was paid out.
// - PartnerStatTiles: the audience strip (sign-ups, trials, paying
//   customers, revenue referred).
// - PartnerTierCard: the current rate and a progress bar across the tiers
//   (30% → 35% from 10 paying → 40% from 30).
// Styles: app/tadween/partners.scss (the strip: app/tadween/referral.scss).
import React, { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { cx, Icon, StatTile } from '@gitroom/frontend/components/tadween/ui';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';
import {
  nextPayoutDate,
  type PartnerAffiliate,
  type PartnerAffiliateStats,
  type PartnerTierRate,
} from '@gitroom/frontend/components/tadween/referral/partners.api';

const usd = (cents: number) => formatUsd(cents / 100);

// The first tier above the current paying count (null on the top tier)
export const nextPartnerTier = (tiers: PartnerTierRate[], paying: number) =>
  [...tiers].sort((a, b) => a.minPaying - b.minPaying).find((x) => x.minPaying > paying) || null;

// What happens to the available commission next. Derived from the payout
// settings only; the API has no payout schedule of its own.
export const useNextPayout = () => {
  const t = useT();
  return (affiliate: PartnerAffiliate) => {
    const { availableCents } = affiliate.stats;
    const { preference, cashReady } = affiliate.payout;
    if (preference === 'BALANCE') {
      return {
        tone: 'neutral' as const,
        text: t('tdw_partners_next_balance', 'Added to your next Tadween invoice as balance, worth {{x}}×', {
          x: affiliate.balanceMultiplier.toLocaleString('en-US'),
        }),
      };
    }
    if (!cashReady) {
      return {
        tone: 'warn' as const,
        text: t('tdw_partners_next_details', 'Add your payout details to get paid in cash'),
      };
    }
    if (availableCents < affiliate.payoutMinimumCents) {
      return {
        tone: 'neutral' as const,
        text: t('tdw_partners_next_minimum', 'Paid in cash from {{min}} available, {{left}} to go', {
          min: usd(affiliate.payoutMinimumCents),
          left: usd(affiliate.payoutMinimumCents - availableCents),
        }),
      };
    }
    return {
      tone: 'ok' as const,
      text: t('tdw_partners_next_cash', 'Next payout around {{date}}', {
        date: nextPayoutDate().format('D MMM'),
      }),
    };
  };
};

export const EarningsHeader: FC<{
  affiliate: PartnerAffiliate;
  className?: string;
}> = ({ affiliate, className }) => {
  const t = useT();
  const nextPayout = useNextPayout()(affiliate);
  const s = affiliate.stats;
  // pending + available + paid, already net of refunds (clawbacks are negative rows)
  const earned = s.pendingCents + s.availableCents + s.paidCents;
  const paidOut = affiliate.payouts.filter((p) => p.status === 'PAID').length;
  return (
    <section className={cx('tdw-earnings', className)} aria-label={t('tdw_partners_earned', 'Commission earned')}>
      <div className="tdw-earnings-total">
        <span className="tdw-earnings-label">{t('tdw_partners_earned', 'Commission earned')}</span>
        <span className="tdw-earnings-value metric">{usd(earned)}</span>
        <span className="tdw-earnings-sub">
          {t('tdw_partners_earned_sub', '{{rate}}% of every paid invoice, for each customer’s first {{months}} months', {
            rate: affiliate.rate,
            months: affiliate.commissionMonths,
          })}
        </span>
      </div>
      <div className="tdw-earnings-cells">
        <div className="tdw-earnings-cell is-available">
          <span className="tdw-earnings-label">{t('tdw_partners_stat_available', 'Available')}</span>
          <span className="metric">{usd(s.availableCents)}</span>
          <span className={cx('tdw-earnings-hint', `is-${nextPayout.tone}`)}>
            <Icon
              name={nextPayout.tone === 'warn' ? 'triangle-alert' : nextPayout.tone === 'ok' ? 'calendar' : 'clock'}
              size={14}
            />
            {nextPayout.text}
          </span>
        </div>
        <div className="tdw-earnings-cell">
          <span className="tdw-earnings-label">{t('tdw_partners_stat_pending', 'Pending')}</span>
          <span className="metric">{usd(s.pendingCents)}</span>
          <span className="tdw-earnings-hint">
            {t('tdw_partners_stat_pending_hint', 'In the {{n}}-day hold', { n: affiliate.holdDays })}
          </span>
        </div>
        <div className="tdw-earnings-cell">
          <span className="tdw-earnings-label">{t('tdw_partners_stat_paid', 'Paid out')}</span>
          <span className="metric">{usd(s.paidCents)}</span>
          <span className="tdw-earnings-hint">
            {paidOut === 1
              ? t('tdw_partners_payouts_one', '1 payout')
              : t('tdw_partners_payouts_many', '{{n}} payouts', { n: paidOut })}
          </span>
        </div>
      </div>
    </section>
  );
};

export const PartnerTierCard: FC<{
  rate: number;
  paying: number;
  tiers: PartnerTierRate[];
  // a rate set by the team: no tier progress
  fixedRate?: boolean;
}> = ({ rate, paying, tiers, fixedRate }) => {
  const t = useT();
  const sorted = [...tiers].sort((a, b) => a.minPaying - b.minPaying);
  const top = Math.max(sorted[sorted.length - 1]?.minPaying || 1, 1);
  const next = fixedRate ? null : nextPartnerTier(tiers, paying);
  const pct = Math.min(100, (paying / top) * 100);
  return (
    <section className="tdw-partners-tier" aria-labelledby="tdw-partners-tier-title">
      <header className="tdw-partners-tier-head">
        <div className="min-w-0">
          <h3 id="tdw-partners-tier-title" className="tdw-partners-card-title">
            {t('tdw_partners_rate', 'Your commission')}
          </h3>
          <div className="tdw-partners-tier-rate">
            <span className="metric" dir="ltr">
              {rate}%
            </span>
            <span className="tdw-partners-tier-sub">{t('tdw_partners_rate_of', 'of every paid invoice')}</span>
          </div>
        </div>
        <span className="tdw-partners-tier-paying">
          <span className="metric">{paying.toLocaleString('en-US')}</span>
          <span>{t('tdw_partners_stat_paying', 'Paying customers')}</span>
        </span>
      </header>

      {fixedRate ? (
        <p className="tdw-partners-tier-note">{t('tdw_partners_tier_fixed', 'A rate agreed with the Tadween team.')}</p>
      ) : (
        <>
          <div className="tdw-partners-tier-track">
            <span
              className="tdw-partners-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={top}
              aria-valuenow={paying}
              aria-label={t('tdw_partners_tier_bar', 'Paying customers towards the top tier')}
            >
              <span style={{ width: `${pct}%` }} />
            </span>
            <ol className="tdw-partners-tier-marks">
              {sorted.map((tier) => (
                <li
                  key={tier.tier}
                  className={cx('tdw-partners-tier-mark', paying >= tier.minPaying && 'is-reached', next?.tier === tier.tier && 'is-next')}
                  style={{ insetInlineStart: `${(tier.minPaying / top) * 100}%` }}
                >
                  <span className="tdw-partners-tier-tick" aria-hidden="true" />
                  <span className="tdw-partners-tier-mark-rate" dir="ltr">
                    {tier.rate}%
                  </span>
                  <span className="tdw-partners-tier-mark-min">
                    {t('tdw_partners_tier_from', 'from {{n}}', { n: tier.minPaying })}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <p className="tdw-partners-tier-note">
            {next
              ? t('tdw_partners_tier_next', '{{n}} more paying customers to {{rate}}%', {
                  n: next.minPaying - paying,
                  rate: next.rate,
                })
              : t('tdw_partners_tier_top', 'You’re on the top tier.')}
          </p>
        </>
      )}
    </section>
  );
};

// The audience strip: who came through the link and what they paid
export const PartnerStatTiles: FC<{
  stats?: PartnerAffiliateStats | null;
  loading?: boolean;
  className?: string;
}> = ({ stats, loading, className }) => {
  const t = useT();
  if (loading || !stats) {
    return (
      <div className={cx('tdw-strip tdw-partners-strip', className)} aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatTile key={i} loading={true} label="" value="" />
        ))}
      </div>
    );
  }
  const n = (v: number) => v.toLocaleString('en-US');
  return (
    <div className={cx('tdw-strip tdw-partners-strip', className)}>
      <StatTile
        label={t('tdw_partners_stat_signups', 'Sign-ups')}
        value={n(stats.signups)}
        hint={t('tdw_partners_stat_signups_hint', 'Workspaces that joined with your link')}
      />
      <StatTile
        label={t('tdw_partners_stat_trials', 'In trial')}
        value={n(stats.trials)}
        hint={t('tdw_partners_stat_trials_hint', 'Not paying yet')}
      />
      <StatTile
        label={t('tdw_partners_stat_paying', 'Paying customers')}
        value={n(stats.paying)}
        hint={t('tdw_partners_stat_paying_hint', 'Paying now; sets your tier')}
      />
      <StatTile
        label={t('tdw_partners_stat_revenue', 'Revenue referred')}
        value={usd(stats.revenueCents)}
        hint={t('tdw_partners_stat_revenue_hint', 'Paid invoices, before tax')}
      />
    </div>
  );
};
