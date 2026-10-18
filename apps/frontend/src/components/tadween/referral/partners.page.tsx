'use client';

// Partner dashboard (/partners): the affiliate's own page, full width.
// On top the numbers (the commission tier card, then sign-ups, trials,
// paying customers, revenue referred, pending, available, paid out) and the
// link card; then payout history beside how they get paid (the settings
// open in a drawer), then the creator kit and the rules. Only for AFFILIATE workspaces
// while the `affiliate` switch is on; everyone else sees "Become a partner"
// (the program stays invite-only: the application is emailed to the team,
// who add the affiliate in Admin → Growth → Partners). Rules and data:
// docs/tadween/partners.md.
// Styles: app/tadween/partners.scss.
import React, { FC, useState } from 'react';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import {
  Banner,
  Button,
  EmptyState,
  Icon,
  Input,
  LinkButton,
  Pill,
  Skeleton,
  Table,
  TadweenScope,
  Textarea,
} from '@gitroom/frontend/components/tadween/ui';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';
import { ReferralLinkCard } from '@gitroom/frontend/components/tadween/referral/referral.link.card';
import { PartnerStatTiles } from '@gitroom/frontend/components/tadween/referral/partner.stat.tiles';
import {
  PayoutPreferenceCard,
  useMethodLabel,
} from '@gitroom/frontend/components/tadween/referral/payout.preference.card';
import {
  PartnerAffiliate,
  PartnerMe,
  useApplyPartner,
  usePartnerMe,
} from '@gitroom/frontend/components/tadween/referral/partners.api';
import {
  useFeatures,
  useInstanceSettings,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';

const usd = (cents: number) => formatUsd(cents / 100);

// ── Creator kit and rules ───────────────────────────────────────────────────
const CreatorKit: FC = () => {
  const t = useT();
  const items = [
    { icon: 'images', title: t('tdw_partners_kit_logo', 'Logo and screenshots'), body: t('tdw_partners_kit_logo_body', 'The Tadween logo in light and dark, and app screenshots in English and Arabic.') },
    { icon: 'smartphone', title: t('tdw_partners_kit_video', '30-second phone recording'), body: t('tdw_partners_kit_video_body', 'A vertical screen recording: write a post, pick the time, done.') },
    { icon: 'file-text', title: t('tdw_partners_kit_posts', 'Ready posts for LinkedIn / X / TikTok'), body: t('tdw_partners_kit_posts_body', 'Posts and scripts you can adapt, in English and Arabic.') },
    { icon: 'shield-check', title: t('tdw_partners_kit_disclosure', 'Disclosure templates'), body: t('tdw_partners_kit_disclosure_body', 'The «إعلان» / “Ad” line for each platform.') },
  ];
  return (
    <section className="tdw-partners-card" aria-labelledby="tdw-partners-kit-title">
      <header className="tdw-partners-card-head">
        <div className="min-w-0">
          <h3 id="tdw-partners-kit-title" className="tdw-partners-card-title">
            {t('tdw_partners_kit_title', 'Creator kit')}
          </h3>
          <p className="tdw-partners-card-desc">
            {t('tdw_partners_kit_desc', 'Ask us for the kit: reply to your welcome email or contact support.')}
          </p>
        </div>
      </header>
      <div className="tdw-partners-kit">
        {items.map((i) => (
          <div key={i.title} className="tdw-partners-kit-card">
            <span className="tdw-partners-kit-icon" aria-hidden="true">
              <Icon name={i.icon} size={18} />
            </span>
            <div className="min-w-0">
              <h4 className="tdw-partners-kit-title">{i.title}</h4>
              <p className="tdw-partners-kit-body">{i.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const Rules: FC<{ affiliate: PartnerAffiliate }> = ({ affiliate }) => {
  const t = useT();
  const rules = [
    t('tdw_partners_rule_ad', 'Every paid or sponsored post starts with «إعلان» / “Ad”.'),
    t('tdw_partners_rule_brand', 'No ads on the Tadween brand name (تدوين), and no coupon or deal sites.'),
    t('tdw_partners_rule_self', 'No self-referral: your own workspaces, cards or billing accounts don’t count.'),
    t(
      'tdw_partners_rule_paid',
      'Commission only on paid invoices, for {{months}} months from each customer’s first payment, held {{days}} days. Refunds and chargebacks take it back.',
      { months: affiliate.commissionMonths, days: affiliate.holdDays }
    ),
    t('tdw_partners_rule_mawthooq', 'Creators in Saudi Arabia need a Mawthooq licence for cash payouts.'),
    t('tdw_partners_rule_w8ben', 'Confirm the W-8BEN before your first cash payout.'),
  ];
  return (
    <section className="tdw-partners-card" aria-labelledby="tdw-partners-rules-title">
      <header className="tdw-partners-card-head">
        <h3 id="tdw-partners-rules-title" className="tdw-partners-card-title">
          {t('tdw_partners_rules_title', 'Program rules')}
        </h3>
      </header>
      <ul className="tdw-partners-rules">
        {rules.map((r) => (
          <li key={r}>
            <Icon name="check" size={16} />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

// ── Payout history ──────────────────────────────────────────────────────────
const PayoutHistory: FC<{ affiliate: PartnerAffiliate }> = ({ affiliate }) => {
  const t = useT();
  const methodLabel = useMethodLabel();
  return (
    <section className="tdw-partners-card" aria-labelledby="tdw-partners-history-title">
      <header className="tdw-partners-card-head">
        <h3 id="tdw-partners-history-title" className="tdw-partners-card-title">
          {t('tdw_partners_history_title', 'Payout history')}
        </h3>
      </header>
      {affiliate.payouts.length ? (
        <div className="tdw-partners-scroll tdw-partners-table">
          <Table
            rowKey={(p) => p.id}
            rows={affiliate.payouts}
            columns={[
              {
                key: 'date',
                label: t('tdw_partners_col_date', 'Date'),
                render: (p) => <span className="tdw-partners-num">{dayjs(p.paidAt || p.createdAt).format('D MMM YYYY')}</span>,
              },
              { key: 'method', label: t('tdw_partners_col_method', 'Paid as'), render: (p) => methodLabel(p.method) },
              {
                key: 'amount',
                label: t('tdw_partners_col_amount', 'Commission'),
                align: 'right',
                render: (p) => (
                  <span className="tdw-partners-num">
                    {usd(p.amountCents)}
                    {p.method === 'balance' ? (
                      <span className="caption pz-muted">
                        {' '}
                        → {usd(Math.round(p.amountCents * affiliate.balanceMultiplier))}
                      </span>
                    ) : null}
                  </span>
                ),
              },
            ]}
          />
        </div>
      ) : (
        <EmptyState
          size="sm"
          icon="receipt"
          title={t('tdw_partners_history_empty', 'No payouts yet.')}
          body={t('tdw_partners_history_empty_body', 'Commission shows here once it’s paid, as cash or Tadween balance.')}
        />
      )}
    </section>
  );
};

// ── Become a partner (every workspace that isn't an affiliate) ─────────────
const PartnerApply: FC<{ program: PartnerMe['program'] }> = ({ program }) => {
  const t = useT();
  const toast = useToaster();
  const user = useUser();
  const apply = useApplyPartner();
  const [audience, setAudience] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const rates = program.tierRates.map((r) => r.rate);
  const rate = Math.min(...rates);
  const top = Math.max(...rates);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apply({ audience: audience.trim(), note: note.trim() || undefined });
      setSent(true);
    } catch (err) {
      toast.show((err as Error).message, 'warning');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <EmptyState
        icon="circle-check"
        title={t('tdw_partners_apply_sent', 'Application sent')}
        body={t(
          'tdw_partners_apply_sent_body',
          'Thanks! We review every application and reply by email to {{email}}.',
          { email: user?.email || '' }
        )}
        action={
          <LinkButton href="/invite" variant="primary" icon="gift">
            {t('tdw_partners_open_invite', 'Open Invite & earn')}
          </LinkButton>
        }
      />
    );
  }

  return (
    <form className="tdw-partners-card tdw-partners-apply" onSubmit={submit}>
      <header className="tdw-partners-apply-head">
        <span className="tdw-partners-apply-badge" aria-hidden="true">
          <Icon name="award" size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="tdw-partners-title">
            {t('tdw_partners_apply_title', 'Become a Tadween partner')}
          </h1>
          <p className="tdw-partners-sub">
            {t(
              'tdw_ref_offer_title',
              'Earn {{rate}}% of what your referrals pay for {{months}} months',
              { rate, months: program.commissionMonths }
            )}
            {top > rate
              ? ` · ${t('tdw_partners_apply_top', 'up to {{top}}% as you grow', { top })}`
              : null}
          </p>
        </div>
      </header>
      <p className="tdw-partners-card-desc">
        {t(
          'tdw_partners_apply_body',
          'For creators and agencies with an audience that plans social posts. The program is invite-only for now: tell us where your audience is and we reply by email.'
        )}
      </p>
      <Input
        dir="auto"
        required={true}
        minLength={2}
        maxLength={300}
        value={audience}
        onChange={(e) => setAudience(e.target.value)}
        label={t('tdw_partners_apply_audience', 'Where is your audience?')}
        hint={t(
          'tdw_partners_apply_audience_hint',
          'A link to your profile, channel or site, and roughly how many followers.'
        )}
      />
      <Textarea
        dir="auto"
        rows={3}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        label={t('tdw_partners_apply_note', 'Anything else we should know? (optional)')}
      />
      <div className="tdw-partners-apply-foot">
        <Button type="submit" variant="primary" loading={busy} disabled={audience.trim().length < 2}>
          {t('tdw_partners_apply_send', 'Send application')}
        </Button>
        {!user?.paymentsEnabled ? (
          <span className="tdw-partners-apply-note">
            <Icon name="clock" size={14} />
            {t('tdw_ref_offer_note', 'Commissions start when paid plans launch.')}
          </span>
        ) : null}
      </div>
    </form>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
export const PartnersPage: FC = () => {
  const t = useT();
  // the program's switch first: while it is off there is no dashboard to ask for
  const { data: settings, error: settingsError } = useInstanceSettings();
  const isOn = useFeatures();
  const programOn = !!settings && isOn('affiliate');
  const user = useUser();
  const { data, error, isLoading, mutate } = usePartnerMe(programOn);

  if (isLoading || (!settings && !settingsError)) {
    return (
      <div className="tdw-partners-shell">
        <TadweenScope className="tdw-partners-page">
          <Skeleton height={32} width="30%" />
          <PartnerStatTiles loading={true} />
          <Skeleton height={232} radius={14} />
        </TadweenScope>
      </div>
    );
  }

  // a workspace that isn't an affiliate: "Become a partner"
  if (programOn && data && (data.kind !== 'AFFILIATE' || !data.affiliate)) {
    return (
      <div className="tdw-partners-shell is-empty">
        <TadweenScope className="tdw-partners-page is-apply">
          <PartnerApply program={data.program} />
        </TadweenScope>
      </div>
    );
  }

  // the program is switched off (or the API says so: 404)
  if (!programOn || (error && error.status === 404)) {
    return (
      <div className="tdw-partners-shell is-empty">
        <TadweenScope className="tdw-partners-page">
          <EmptyState
            icon="award"
            title={t('tdw_partners_invite_only', 'The partners program is invite-only')}
            body={t(
              'tdw_partners_invite_only_body',
              'It’s for creators we work with. You can still invite friends and earn rewards with your own link.'
            )}
            action={
              <LinkButton href="/invite" variant="primary" icon="gift">
                {t('tdw_partners_open_invite', 'Open Invite & earn')}
              </LinkButton>
            }
          />
        </TadweenScope>
      </div>
    );
  }

  if (error || !data || !data.affiliate) {
    return (
      <div className="tdw-partners-shell">
        <TadweenScope className="tdw-partners-page">
          <Banner
            tone="error"
            title={t('tdw_partners_error', 'Couldn’t load your partner dashboard.')}
            action={
              <Button size="sm" onClick={() => mutate()}>
                {t('tdw_partners_retry', 'Try again')}
              </Button>
            }
          >
            {error?.message}
          </Banner>
        </TadweenScope>
      </div>
    );
  }

  const affiliate = data.affiliate;
  const fixedRate = !affiliate.tiers.some((x) => x.tier === affiliate.tier && x.rate === affiliate.rate);

  return (
    <div className="tdw-partners-shell">
      <TadweenScope className="tdw-partners-page">
        <header className="tdw-partners-head">
          <div className="min-w-0">
            <h1 className="tdw-partners-title">{t('tdw_partners_title', 'Partner dashboard')}</h1>
            <p className="tdw-partners-sub">
              {t(
                'tdw_partners_sub',
                'You earn {{rate}}% of every paid invoice from the customers you bring, for their first {{months}} months.',
                { rate: affiliate.rate, months: affiliate.commissionMonths }
              )}
            </p>
          </div>
          {data.ambassador ? (
            <Pill tone="brand" icon="badge-check">
              {t('tdw_partners_ambassador', 'Ambassador')}
            </Pill>
          ) : null}
        </header>

        {data.status === 'SUSPENDED' ? (
          <Banner tone="warning" title={t('tdw_partners_suspended', 'Your partner account is paused.')}>
            {t('tdw_partners_suspended_body', 'New customers don’t earn commission until it’s reactivated. Contact support.')}
          </Banner>
        ) : null}

        <PartnerStatTiles
          stats={affiliate.stats}
          rate={affiliate.rate}
          tiers={affiliate.tiers}
          fixedRate={fixedRate}
          holdDays={affiliate.holdDays}
        />

        <ReferralLinkCard
          code={data.code}
          friendCredits={data.friendCredits}
          trialDays={data.trialDays}
          prelaunch={!user?.paymentsEnabled}
        />

        <div className="tdw-partners-row">
          <PayoutHistory affiliate={affiliate} />
          <PayoutPreferenceCard affiliate={affiliate} onSaved={() => mutate()} />
        </div>

        <div className="tdw-partners-row">
          <CreatorKit />
          <Rules affiliate={affiliate} />
        </div>
      </TadweenScope>
    </div>
  );
};
