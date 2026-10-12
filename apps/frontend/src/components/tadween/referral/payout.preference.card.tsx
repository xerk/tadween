'use client';

// PayoutPreferenceCard: how an affiliate's commission is paid. The card shows
// the two choices (Tadween balance worth more, or cash once a month) with the
// current one marked, whether cash payouts are ready, and a button that opens
// the payout settings form in a side drawer. One PUT /partners/payout per
// save. Used on /partners. Styles: app/tadween/partners.scss.
import React, { FC, useEffect, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Button,
  Checkbox,
  cx,
  Drawer,
  Icon,
  Input,
  Pill,
  RadioGroup,
  Select,
} from '@gitroom/frontend/components/tadween/ui';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';
import {
  PartnerAffiliate,
  PartnerPayoutMethod,
  PartnerPayoutPreference,
  useSavePartnerPayout,
} from '@gitroom/frontend/components/tadween/referral/partners.api';

const usd = (cents: number) => formatUsd(cents / 100);
const W8BEN_URL = 'https://www.irs.gov/forms-pubs/about-form-w-8-ben';
const METHODS: PartnerPayoutMethod[] = ['wise', 'payoneer', 'bank'];
const FORM_ID = 'tdw-partners-payout-form';

export const useMethodLabel = () => {
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

// ── The form (inside the drawer) ────────────────────────────────────────────
const PayoutSettingsForm: FC<{
  affiliate: PartnerAffiliate;
  onSaving: (saving: boolean) => void;
  onValid: (valid: boolean) => void;
  onSaved: () => void;
}> = ({ affiliate, onSaving, onValid, onSaved }) => {
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
  useEffect(() => onValid(countryValid), [countryValid]);

  const placeholder =
    method === 'wise'
      ? t('tdw_partners_details_wise', 'Your Wise email or account number')
      : method === 'payoneer'
      ? t('tdw_partners_details_payoneer', 'Your Payoneer email')
      : t('tdw_partners_details_bank', 'IBAN, SWIFT/BIC and the account holder’s name');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSaving(true);
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
      onSaving(false);
    }
  };

  return (
    <form id={FORM_ID} className="tdw-partners-form" onSubmit={submit}>
      <RadioGroup<PartnerPayoutPreference>
        label={t('tdw_partners_payout_preference', 'Payout preference')}
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
                {t('tdw_partners_w8ben', 'I’m not a US person and I confirm the details of the')}{' '}
                <a href={W8BEN_URL} target="_blank" rel="noopener noreferrer" className="tdw-partners-link">
                  {t('tdw_partners_w8ben_link', 'W-8BEN (IRS)')}
                </a>
              </>
            }
            description={t('tdw_partners_w8ben_desc', 'Needed before any cash payout. We may ask for the signed form.')}
          />
        </div>
      ) : null}
    </form>
  );
};

// ── The card ────────────────────────────────────────────────────────────────
export const PayoutPreferenceCard: FC<{
  affiliate: PartnerAffiliate;
  onSaved: () => void;
  className?: string;
}> = ({ affiliate, onSaved, className }) => {
  const t = useT();
  const methodLabel = useMethodLabel();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [valid, setValid] = useState(true);
  const saved = affiliate.payout;
  const multiplier = affiliate.balanceMultiplier.toLocaleString('en-US');

  const options = [
    {
      key: 'BALANCE' as const,
      icon: 'sparkles',
      title: t('tdw_partners_pref_balance', 'Tadween balance ({{x}}×)', { x: multiplier }),
      body: t('tdw_partners_pref_balance_short', '$1 of commission = ${{x}} off your Tadween invoices, applied automatically.', {
        x: multiplier,
      }),
    },
    {
      key: 'CASH' as const,
      icon: 'credit-card',
      title: t('tdw_partners_pref_cash', 'Cash, monthly'),
      body:
        saved.preference === 'CASH' && saved.method
          ? t('tdw_partners_pref_cash_saved', '{{method}} around the 15th, from {{min}} available. {{details}}', {
              method: methodLabel(saved.method),
              min: usd(affiliate.payoutMinimumCents),
              details: saved.details || '',
            }).trim()
          : t('tdw_partners_pref_cash_short', 'Wise, Payoneer or bank transfer around the 15th, from {{min}} available.', {
              min: usd(affiliate.payoutMinimumCents),
            }),
    },
  ];

  return (
    <section className={cx('tdw-partners-card tdw-partners-pref', className)} aria-labelledby="tdw-partners-pref-title">
      <header className="tdw-partners-card-head">
        <h3 id="tdw-partners-pref-title" className="tdw-partners-card-title">
          {t('tdw_partners_payout_title', 'How you get paid')}
        </h3>
        {saved.preference === 'CASH' ? (
          saved.cashReady ? (
            <Pill tone="ok" icon="check">
              {t('tdw_partners_cash_ready', 'Ready for cash payouts')}
            </Pill>
          ) : (
            <Pill tone="warn" icon="triangle-alert">
              {t('tdw_partners_cash_missing', 'Details missing')}
            </Pill>
          )
        ) : null}
      </header>
      <ul className="tdw-partners-pref-list">
        {options.map((o) => {
          const current = saved.preference === o.key;
          return (
            <li key={o.key} className={cx('tdw-partners-pref-option', current && 'is-current')}>
              <span className="tdw-partners-pref-icon" aria-hidden="true">
                <Icon name={o.icon} size={16} />
              </span>
              <span className="min-w-0">
                <span className="tdw-partners-pref-title">
                  {o.title}
                  {current ? (
                    <span className="tdw-partners-pref-current">{t('tdw_partners_pref_current', 'Current')}</span>
                  ) : null}
                </span>
                <span className="tdw-partners-pref-body">{o.body}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="tdw-partners-pref-hold">
        {t('tdw_partners_pref_hold', 'Commission becomes available {{days}} days after each payment.', {
          days: affiliate.holdDays,
        })}
      </p>
      <Button icon="settings" onClick={() => setOpen(true)} className="tdw-partners-pref-btn">
        {t('tdw_partners_payout_change', 'Change payout settings')}
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={t('tdw_partners_payout_title', 'How you get paid')}
        description={t(
          'tdw_partners_payout_desc',
          'Commission becomes available {{days}} days after each payment. Take it as Tadween balance, applied automatically and worth {{x}}×, or as cash once a month from {{min}}.',
          { days: affiliate.holdDays, x: multiplier, min: usd(affiliate.payoutMinimumCents) }
        )}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('tdw_partners_cancel', 'Cancel')}
            </Button>
            <Button type="submit" form={FORM_ID} variant="primary" loading={saving} disabled={!valid}>
              {t('tdw_partners_save', 'Save payout settings')}
            </Button>
          </>
        }
      >
        <PayoutSettingsForm
          affiliate={affiliate}
          onSaving={setSaving}
          onValid={setValid}
          onSaved={() => {
            onSaved();
            setOpen(false);
          }}
        />
      </Drawer>
    </section>
  );
};
