'use client';

// Pricing pieces shared by the paywall and Billing: the Monthly/Yearly control
// with the yearly saving, the USD formatter and the check list.
import React, { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Icon, SegmentedControl } from '@gitroom/frontend/components/tadween/ui';

export type BillingPeriod = 'MONTHLY' | 'YEARLY';

export const formatUsd = (n: number) => {
  const r = Math.round(n * 100) / 100;
  const digits = Number.isInteger(r) ? 0 : 2;
  return `$${r.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};

export const PeriodToggle: FC<{
  value: BillingPeriod;
  onChange: (v: BillingPeriod) => void;
  save: number;
}> = ({ value, onChange, save }) => {
  const t = useT();
  return (
    <div className="pz-pricing-toggle">
      <SegmentedControl<BillingPeriod>
        label={t('tdw_billing_period', 'Billing period')}
        value={value}
        onChange={onChange}
        options={[
          { value: 'MONTHLY', label: t('tdw_monthly', 'Monthly') },
          { value: 'YEARLY', label: t('tdw_yearly', 'Yearly') },
        ]}
      />
      {save > 0 ? (
        <span className="pz-billtoggle-save caption">
          {t('tdw_save_percent', 'Save {{n}}%', { n: save })}
        </span>
      ) : null}
    </div>
  );
};

// Check list used inside tier cards and the paywall
export const CheckList: FC<{ items: string[] }> = ({ items }) => (
  <ul className="pz-plan-list">
    {items.map((f) => (
      <li key={f}>
        <Icon name="check" />
        {f}
      </li>
    ))}
  </ul>
);
