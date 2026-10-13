'use client';

// Invite & earn (ادعُ واكسب): every workspace's referral page, full width.
// The link card and "Who invited you?" for new workspaces on top, the
// rewards ladder as a progress track, the numbers, the workspaces invited
// (initials only) beside the rewards earned, then how it works. Shown in the sidebar
// (/invite) and in Settings, while the `affiliate` switch is on. Rules and
// data: docs/tadween/partners.md. Styles: app/tadween/referral.scss.
import React, { FC, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  cx,
  EmptyState,
  Icon,
  Pill,
  Skeleton,
  StatTile,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import { usePartnerMe } from '@gitroom/frontend/components/tadween/referral/partners.api';
import { ReferralLinkCard } from '@gitroom/frontend/components/tadween/referral/referral.link.card';
import {
  RewardLadder,
  useLadderLabels,
} from '@gitroom/frontend/components/tadween/referral/reward.ladder';
import { ReferralStatusList } from '@gitroom/frontend/components/tadween/referral/referral.status.list';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';

// "Who invited you?": a code, during the first days after sign-up
const ClaimCode: FC<{ until: string; onClaimed: () => void }> = ({
  until,
  onClaimed,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/partners/claim', {
      method: 'POST',
      body: JSON.stringify({ code: code.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      let message = t('tdw_ref_claim_error', 'This code can’t be used.');
      try {
        message = (await res.json()).message || message;
      } catch (err) {
        // keep the generic message
      }
      setError(message);
      return;
    }
    toast.show(t('tdw_ref_claim_done', 'Thanks! Your inviter will get the credit.'));
    onClaimed();
  };

  return (
    <form className="tdw-ref-claim" onSubmit={submit}>
      <div className="min-w-0">
        <h3 className="tdw-ref-claim-title">{t('tdw_ref_claim_title', 'Who invited you?')}</h3>
        <p className="tdw-ref-claim-sub">
          {t(
            'tdw_ref_claim_sub',
            'Add their code by {{date}}. You both get rewarded once you subscribe.',
            { date: dayjs(until).format('D MMM') }
          )}
        </p>
      </div>
      <div className="tdw-ref-claim-row">
        <input
          className="tdw-ref-claim-input"
          dir="ltr"
          value={code}
          maxLength={32}
          placeholder={t('tdw_ref_claim_placeholder', 'Code, e.g. K7M2QX9P')}
          aria-label={t('tdw_ref_claim_title', 'Who invited you?')}
          aria-invalid={!!error}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <Button type="submit" loading={busy} disabled={code.trim().length < 3}>
          {t('tdw_ref_claim_add', 'Add code')}
        </Button>
      </div>
      {error ? (
        <p className="tdw-ref-claim-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
};

const rewardText = (
  t: ReturnType<typeof useT>,
  r: { type: string; step: number | null; credits: number; amountCents: number; note: string | null },
  ladder: ReturnType<typeof useLadderLabels>
) => {
  if (r.type === 'CREDITS') {
    return t('tdw_ref_reward_credits_added', '+{{n}} AI credits', {
      n: r.credits.toLocaleString(),
    });
  }
  if (r.type === 'ACCOUNT_CREDIT') {
    return r.amountCents
      ? t('tdw_ref_reward_month_added', '1 free month ({{amount}} balance)', {
          amount: formatUsd(r.amountCents / 100),
        })
      : t('tdw_ref_reward_free_month', '1 free month');
  }
  if (r.type === 'UPGRADE') {
    return ladder({
      step: r.step || 0,
      reward: r.note === 'founder_for_life' ? 'founder_for_life' : 'next_plan_year',
      credits: null,
    });
  }
  return r.type;
};

export const InviteEarn: FC<{ embedded?: boolean }> = ({ embedded }) => {
  const t = useT();
  const ladder = useLadderLabels();
  const { data, error, isLoading, mutate } = usePartnerMe();

  if (isLoading) {
    return (
      <TadweenScope className={cx('tdw-ref-page', embedded && 'is-embedded')}>
        <Skeleton height={232} radius={14} />
        <Skeleton height={200} radius={14} />
        <Skeleton height={220} radius={14} />
      </TadweenScope>
    );
  }
  if (error || !data) {
    return (
      <TadweenScope className={cx('tdw-ref-page', embedded && 'is-embedded')}>
        <EmptyState
          icon="gift"
          title={t('tdw_ref_off_title', 'Invite & earn isn’t available')}
          body={t('tdw_ref_off_body', 'The referral program isn’t switched on for this workspace yet.')}
        />
      </TadweenScope>
    );
  }

  const paying = data.referrals.filter((r) => r.status === 'PAID' || r.status === 'QUALIFIED').length;
  const earned = data.rewards.filter((r) => r.status === 'PAID' || r.status === 'AVAILABLE' || r.status === 'APPLYING');

  return (
    <TadweenScope className={cx('tdw-ref-page', embedded && 'is-embedded')}>
      {data.status === 'SUSPENDED' ? (
        <Banner tone="warning" title={t('tdw_ref_suspended', 'Your referral link is paused.')}>
          {t('tdw_ref_suspended_body', 'Contact support to reactivate it.')}
        </Banner>
      ) : null}

      <ReferralLinkCard code={data.code} friendCredits={data.friendCredits} trialDays={data.trialDays} />

      {data.kind === 'AFFILIATE' ? (
        <Link href="/partners" className="tdw-ref-partner-link no-underline">
          <Icon name="chart-column" size={18} />
          <span>{t('tdw_ref_open_partners', 'You’re a Tadween partner: open your partner dashboard')}</span>
          <Icon name="chevron-right" size={16} className="tdw-flip" />
        </Link>
      ) : null}

      {data.invited.canClaim ? (
        <ClaimCode until={data.invited.claimUntil} onClaimed={() => mutate()} />
      ) : data.invited.by ? (
        <div className="tdw-ref-invited">
          <Icon name="badge-check" size={18} />
          <span>
            {t('tdw_ref_invited_by', 'You joined with code {{code}}.', { code: data.invited.by })}{' '}
            {data.invited.bonus.some((b) => b.status === 'PAID')
              ? t('tdw_ref_invited_bonus_done', 'Your {{n}} bonus credits are in your balance.', {
                  n: data.invited.bonus.reduce((a, b) => a + b.credits, 0).toLocaleString(),
                })
              : t('tdw_ref_invited_bonus_wait', 'You get your bonus credits with your first payment.')}
          </span>
        </div>
      ) : null}

      {data.kind === 'REFERRER' ? (
        <section className="tdw-ref-sec">
          <header className="tdw-ref-sec-head">
            <h3>{t('tdw_ref_ladder_title', 'Your rewards ladder')}</h3>
            {data.ambassador ? (
              <Pill tone="brand" icon="award">
                {t('tdw_ref_ambassador', 'Ambassador')}
              </Pill>
            ) : null}
          </header>
          <RewardLadder steps={data.ladder} qualified={data.qualified} />
        </section>
      ) : null}

      <div className="tdw-ref-stats">
        <StatTile label={t('tdw_ref_stat_invited', 'Joined with your link')} value={data.referrals.length.toLocaleString()} />
        <StatTile label={t('tdw_ref_stat_paying', 'Paying')} value={paying.toLocaleString()} />
        <StatTile label={t('tdw_ref_stat_credits', 'Credits earned')} value={data.creditsEarned.toLocaleString()} />
      </div>

      <div className={cx('tdw-ref-split', !earned.length && 'is-single')}>
        <section className="tdw-ref-sec">
          <header className="tdw-ref-sec-head">
            <h3>{t('tdw_ref_people_title', 'Workspaces you invited')}</h3>
            {data.referrals.length ? (
              <span className="caption pz-muted">
                {t('tdw_ref_people_count', '{{n}} joined · {{paying}} paying', {
                  n: data.referrals.length.toLocaleString(),
                  paying: paying.toLocaleString(),
                })}
              </span>
            ) : null}
          </header>
          <ReferralStatusList referrals={data.referrals} />
        </section>

        {earned.length ? (
          <section className="tdw-ref-sec">
            <header className="tdw-ref-sec-head">
              <h3>{t('tdw_ref_rewards_title', 'Rewards')}</h3>
            </header>
            <ul className="tdw-ref-rewards">
              {earned.map((r) => (
                <li key={r.id} className="tdw-ref-reward">
                  <span className={cx('tdw-ref-reward-icon', r.type === 'CREDITS' && 'is-credits')} aria-hidden="true">
                    <Icon name={r.type === 'CREDITS' ? 'sparkles' : r.type === 'UPGRADE' ? 'trophy' : 'gift'} size={16} />
                  </span>
                  <span className="tdw-ref-reward-text">{rewardText(t, r, ladder)}</span>
                  {r.status === 'PAID' ? (
                    <Pill tone="ok" icon="check">
                      {t('tdw_ref_reward_added', 'Added')}
                    </Pill>
                  ) : r.type === 'UPGRADE' ? (
                    <Pill tone="brand">{t('tdw_ref_reward_by_team', 'Our team applies it')}</Pill>
                  ) : (
                    <Pill tone="brand" icon="clock">
                      {r.type === 'CREDITS'
                        ? t('tdw_ref_reward_next_month', 'Next month (monthly limit)')
                        : t('tdw_ref_reward_next_invoice', 'On your next invoice')}
                    </Pill>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <section className="tdw-ref-how" aria-labelledby="tdw-ref-how-title">
        <h3 id="tdw-ref-how-title">{t('tdw_ref_how_title', 'How it works')}</h3>
        <ol className="tdw-ref-steps">
          <li>
            <span className="tdw-ref-step-num">1</span>
            <span>{t('tdw_ref_how_1', 'Share your link or code.')}</span>
          </li>
          <li>
            <span className="tdw-ref-step-num">2</span>
            <span>
              {t('tdw_ref_how_2', 'Your friend signs up and subscribes. They get {{n}} AI credits on their first payment.', {
                n: data.friendCredits.toLocaleString(),
              })}
            </span>
          </li>
          <li>
            <span className="tdw-ref-step-num">3</span>
            <span>
              {t(
                'tdw_ref_how_3',
                'They count on your ladder after their second payment (or 30 days into a yearly plan). Rewards are added automatically.'
              )}
            </span>
          </li>
        </ol>
        <p className="tdw-ref-rules">
          {t(
            'tdw_ref_rules',
            'Rewards come only from paid subscriptions, never from trials. Inviting yourself or your own workspaces doesn’t count, and refunds or chargebacks cancel rewards. Up to 10 credit rewards a month. Each workspace has one inviter, and it never changes.'
          )}
        </p>
      </section>
    </TadweenScope>
  );
};

// The sidebar's /invite page
export const InviteEarnPage: FC = () => (
  <div className="tdw-ref-shell">
    <InviteEarn />
  </div>
);
