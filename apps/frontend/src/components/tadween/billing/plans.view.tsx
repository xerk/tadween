'use client';

// The plan pieces shared by the paywall (FREE workspaces), Billing and the
// admin plan preview: feature texts, the founder line, the plan card, the
// selectable plan cards of the one-page billing screen and what is true about
// paying. Plans and their generated feature lists come from GET
// /instance/settings.
import React, { FC, ReactNode, useId } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  PublicPlan,
  useTadweenPricing,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { cx, Icon } from '@gitroom/frontend/components/tadween/ui';
import {
  BillingPeriod,
  formatUsd,
  PeriodToggle,
} from '@gitroom/frontend/components/tadween/billing/pricing';

type FeatureItem = PublicPlan['featureItems'][number];

// Rows that carry a number differ between plans; the others are in every plan
const hasNumber = (item: FeatureItem) => item.value !== undefined;

export const usePlanFeatureText = () => {
  const t = useT();
  return (item: FeatureItem, fallback?: string) => {
    const n = item.value ?? 0;
    const unlimited = n < 0;
    switch (item.key) {
      case 'channels':
        return unlimited
          ? t('tdw_plan_feature_channels_unlimited', 'Unlimited channels')
          : t('tdw_plan_feature_channels', '{{n}} channels', { n });
      case 'posts':
        return unlimited
          ? t('tdw_plan_feature_posts_unlimited', 'Unlimited posts per month')
          : t('tdw_plan_feature_posts', '{{n}} posts per month', { n });
      case 'team':
        return unlimited
          ? t('tdw_plan_feature_team_unlimited', 'Unlimited team members')
          : t('tdw_plan_feature_team', '{{n}} team members', { n });
      case 'ai_writing':
        return t(
          'tdw_plan_feature_ai_writing',
          'AI auto-complete and copilots'
        );
      // Plan.aiCredits: credits for writing, the agent and images
      case 'ai_images':
        return unlimited
          ? t(
              'tdw_plan_feature_ai_credits_unlimited',
              'Unlimited AI credits per month'
            )
          : t('tdw_plan_feature_ai_credits', '{{n}} AI credits per month', {
              n,
            });
      case 'picture_editor':
        return t('tdw_plan_feature_picture_editor', 'Advanced picture editor');
      case 'autopost':
        return t('tdw_plan_feature_autopost', 'RSS auto-post');
      case 'public_api':
        return t(
          'tdw_plan_feature_public_api',
          'Public API, MCP and AI agents'
        );
      case 'webhooks':
        return unlimited
          ? t('tdw_plan_feature_webhooks_unlimited', 'Unlimited webhooks')
          : t('tdw_plan_feature_webhooks', '{{n}} webhooks', { n });
      default:
        return fallback || item.key;
    }
  };
};

// Shown on a plan card and in the checkout summary: the plan's own rows
export const PlanFeatureList: FC<{ plan: PublicPlan; all?: boolean }> = ({
  plan,
  all,
}) => {
  const text = usePlanFeatureText();
  const items = all ? plan.featureItems : plan.featureItems.filter(hasNumber);
  return (
    <ul className="tdw-plan-features">
      {items.map((item) => (
        <li key={item.key}>
          <Icon name="check" size={16} />
          <span>{text(item)}</span>
        </li>
      ))}
      {plan.extraFeatures.map((f) => (
        <li key={f}>
          <Icon name="check" size={16} />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
};

export const planPrice = (plan: PublicPlan, period: BillingPeriod) =>
  period === 'YEARLY' ? plan.yearlyPriceUsd / 12 : plan.monthlyPriceUsd;

// While checkout charges a plan's founder price: says so, that it stays while
// subscribed, and the regular price that applies after the offer closes. An
// honest future price, never a crossed-out "was" price.
export const FounderNote: FC<{
  plan: PublicPlan;
  period: BillingPeriod;
  compact?: boolean;
  // Inside a <label> (the plan cards) only phrasing content is allowed
  inline?: boolean;
}> = ({ plan, period, compact, inline }) => {
  const t = useT();
  const { founder } = useTadweenPricing();
  if (!plan.founderPrice || !founder?.open) {
    return null;
  }
  const yearly = period === 'YEARLY';
  const regular = t(
    yearly ? 'tdw_founder_regular_year' : 'tdw_founder_regular_month',
    yearly
      ? 'Regular {{amount}}/year after the first {{cap}} customers'
      : 'Regular {{amount}}/month after the first {{cap}} customers',
    {
      amount: formatUsd(
        yearly ? plan.listYearlyPriceUsd : plan.listMonthlyPriceUsd
      ),
      cap: founder.cap.toLocaleString('en-US'),
    }
  );
  const spots =
    founder.spotsLeft === 1
      ? t('tdw_founder_spot_left', '1 spot left')
      : t('tdw_founder_spots_left', '{{n}} spots left', {
          n: founder.spotsLeft.toLocaleString('en-US'),
        });
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag className={cx('tdw-founder', compact && 'is-compact')}>
      <span className="tdw-founder-tag">
        <Icon name="star" size={14} />
        {compact
          ? t('tdw_founder_price', 'Founder price')
          : t(
              'tdw_founder_price_locked',
              'Founder price · locked while you stay subscribed'
            )}
      </span>
      <span className="tdw-founder-regular">
        {regular} · {spots}
      </span>
    </Tag>
  );
};

export const PlanCard: FC<{
  plan: PublicPlan;
  period: BillingPeriod;
  rows: string[];
  current?: boolean;
  cta: ReactNode;
  note?: ReactNode;
}> = ({ plan, period, rows, current, cta, note }) => {
  const t = useT();
  const text = usePlanFeatureText();
  const yearlySaving = plan.monthlyPriceUsd * 12 - plan.yearlyPriceUsd;
  return (
    <section
      className={cx(
        'tdw-plan',
        plan.mostPopular && 'is-featured',
        current && 'is-current'
      )}
      aria-label={plan.name}
    >
      <div className="tdw-plan-top">
        <h3 className="tdw-plan-name">{plan.name}</h3>
        {current ? (
          <span className="tdw-plan-flag is-current">
            {t('tdw_your_plan', 'Your plan')}
          </span>
        ) : plan.mostPopular ? (
          <span className="tdw-plan-flag">
            {t('tdw_most_popular', 'Most popular')}
          </span>
        ) : null}
      </div>
      {plan.description ? (
        <p className="tdw-plan-for">{plan.description}</p>
      ) : null}
      <div className="tdw-plan-price">
        <span key={period} className="tdw-plan-amount">
          {formatUsd(planPrice(plan, period))}
        </span>
        <span className="tdw-plan-per">{t('tdw_per_month', '/ month')}</span>
      </div>
      <FounderNote plan={plan} period={period} />
      <p className="tdw-plan-bill">
        {period === 'YEARLY'
          ? yearlySaving > 0
            ? t(
                'tdw_billed_yearly_save',
                'Billed {{amount}} yearly · save {{save}}',
                {
                  amount: formatUsd(plan.yearlyPriceUsd),
                  save: formatUsd(yearlySaving),
                }
              )
            : t('tdw_billed_yearly', 'Billed {{amount}} yearly', {
                amount: formatUsd(plan.yearlyPriceUsd),
              })
          : t('tdw_billed_monthly', 'Billed monthly')}
      </p>
      <div className="tdw-plan-cta">{cta}</div>
      {note ? <div className="tdw-plan-note">{note}</div> : null}
      <ul className="tdw-plan-features">
        {rows.map((key) => {
          const item = plan.featureItems.find((i) => i.key === key);
          return item ? (
            <li key={key}>
              <Icon name="check" size={16} />
              <span>{text(item)}</span>
            </li>
          ) : (
            <li key={key} className="is-off">
              <Icon name="minus" size={16} />
              <span>{t('tdw_not_included', 'Not included')}</span>
            </li>
          );
        })}
        {plan.extraFeatures.map((f) => (
          <li key={f}>
            <Icon name="check" size={16} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

// Only claims that hold for this integration (Stripe Checkout, the Stripe
// customer portal, Adaptive Pricing)
export const TrustRow: FC = () => {
  const t = useT();
  const items: [string, string][] = [
    ['shield-check', t('tdw_trust_stripe', 'Secure payment by Stripe')],
    ['refresh-cw', t('tdw_trust_cancel', 'Cancel any time')],
    ['receipt', t('tdw_trust_invoices', 'Invoices in your billing portal')],
    [
      'globe',
      t('tdw_trust_currency', 'Pay in your local currency where available'),
    ],
  ];
  return (
    <ul className="tdw-trust">
      {items.map(([icon, label]) => (
        <li key={label}>
          <Icon name={icon} size={16} />
          {label}
        </li>
      ))}
    </ul>
  );
};

// The rows a plan card shows to compare plans at a glance; the chosen plan's
// full list sits in the summary under the cards
const PICK_ROWS = ['channels', 'team', 'ai_images'];

// One plan as a radio card (a native radio inside its label, like the kit's
// RadioGroup): choosing it updates the summary and the checkout (or the change
// panel) under the cards, on the same page
const PlanOption: FC<{
  plan: PublicPlan;
  period: BillingPeriod;
  name: string;
  checked: boolean;
  current: boolean;
  disabled?: boolean;
  onSelect: () => void;
}> = ({ plan, period, name, checked, current, disabled, onSelect }) => {
  const t = useT();
  const text = usePlanFeatureText();
  const priceId = useId();
  const yearlySaving = plan.monthlyPriceUsd * 12 - plan.yearlyPriceUsd;
  return (
    <label
      className={cx(
        'tdw-plan-pick',
        plan.mostPopular && 'is-featured',
        current && 'is-current',
        checked && 'is-on',
        disabled && 'is-disabled'
      )}
    >
      <input
        type="radio"
        className="pz-sr"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        aria-label={plan.name}
        aria-describedby={priceId}
      />
      <span className="tdw-plan-pick-top">
        <span className="tdw-plan-pick-radio" aria-hidden="true" />
        <span className="tdw-plan-pick-name">{plan.name}</span>
        {current ? (
          <span className="tdw-plan-flag is-current">
            {t('tdw_your_plan', 'Your plan')}
          </span>
        ) : plan.mostPopular ? (
          <span className="tdw-plan-flag">
            {t('tdw_most_popular', 'Most popular')}
          </span>
        ) : null}
      </span>
      {plan.description ? (
        <span className="tdw-plan-pick-for">{plan.description}</span>
      ) : null}
      <span id={priceId} className="tdw-plan-pick-price">
        <span key={period} className="tdw-plan-pick-amount">
          {formatUsd(planPrice(plan, period))}
        </span>
        <span className="tdw-plan-pick-per">{t('tdw_per_month', '/ month')}</span>
      </span>
      <span className="tdw-plan-pick-bill">
        {period === 'YEARLY'
          ? yearlySaving > 0
            ? t(
                'tdw_billed_yearly_save',
                'Billed {{amount}} yearly · save {{save}}',
                {
                  amount: formatUsd(plan.yearlyPriceUsd),
                  save: formatUsd(yearlySaving),
                }
              )
            : t('tdw_billed_yearly', 'Billed {{amount}} yearly', {
                amount: formatUsd(plan.yearlyPriceUsd),
              })
          : t('tdw_billed_monthly', 'Billed monthly')}
      </span>
      <FounderNote plan={plan} period={period} compact inline />
      <span className="tdw-plan-pick-rows">
        {PICK_ROWS.map((key) => {
          const item = plan.featureItems.find((i) => i.key === key);
          return item ? (
            <span key={key}>
              <Icon name="check" size={14} />
              {text(item)}
            </span>
          ) : null;
        })}
      </span>
    </label>
  );
};

// Billing's plan choice: the Monthly/Yearly control and one card per plan,
// side by side. Locked (payment being confirmed), neither can change.
export const PlanPicker: FC<{
  title: ReactNode;
  value: string;
  onChange: (tier: string) => void;
  period: BillingPeriod;
  onPeriod: (p: BillingPeriod) => void;
  // The live subscription's plan, marked "Your plan"
  currentTier?: string;
  disabled?: boolean;
}> = ({ title, value, onChange, period, onPeriod, currentTier, disabled }) => {
  const t = useT();
  const name = useId();
  const { plans } = useTadweenPricing();
  const discount = plans[0]?.yearlyDiscountPercent ?? 0;
  return (
    <section className="tdw-picker">
      <header className="tdw-picker-head">
        <h2 className="tdw-picker-title">{title}</h2>
        <div className="tdw-picker-period" inert={disabled || undefined}>
          <PeriodToggle value={period} onChange={onPeriod} save={discount} />
        </div>
      </header>
      <div
        className="tdw-picker-grid"
        role="radiogroup"
        aria-label={t('tdw_plan', 'Plan')}
        aria-disabled={disabled || undefined}
        data-count={plans.length}
      >
        {plans.map((plan) => (
          <PlanOption
            key={plan.key}
            plan={plan}
            period={period}
            name={name}
            checked={plan.tier === value}
            current={plan.tier === currentTier}
            disabled={disabled}
            onSelect={() => onChange(plan.tier)}
          />
        ))}
      </div>
    </section>
  );
};
