'use client';

// Partner dashboard (/partners): the affiliate's own page. Numbers and tier,
// the link and code, how commission is paid (Tadween balance worth more, or
// cash once a month), payout history, the creator kit and the rules. Only
// for AFFILIATE workspaces while the `affiliate` switch is on; everyone else
// sees an invite-only notice pointing at Invite & earn. Rules and data:
// docs/tadween/partners.md. Styles: app/tadween/partners.scss.
import React, { FC, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  Checkbox,
  EmptyState,
  Icon,
  Input,
  LinkButton,
  Pill,
  RadioGroup,
  Section,
  Select,
  Skeleton,
  Table,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';
import { ReferralLinkCard } from '@gitroom/frontend/components/tadween/referral/referral.link.card';
import { PartnerStatTiles } from '@gitroom/frontend/components/tadween/referral/partner.stat.tiles';
import {
  PartnerAffiliate,
  PartnerPayoutMethod,
  PartnerPayoutPreference,
  usePartnerMe,
  useSavePartnerPayout,
} from '@gitroom/frontend/components/tadween/referral/partners.api';

const usd = (cents: number) => formatUsd(cents / 100);
const W8BEN_URL = 'https://www.irs.gov/forms-pubs/about-form-w-8-ben';
const METHODS: PartnerPayoutMethod[] = ['wise', 'payoneer', 'bank'];

const useMethodLabel = () => {
  const t = useT();
  return (method: string | null) =>
    method === 'wise'
      ? 'Wise'
      : method === 'payoneer'
      ? 'Payoneer'
      : method === 'bank'
      ? t('tdw_partners_method_bank', 'Bank transfer')
      : method === 'balance'
      ? t('tdw_partners_method_balance', 'Tadween balance')
      : method || '—';
};

// ── Payout preference and details ───────────────────────────────────────────
const PayoutSettings: FC<{ affiliate: PartnerAffiliate; onSaved: () => void }> = ({
  affiliate,
  onSaved,
}) => {
  const t = useT();
  const toast = useToaster();
  const savePayout = useSavePartnerPayout();
  const methodLabel = useMethodLabel();
  const saved = affiliate.payout;
  const [preference, setPreference] = useState<PartnerPayoutPreference>(saved.preference);
  const [method, setMethod] = useState<PartnerPayoutMethod>(saved.method || 'wise');
  const [details, setDetails] = useState('');
  const [country, setCountry] = useState(saved.country || '');
  const [mawthooq, setMawthooq] = useState(saved.mawthooqNumber || '');
  const [taxForm, setTaxForm] = useState(!!saved.taxFormAcceptedAt);
  const [saving, setSaving] = useState(false);

  // the saved values, again after each save
  useEffect(() => {
    setPreference(saved.preference);
    setMethod(saved.method || 'wise');
    setDetails('');
    setCountry(saved.country || '');
    setMawthooq(saved.mawthooqNumber || '');
    setTaxForm(!!saved.taxFormAcceptedAt);
  }, [saved.preference, saved.method, saved.details, saved.country, saved.mawthooqNumber, saved.taxFormAcceptedAt]);

  const saudi = country.toUpperCase() === 'SA';
  const countryValid = !country || /^[A-Za-z]{2}$/.test(country);
  const multiplier = affiliate.balanceMultiplier.toLocaleString('en-US');

  const placeholder =
    method === 'wise'
      ? t('tdw_partners_details_wise', 'Your Wise email or account number')
      : method === 'payoneer'
      ? t('tdw_partners_details_payoneer', 'Your Payoneer email')
      : t('tdw_partners_details_bank', 'IBAN, SWIFT/BIC and the account holder’s name');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await savePayout({
        preference,
        method,
        ...(details.trim() ? { details: details.trim() } : {}),
        ...(country ? { country: country.toUpperCase() } : {}),
        ...(saudi ? { mawthooqNumber: mawthooq.trim() } : {}),
        taxFormAccepted: taxForm,
      });
      toast.show(t('tdw_partners_payout_saved', 'Payout settings saved'));
      onSaved();
    } catch (err) {
      toast.show((err as Error).message, 'warning');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      title={t('tdw_partners_payout_title', 'How you get paid')}
      description={t(
        'tdw_partners_payout_desc',
        'Commission becomes available {{days}} days after each payment. Take it as Tadween balance, applied automatically and worth {{x}}×, or as cash once a month from {{min}}.',
        { days: affiliate.holdDays, x: multiplier, min: usd(affiliate.payoutMinimumCents) }
      )}
      action={
        saved.preference === 'CASH' ? (
          saved.cashReady ? (
            <Pill tone="ok" icon="check">
              {t('tdw_partners_cash_ready', 'Ready for cash payouts')}
            </Pill>
          ) : (
            <Pill tone="warn" icon="triangle-alert">
              {t('tdw_partners_cash_missing', 'Details missing')}
            </Pill>
          )
        ) : null
      }
    >
      <form className="tdw-partners-form" onSubmit={submit}>
        <RadioGroup<PartnerPayoutPreference>
          label={t('tdw_partners_payout_preference', 'Payout preference')}
          columns={2}
          value={preference}
          onChange={setPreference}
          options={[
            {
              value: 'BALANCE',
              icon: 'sparkles',
              label: t('tdw_partners_pref_balance', 'Tadween balance ({{x}}×)', { x: multiplier }),
              description: t(
                'tdw_partners_pref_balance_desc',
                'Every $1 of commission becomes ${{x}} off your own Tadween invoices, added automatically.',
                { x: multiplier }
              ),
            },
            {
              value: 'CASH',
              icon: 'credit-card',
              label: t('tdw_partners_pref_cash', 'Cash, monthly'),
              description: t(
                'tdw_partners_pref_cash_desc',
                'Wise, Payoneer or bank transfer around the 15th of each month, from {{min}} available.',
                { min: usd(affiliate.payoutMinimumCents) }
              ),
            },
          ]}
        />

        {preference === 'CASH' ? (
          <div className="tdw-partners-cash">
            <div className="tdw-partners-cash-grid">
              <Select<PartnerPayoutMethod>
                label={t('tdw_partners_method', 'Payout method')}
                value={method}
                onChange={setMethod}
                options={METHODS.map((m) => ({ value: m, label: methodLabel(m) }))}
              />
              <Input
                dir="ltr"
                maxLength={2}
                autoComplete="country"
                label={t('tdw_partners_country', 'Country')}
                hint={t('tdw_partners_country_hint', 'Two letters, e.g. EG, SA, AE')}
                error={countryValid ? undefined : t('tdw_partners_country_invalid', 'Use the two-letter country code')}
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              />
            </div>
            <Input
              dir="ltr"
              maxLength={300}
              autoComplete="off"
              label={t('tdw_partners_details', 'Payout details')}
              placeholder={placeholder}
              hint={
                saved.details
                  ? t('tdw_partners_details_saved', 'Saved: {{masked}}. Leave blank to keep it.', { masked: saved.details })
                  : t('tdw_partners_details_hint', 'Stored encrypted. Only the Tadween team sees it, when paying you.')
              }
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
            {saudi ? (
              <Input
                dir="ltr"
                maxLength={64}
                label={t('tdw_partners_mawthooq', 'Mawthooq licence number')}
                hint={t(
                  'tdw_partners_mawthooq_hint',
                  'Paid promotion by creators in Saudi Arabia needs a Mawthooq licence. Cash payouts there need its number.'
                )}
                value={mawthooq}
                onChange={(e) => setMawthooq(e.target.value)}
              />
            ) : null}
            <Checkbox
              checked={taxForm}
              onChange={setTaxForm}
              label={
                <>
                  {t(
                    'tdw_partners_w8ben',
                    'I’m not a US person and I confirm the details of the'
                  )}{' '}
                  <a href={W8BEN_URL} target="_blank" rel="noopener noreferrer" className="tdw-partners-link">
                    {t('tdw_partners_w8ben_link', 'W-8BEN (IRS)')}
                  </a>
                </>
              }
              description={t(
                'tdw_partners_w8ben_desc',
                'Needed before any cash payout. We may ask for the signed form.'
              )}
            />
          </div>
        ) : null}

        <div className="tdw-partners-form-foot">
          <Button type="submit" variant="primary" loading={saving} disabled={!countryValid}>
            {t('tdw_partners_save', 'Save payout settings')}
          </Button>
        </div>
      </form>
    </Section>
  );
};

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
    <Section
      title={t('tdw_partners_kit_title', 'Creator kit')}
      description={t('tdw_partners_kit_desc', 'Ask us for the kit: reply to your welcome email or contact support.')}
    >
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
    </Section>
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
    <Section title={t('tdw_partners_rules_title', 'Program rules')}>
      <ul className="tdw-partners-rules">
        {rules.map((r) => (
          <li key={r}>
            <Icon name="check" size={16} />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
export const PartnersPage: FC = () => {
  const t = useT();
  const methodLabel = useMethodLabel();
  const { data, error, isLoading, mutate } = usePartnerMe();

  if (isLoading) {
    return (
      <div className="tdw-partners-shell">
        <TadweenScope className="tdw-partners-page">
          <Skeleton height={32} width="40%" />
          <Skeleton height={240} />
          <Skeleton height={190} />
          <Skeleton height={220} />
        </TadweenScope>
      </div>
    );
  }

  // 404: the program is switched off; everyone but affiliates: invite-only
  if ((error && error.status === 404) || (data && (data.kind !== 'AFFILIATE' || !data.affiliate))) {
    return (
      <div className="tdw-partners-shell">
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

        <ReferralLinkCard code={data.code} friendCredits={data.friendCredits} trialDays={data.trialDays} />

        <PayoutSettings affiliate={affiliate} onSaved={() => mutate()} />

        <Section title={t('tdw_partners_history_title', 'Payout history')}>
          <div className="tdw-partners-scroll">
            <Table
              dense
              rowKey={(p) => p.id}
              rows={affiliate.payouts}
              empty={t('tdw_partners_history_empty', 'No payouts yet.')}
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
        </Section>

        <CreatorKit />
        <Rules affiliate={affiliate} />
      </TadweenScope>
    </div>
  );
};
