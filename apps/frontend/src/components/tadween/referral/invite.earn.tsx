'use client';

// Invite & earn (ادعُ واكسب): every workspace's referral page. It grows with
// the user: one card with the invite link, Copy, the share icons and the
// code; "Your rewards" (referrers: progress to the next reward and the
// ladder); "Your invites" (a small hint until someone joins, then the
// workspaces invited and the rewards earned); one slim partner row (apply on
// /partners, or open the dashboard for an affiliate); "Have an invite code?"
// during the first days after sign-up; "How it works", collapsed. Shown in
// the sidebar (/invite) and in Settings, while the `affiliate` switch is on.
// Rules and data: docs/tadween/partners.md. Styles: app/tadween/referral.scss.
// While payments are off (/user/self → paymentsEnabled) the page promises
// only what works without a payment: friends skip the waitlist, the ladder
// shows with "Rewards unlock when paid plans launch" (also on a plan without
// AI credits, with its own line), and the partner row says commissions start
// later.
import React, { FC, ReactNode, useEffect, useRef, useState } from 'react';
import copy from 'copy-to-clipboard';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import {
  Banner,
  Button,
  cx,
  EmptyState,
  Icon,
  LinkButton,
  Pill,
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import {
  PartnerMe,
  usePartnerMe,
} from '@gitroom/frontend/components/tadween/referral/partners.api';
import {
  ShareMark,
  shareTargets,
  useCanShare,
  useInviteLink,
  useShareMessage,
} from '@gitroom/frontend/components/tadween/referral/referral.link.card';
import {
  RewardLadder,
  useLadderLabels,
} from '@gitroom/frontend/components/tadween/referral/reward.ladder';
import { ReferralStatusList } from '@gitroom/frontend/components/tadween/referral/referral.status.list';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';

// Counts in Western digits, in Arabic too
const num = (n: number) => n.toLocaleString('en-US');

// The invite card: title, one line, the link with Copy (confirmed on the
// button itself), and the share icons
const InviteCard: FC<{
  code: string;
  friendCredits: number;
  trialDays: number | null;
  prelaunch: boolean;
}> = ({ code, friendCredits, trialDays, prelaunch }) => {
  const t = useT();
  const link = useInviteLink(code);
  const canShare = useCanShare();
  const message = useShareMessage({ friendCredits, trialDays, prelaunch });
  // what was just copied: its button shows a check for a moment
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copyText = (what: 'link' | 'code') => {
    copy(what === 'link' ? link : code);
    setCopied(what);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1800);
  };

  return (
    <section className="tdw-ref-invite" aria-labelledby="tdw-ref-invite-title">
      <div>
        <h2 id="tdw-ref-invite-title" className="tdw-ref-invite-title">
          {t('tdw_ref_invite_title', 'Invite friends to Tadween')}
        </h2>
        <p className="tdw-ref-invite-sub">
          {prelaunch
            ? t('tdw_ref_invite_sub_prelaunch', 'Friends who join with your link skip the waitlist.')
            : trialDays
            ? t(
                'tdw_ref_card_sub_trial',
                'Your audience gets a {{days}}-day trial and {{n}} AI credits on their first payment.',
                { n: num(friendCredits), days: trialDays }
              )
            : t(
                'tdw_ref_card_sub',
                'Friends who join with your link get {{n}} AI credits on their first payment.',
                { n: num(friendCredits) }
              )}
        </p>
      </div>

      <div className="tdw-ref-link-row">
        <input
          className="tdw-ref-link-input"
          readOnly={true}
          dir="ltr"
          value={link}
          aria-label={t('tdw_ref_your_link', 'Your invite link')}
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          variant="primary"
          icon={copied === 'link' ? 'check' : 'copy'}
          disabled={!link}
          onClick={() => copyText('link')}
          className="tdw-ref-copy"
        >
          <span aria-live="polite">
            {copied === 'link' ? t('tdw_ref_copied', 'Copied') : t('copy', 'Copy')}
          </span>
        </Button>
      </div>

      <div className="tdw-ref-invite-foot">
        <div className="tdw-ref-icons" role="group" aria-label={t('tdw_ref_share', 'Share')}>
          {shareTargets(message, link).map((s) => (
            <a
              key={s.key}
              className="tdw-ref-icon-btn"
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('tdw_ref_share_on', 'Share on {{network}}', { network: s.label })}
              title={s.label}
            >
              <ShareMark network={s.key} />
            </a>
          ))}
          {canShare ? (
            <button
              type="button"
              className="tdw-ref-icon-btn"
              aria-label={t('tdw_ref_share', 'Share')}
              title={t('tdw_ref_share', 'Share')}
              onClick={() =>
                navigator
                  .share({ title: 'Tadween', text: message, url: link })
                  .catch(() => undefined)
              }
            >
              <Icon name="share-2" size={18} />
            </button>
          ) : null}
        </div>
        {/* the code, for friends who sign up without the link */}
        <button
          type="button"
          className="tdw-ref-code"
          onClick={() => copyText('code')}
          aria-label={t('tdw_ref_copy_code', 'Copy code {{code}}', { code })}
        >
          <span className="tdw-ref-code-label">{t('tdw_ref_code', 'Code')}</span>
          <span className="tdw-ref-code-value" dir="ltr">
            {code}
          </span>
          <Icon name={copied === 'code' ? 'check' : 'copy'} size={14} />
        </button>
      </div>
    </section>
  );
};

// The partner program as one row: apply on /partners, or, for an affiliate,
// open the dashboard. The numbers come from the program's config.
const PartnerRow: FC<{ data: PartnerMe; prelaunch: boolean }> = ({ data, prelaunch }) => {
  const t = useT();
  if (data.kind === 'AFFILIATE') {
    return (
      <div className="tdw-ref-row">
        <span className="tdw-ref-row-icon" aria-hidden="true">
          <Icon name="chart-column" size={18} />
        </span>
        <span className="tdw-ref-row-text">
          {t('tdw_ref_partner_title', 'You’re a Tadween partner')}
        </span>
        <LinkButton href="/partners" size="sm" className="tdw-ref-row-cta">
          {t('tdw_ref_partner_open', 'Dashboard')}
          <Icon name="chevron-right" className="tdw-flip" />
        </LinkButton>
      </div>
    );
  }
  const rate = Math.min(...data.program.tierRates.map((r) => r.rate));
  return (
    <div className="tdw-ref-row">
      <span className="tdw-ref-row-icon" aria-hidden="true">
        <Icon name="gift" size={18} />
      </span>
      <span className="tdw-ref-row-text">
        {t('tdw_ref_partner_offer', 'Earn {{rate}}% for {{months}} months', {
          rate,
          months: data.program.commissionMonths,
        })}
        {prelaunch ? (
          <span className="tdw-ref-row-note">
            {t('tdw_ref_partner_later', 'Starts when paid plans launch')}
          </span>
        ) : null}
      </span>
      <LinkButton href="/partners" size="sm" className="tdw-ref-row-cta">
        {t('tdw_ref_partner_apply', 'Apply')}
      </LinkButton>
    </div>
  );
};

// "Who invited you?": a code, during the first days after sign-up. Folded
// into a small link until it's needed.
const ClaimCode: FC<{
  until: string;
  prelaunch: boolean;
  onClaimed: () => void;
}> = ({ until, prelaunch, onClaimed }) => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" className="tdw-ref-text-btn" onClick={() => setOpen(true)}>
        {t('tdw_ref_claim_open', 'Have an invite code?')}
      </button>
    );
  }

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
      <p className="tdw-ref-claim-sub">
        {prelaunch
          ? t(
              'tdw_ref_claim_sub_prelaunch',
              'Add their code by {{date}} so they get the credit for inviting you.',
              { date: dayjs(until).format('D MMM') }
            )
          : t(
              'tdw_ref_claim_sub',
              'Add their code by {{date}}. You both get rewarded once you subscribe.',
              { date: dayjs(until).format('D MMM') }
            )}
      </p>
      <div className="tdw-ref-claim-row">
        <input
          className="tdw-ref-claim-input"
          dir="ltr"
          value={code}
          maxLength={32}
          autoFocus={true}
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
      n: num(r.credits),
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

// A section: a small muted heading over its content
const Block: FC<{ id: string; title: string; aside?: ReactNode; children: ReactNode }> = ({
  id,
  title,
  aside,
  children,
}) => (
  <section className="tdw-ref-block" aria-labelledby={id}>
    <header className="tdw-ref-block-head">
      <h2 id={id} className="tdw-ref-heading">
        {title}
      </h2>
      {aside}
    </header>
    {children}
  </section>
);

// The ladder's goals and the progress to the next one. Shown while rewards
// can't be used yet too (payments off, or a plan without AI credits), with a
// badge saying when they unlock.
const RewardsBlock: FC<{ data: PartnerMe; prelaunch: boolean; creditsLocked: boolean }> = ({
  data,
  prelaunch,
  creditsLocked,
}) => {
  const t = useT();
  return (
    <Block
      id="tdw-ref-rewards-title"
      title={t('tdw_ref_rewards_heading', 'Your rewards')}
      aside={
        creditsLocked ? (
          <Pill icon="clock">
            {prelaunch
              ? t('tdw_ref_rewards_unlock', 'Rewards unlock when paid plans launch')
              : t('tdw_ref_rewards_paid_plan', 'Rewards unlock on a paid plan')}
          </Pill>
        ) : data.ambassador ? (
          <Pill tone="brand" icon="award">
            {t('tdw_ref_ambassador', 'Ambassador')}
          </Pill>
        ) : null
      }
    >
      <div className="tdw-ref-panel">
        <RewardLadder steps={data.ladder} qualified={data.qualified} />
      </div>
    </Block>
  );
};

// The workspaces invited and the rewards earned, once anyone joined
const InvitesBlock: FC<{
  data: PartnerMe;
  earned: PartnerMe['rewards'];
  prelaunch: boolean;
}> = ({ data, earned, prelaunch }) => {
  const t = useT();
  const ladder = useLadderLabels();
  return (
    <Block
      id="tdw-ref-invites-title"
      title={t('tdw_ref_invites_heading', 'Your invites')}
      aside={
        data.referrals.length ? (
          <span className="tdw-ref-heading-count">
            {t('tdw_ref_joined_count', '{{count}} friends joined', { count: data.referrals.length })}
          </span>
        ) : null
      }
    >
      {data.referrals.length ? (
        <div className="tdw-ref-panel">
          <ReferralStatusList referrals={data.referrals} />
          {earned.length ? (
            <div className="tdw-ref-earned">
              <p className="tdw-ref-earned-summary">
                {t('tdw_ref_rewards_count', '{{count}} rewards', { count: earned.length })}
              </p>
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
            </div>
          ) : !prelaunch && data.kind === 'REFERRER' ? (
            <p className="tdw-ref-earned-summary is-empty">
              {t('tdw_ref_rewards_none', 'No rewards yet. They come as friends subscribe.')}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="tdw-ref-empty">
          <Icon name="users" size={16} />
          {t('tdw_ref_invites_empty', 'No one has joined yet. Share your link and they’ll show up here.')}
        </p>
      )}
    </Block>
  );
};

// "How it works" and the rules, collapsed at the bottom
const HowItWorks: FC<{ friendCredits: number; prelaunch: boolean }> = ({ friendCredits, prelaunch }) => {
  const t = useT();
  return (
    <details className="tdw-ref-details">
      <summary>
        {t('tdw_ref_how_title', 'How it works')}
        <Icon name="chevron-down" size={14} className="tdw-ref-details-chev" />
      </summary>
      <div className="tdw-ref-how">
        <ol className="tdw-ref-steps">
          <li>
            <span className="tdw-ref-step-num">1</span>
            <span>{t('tdw_ref_how_1', 'Share your link or code.')}</span>
          </li>
          <li>
            <span className="tdw-ref-step-num">2</span>
            <span>
              {prelaunch
                ? t('tdw_ref_how_2_prelaunch', 'Your friend joins with your link, skips the waitlist and gets started right away.')
                : t('tdw_ref_how_2', 'Your friend signs up and subscribes. They get {{n}} AI credits on their first payment.', {
                    n: num(friendCredits),
                  })}
            </span>
          </li>
          <li>
            <span className="tdw-ref-step-num">3</span>
            <span>
              {prelaunch
                ? t('tdw_ref_how_3_prelaunch', 'When paid plans launch, friends who subscribe count toward your rewards.')
                : t(
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
      </div>
    </details>
  );
};

export const InviteEarn: FC<{ embedded?: boolean }> = ({ embedded }) => {
  const t = useT();
  const user = useUser();
  const { data, error, isLoading, mutate } = usePartnerMe();
  // payments off: no payment, so no credits, trial or commission yet
  const prelaunch = !user?.paymentsEnabled;
  // credit rewards can't be used yet (no payments, or a plan without AI)
  const creditsLocked = prelaunch || user?.freePlan?.aiCredits === 0;

  if (isLoading) {
    return (
      <TadweenScope className={cx('tdw-ref-page', embedded && 'is-embedded')}>
        <Skeleton height={212} radius={14} />
        <Skeleton height={180} radius={14} />
        <Skeleton height={96} radius={14} />
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

  const earned = data.rewards.filter((r) => r.status === 'PAID' || r.status === 'AVAILABLE' || r.status === 'APPLYING');

  return (
    <TadweenScope className={cx('tdw-ref-page', embedded && 'is-embedded')}>
      {data.status === 'SUSPENDED' ? (
        <Banner tone="warning" title={t('tdw_ref_suspended', 'Your referral link is paused.')}>
          {t('tdw_ref_suspended_body', 'Contact support to reactivate it.')}
        </Banner>
      ) : null}

      <InviteCard
        code={data.code}
        friendCredits={data.friendCredits}
        trialDays={data.trialDays}
        prelaunch={prelaunch}
      />

      {data.kind === 'REFERRER' ? (
        <RewardsBlock data={data} prelaunch={prelaunch} creditsLocked={creditsLocked} />
      ) : null}

      <InvitesBlock data={data} earned={earned} prelaunch={prelaunch} />

      <PartnerRow data={data} prelaunch={prelaunch} />

      {data.invited.canClaim ? (
        <ClaimCode
          until={data.invited.claimUntil}
          prelaunch={prelaunch}
          onClaimed={() => mutate()}
        />
      ) : data.invited.by ? (
        <p className="tdw-ref-invited">
          <Icon name="badge-check" size={16} />
          <span>
            {t('tdw_ref_invited_by', 'You joined with code {{code}}.', { code: data.invited.by })}{' '}
            {prelaunch && !data.invited.bonus.length
              ? null
              : data.invited.bonus.some((b) => b.status === 'PAID')
              ? t('tdw_ref_invited_bonus_done', 'Your {{n}} bonus credits are in your balance.', {
                  n: num(data.invited.bonus.reduce((a, b) => a + b.credits, 0)),
                })
              : t('tdw_ref_invited_bonus_wait', 'You get your bonus credits with your first payment.')}
          </span>
        </p>
      ) : null}

      <HowItWorks friendCredits={data.friendCredits} prelaunch={prelaunch} />
    </TadweenScope>
  );
};

// The sidebar's /invite page
export const InviteEarnPage: FC = () => (
  <div className="tdw-ref-shell">
    <InviteEarn />
  </div>
);
