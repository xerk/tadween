'use client';

// PartnerStatTiles: an affiliate's numbers (sign-ups, trials, paying
// customers, revenue referred, commission pending / available / paid) and
// the commission tier card (current rate and progress to the next tier).
// Used on /partners. Styles: app/tadween/partners.scss.
import React, { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { cx, Icon, Skeleton, StatTile } from '@gitroom/frontend/components/tadween/ui';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';
import type {
  PartnerAffiliateStats,
  PartnerTierRate,
} from '@gitroom/frontend/components/tadween/referral/partners.api';

const usd = (cents: number) => formatUsd(cents / 100);

// The first tier above the current paying count (null on the top tier)
export const nextPartnerTier = (tiers: PartnerTierRate[], paying: number) =>
  [...tiers].sort((a, b) => a.minPaying - b.minPaying).find((x) => x.minPaying > paying) || null;

export const PartnerTierCard: FC<{
  rate: number;
  paying: number;
  tiers: PartnerTierRate[];
  // a rate set by the team: no tier progress
  fixedRate?: boolean;
}> = ({ rate, paying, tiers, fixedRate }) => {
  const t = useT();
  const next = fixedRate ? null : nextPartnerTier(tiers, paying);
  const pct = next ? Math.min(100, Math.round((paying / Math.max(next.minPaying, 1)) * 100)) : 100;
  return (
    <div className="tdw-partners-tier">
      <div className="tdw-partners-tier-head">
        <span className="tdw-partners-tier-badge" aria-hidden="true">
          <Icon name="award" size={20} />
        </span>
        <div className="min-w-0">
          <div className="tdw-partners-tier-label">{t('tdw_partners_rate', 'Your commission')}</div>
          <div className="tdw-partners-tier-rate">
            <span dir="ltr">{rate}%</span>
            <span className="tdw-partners-tier-sub">{t('tdw_partners_rate_of', 'of every paid invoice')}</span>
          </div>
        </div>
      </div>
      {next ? (
        <div className="tdw-partners-tier-progress">
          <div className="tdw-partners-tier-row">
            <span>
              {t('tdw_partners_tier_progress', '{{paying}} / {{target}} paying to {{rate}}%', {
                paying,
                target: next.minPaying,
                rate: next.rate,
              })}
            </span>
            <span className="tdw-partners-tier-left">
              {t('tdw_partners_tier_left', '{{n}} to go', { n: next.minPaying - paying })}
            </span>
          </div>
          <span
            className="tdw-partners-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={next.minPaying}
            aria-valuenow={paying}
          >
            <span style={{ width: `${pct}%` }} />
          </span>
        </div>
      ) : (
        <p className="tdw-partners-tier-top">
          {fixedRate
            ? t('tdw_partners_tier_fixed', 'A rate agreed with the Tadween team.')
            : t('tdw_partners_tier_top', 'You’re on the top tier.')}
        </p>
      )}
    </div>
  );
};

export const PartnerStatTiles: FC<{
  stats?: PartnerAffiliateStats | null;
  // current rate in percent (already includes an admin override)
  rate?: number;
  tiers?: PartnerTierRate[];
  fixedRate?: boolean;
  // days a commission is held before it becomes available
  holdDays?: number;
  loading?: boolean;
  className?: string;
}> = ({ stats, rate = 0, tiers = [], fixedRate, holdDays = 30, loading, className }) => {
  const t = useT();
  if (loading || !stats) {
    return (
      <div className={cx('tdw-partners-stats', className)} aria-busy="true">
        <Skeleton height={132} radius={16} className="tdw-partners-stats-wide" />
        {Array.from({ length: 7 }).map((_, i) => (
          <StatTile key={i} loading={true} label="" value="" />
        ))}
      </div>
    );
  }
  const n = (v: number) => v.toLocaleString('en-US');
  return (
    <div className={cx('tdw-partners-stats', className)}>
      <div className="tdw-partners-stats-wide">
        <PartnerTierCard rate={rate} paying={stats.paying} tiers={tiers} fixedRate={fixedRate} />
      </div>
      <StatTile label={t('tdw_partners_stat_signups', 'Sign-ups')} value={n(stats.signups)} />
      <StatTile label={t('tdw_partners_stat_trials', 'In trial')} value={n(stats.trials)} />
      <StatTile label={t('tdw_partners_stat_paying', 'Paying customers')} value={n(stats.paying)} />
      <StatTile
        label={t('tdw_partners_stat_revenue', 'Revenue referred')}
        value={usd(stats.revenueCents)}
        hint={t('tdw_partners_stat_revenue_hint', 'Paid invoices, before tax')}
      />
      <StatTile
        label={t('tdw_partners_stat_pending', 'Pending')}
        value={usd(stats.pendingCents)}
        hint={t('tdw_partners_stat_pending_hint', 'In the {{n}}-day hold', { n: holdDays })}
      />
      <StatTile
        label={t('tdw_partners_stat_available', 'Available')}
        value={usd(stats.availableCents)}
        hint={t('tdw_partners_stat_available_hint', 'Ready for your next payout')}
      />
      <StatTile label={t('tdw_partners_stat_paid', 'Paid out')} value={usd(stats.paidCents)} />
    </div>
  );
};
