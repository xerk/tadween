'use client';

import { Fragment, useState, type ReactNode } from 'react';
import type { Dict } from '@/content/types';
import { SIGN_UP_URL } from '@/lib/config';
import { FEATURE_KEYS, type FeatureKey, type Pricing, type PlanView } from '@/lib/plans';
import { Accordion } from './Accordion';
import { Icon, cx } from './Icon';
import { Segmented } from './Segmented';

type Period = 'monthly' | 'yearly';

/** "{name}" in a template replaced with a node (an amount kept left-to-right in Arabic). */
const fill = (template: string, name: string, node: ReactNode) =>
  template.split(`{${name}}`).map((part, i) => (
    <Fragment key={i}>
      {i > 0 ? node : null}
      {part}
    </Fragment>
  ));

/** One row of the cards: a generated feature line every plan shows in the same place. */
interface Row {
  key: FeatureKey;
  /** The value per plan key: a number (-1 = unlimited), true = included without a number,
      undefined = the plan doesn't have it. */
  values: Record<string, number | true | undefined>;
  /** The plans differ on this row, so their values are emphasised. */
  differs: boolean;
}

/* Lines with a number stay in the cards, row for row, so the plans compare at a glance; lines
   without one that every plan has move to the "Every plan includes" strip. */
function splitRows(plans: PlanView[]) {
  const rows: Row[] = FEATURE_KEYS.flatMap((key) => {
    const values: Row['values'] = {};
    for (const plan of plans) {
      const item = plan.featureItems.find((f) => f.key === key);
      values[plan.key] = item ? (item.value ?? true) : undefined;
    }
    const all = Object.values(values);
    if (all.every((v) => v === undefined)) return [];
    return [{ key, values, differs: all.some((v) => v !== all[0]) }];
  });
  return {
    cardRows: rows.filter((r) => r.differs || Object.values(r.values).some((v) => typeof v === 'number')),
    shared: rows.filter((r) => !r.differs && Object.values(r.values).every((v) => v === true)).map((r) => r.key),
  };
}

/** The pricing cards: two plans side by side (the most popular one highlighted), monthly or
    yearly in US dollars, from Admin → Plans (lib/plans.ts). `compact` is the home page
    version: the cards and a link to the pricing page. */
export function PricingTable({
  p,
  numberLocale,
  pricing,
  compact = false,
  moreHref,
  agree,
}: {
  p: Dict['pricing'];
  numberLocale: string;
  pricing: Pricing;
  compact?: boolean;
  moreHref?: string;
  /** "By subscribing you agree to the Terms and the Refund Policy", with its links. */
  agree?: ReactNode;
}) {
  const { plans, yearlyDiscountPercent } = pricing;
  const [period, setPeriod] = useState<Period>('monthly');
  const yearly = period === 'yearly';
  const fmt = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 });
  // A yearly price a month, to the cent when it isn't whole ($182 a year → $15.17).
  const fmtCents = new Intl.NumberFormat(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const plural = new Intl.PluralRules(numberLocale);
  const days = (n: number) => (p.days[plural.select(n)] ?? p.days.other).replace('{n}', fmt.format(n));
  const usd = (n: number) => (
    <bdi dir="ltr" className="pz-usd">
      ${fmt.format(n)}
    </bdi>
  );
  const { cardRows, shared } = splitRows(plans);
  // Extra lines the admin added: on every plan → the strip, otherwise under that plan's rows.
  const sharedExtras = plans[0]?.extraFeatures.filter((f) => plans.every((plan) => plan.extraFeatures.includes(f))) ?? [];
  const describe = (plan: PlanView) => (plan.description ? p.descriptions[plan.description] ?? plan.description : null);
  const value = (v: number | true | undefined) =>
    v === undefined ? (
      <Icon name="minus" className="pz-no" label={p.notIncluded} />
    ) : v === true ? (
      <Icon name="check" className="pz-yes" label={p.included} />
    ) : v < 0 ? (
      p.unlimited
    ) : (
      fmt.format(v)
    );

  return (
    <div className={cx('pz-pricing', compact && 'is-compact')}>
      {plans.some((plan) => plan.usd.yearly > 0) ? (
        <div className="pz-pricing-toggle">
          <Segmented
            label={p.periodLabel}
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'monthly', label: p.monthly },
              {
                value: 'yearly',
                label: (
                  <>
                    {p.yearly}
                    {yearlyDiscountPercent > 0 ? <span className="pz-save">{p.save.replace('{pct}', fmt.format(yearlyDiscountPercent))}</span> : null}
                  </>
                ),
              },
            ]}
          />
        </div>
      ) : null}
      <div className={cx('pz-tiers', plans.length === 2 && 'is-pair')}>
        {plans.map((plan) => {
          // A plan without a yearly price stays monthly.
          const planYearly = yearly && plan.usd.yearly > 0;
          const perMonth = planYearly ? Math.round((plan.usd.yearly / 12) * 100) / 100 : plan.usd.monthly;
          const extras = plan.extraFeatures.filter((f) => !sharedExtras.includes(f));
          return (
            <section key={plan.key} className={cx('pz-tier', plan.popular && 'is-popular')} aria-labelledby={`tier-${plan.key}`}>
              <div className="pz-tier-head">
                <h3 id={`tier-${plan.key}`} className="pz-tier-name">
                  {plan.name}
                </h3>
                {plan.popular ? <span className="pz-tier-flag">{p.mostPopular}</span> : null}
              </div>
              <p className="pz-tier-for">{describe(plan)}</p>
              <div className="pz-tier-price">
                <span key={period} className="pz-tier-amount" dir="ltr">
                  <span className="pz-tier-cur">$</span>
                  {Number.isInteger(perMonth)
                    ? fmt.format(perMonth)
                    : fmtCents.formatToParts(perMonth).map((part, i) =>
                        part.type === 'decimal' || part.type === 'fraction' ? (
                          <span key={i} className="pz-tier-cents">
                            {part.value}
                          </span>
                        ) : (
                          part.value
                        )
                      )}
                </span>
                <span className="pz-tier-per">{p.perMonth}</span>
              </div>
              <p className="pz-tier-bill">{planYearly ? fill(p.billedYearly, 'amount', usd(plan.usd.yearly)) : p.billedMonthly}</p>
              <a className={cx('pz-btn pz-tier-cta', plan.popular ? 'pz-btn-primary' : 'pz-btn-secondary')} href={`${SIGN_UP_URL}?plan=${encodeURIComponent(plan.key)}`}>
                {plan.trialDays > 0 ? p.trial.replace('{days}', days(plan.trialDays)) : p.subscribe}
              </a>
              <dl className="pz-tier-rows">
                {cardRows.map((r) => (
                  <div key={r.key} className={cx('pz-tier-row', r.differs && 'is-diff')}>
                    <dt>{p.features[r.key]}</dt>
                    <dd>{value(r.values[plan.key])}</dd>
                  </div>
                ))}
              </dl>
              <ul className="pz-plan-list pz-tier-extras">
                {extras.map((f) => (
                  <li key={f}>
                    <Icon name="check" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {!compact && (shared.length || sharedExtras.length) ? (
        <section className="pz-includes" aria-labelledby="pricing-includes">
          <h3 id="pricing-includes" className="pz-includes-title">
            {p.includedTitle}
          </h3>
          <ul className="pz-includes-list">
            {shared.map((k) => (
              <li key={k}>
                <Icon name="check" />
                {p.features[k]}
              </li>
            ))}
            {sharedExtras.map((label) => (
              <li key={`x:${label}`}>
                <Icon name="check" />
                {label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="pz-pricing-foot">
        <ul className="pz-trust">
          {p.trust.map((x) => (
            <li key={x.label}>
              <Icon name={x.icon} size={14} />
              {x.label}
            </li>
          ))}
        </ul>
        {agree ? <p className="caption pz-muted pz-pricing-note">{agree}</p> : null}
        {compact && moreHref ? (
          <a className="pz-more-link" href={moreHref}>
            {p.seeAll}
            <Icon name="arrow-right" className="pz-flip-rtl" />
          </a>
        ) : null}
      </div>
      {!compact ? (
        <div className="pz-faq">
          <h3 className="title-2">{p.faqTitle}</h3>
          <Accordion items={p.faq} />
        </div>
      ) : null}
    </div>
  );
}
