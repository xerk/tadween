'use client';

import { useState } from 'react';
import type { Dict } from '@/content/types';
import { SIGN_UP_URL } from '@/lib/config';
import { TIER_LIMITS, type PlanView } from '@/lib/plans';
import type { CompareRow } from '@/content/types';
import { Accordion } from './Accordion';
import { Icon, cx } from './Icon';

type Period = 'monthly' | 'yearly';
type Currency = 'EGP' | 'USD';

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="pz-seg" role="group" aria-label={label} style={{ ['--n' as string]: options.length, ['--i' as string]: i }}>
      <span className="pz-seg-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" className="pz-seg-item" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** PricingTable from the design system: tiers with a Most popular flag, monthly or
    yearly, EGP or USD, the compare table and the FAQ. Every price is a placeholder. */
export function PricingTable({
  p,
  lang,
  numberLocale,
  plans,
  source,
  compare = true,
  faq = true,
  compareHref,
}: {
  p: Dict['pricing'];
  lang: Dict['lang'];
  numberLocale: string;
  plans: PlanView[];
  source: 'api' | 'static';
  compare?: boolean;
  faq?: boolean;
  compareHref?: string;
}) {
  const [period, setPeriod] = useState<Period>('monthly');
  const [currency, setCurrency] = useState<Currency>('EGP');
  const fmt = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 2 });
  const yearly = period === 'yearly';

  const priceOf = (plan: PlanView) => {
    const c = currency === 'EGP' && plan.egp ? 'EGP' : 'USD';
    const prices = c === 'EGP' ? plan.egp! : plan.usd;
    const perMonth = yearly ? prices.yearly / 12 : prices.monthly;
    return { cur: p.currencies[c], perMonth: fmt.format(Math.round(perMonth * 100) / 100), total: fmt.format(prices.yearly) };
  };
  // -1 means unlimited, 0 means not included; anything else is a number.
  const count = (n: number) => (n < 0 ? p.unlimited : n === 0 ? false : fmt.format(n));
  /** A compare cell: read from the plan for rows that name a field (so plans edited in the
      app show here), from the row's own values otherwise. */
  const cell = (r: CompareRow, plan: PlanView) => {
    switch (r.field) {
      case 'channels':
        return fmt.format(plan.channels);
      case 'teamMembers':
        return count(plan.teamMembers);
      case 'aiCredits':
        return count(plan.aiCredits);
      case 'webhooks':
        return count(TIER_LIMITS[plan.tier].webhooks);
      case 'autoPost':
        return TIER_LIMITS[plan.tier].autoPost;
      default:
        return r.values?.[plan.key];
    }
  };
  const copyOf = (plan: PlanView) => {
    const c = p.plans.find((x) => x.key === plan.key);
    // Translated copy for the known plans; plans added in the app show their own text.
    if (c && (lang === 'ar' || !plan.features?.length)) return c;
    return { key: plan.key, name: plan.name ?? c?.name ?? plan.key, for: plan.description ?? c?.for ?? '', features: plan.features?.length ? plan.features : c?.features ?? [] };
  };

  return (
    <div className="pz-pricing">
      <div className="pz-pricing-toggle">
        <Segmented label={p.periodLabel} value={period} onChange={setPeriod} options={[{ value: 'monthly', label: p.monthly }, { value: 'yearly', label: p.yearly }]} />
        <Segmented label={p.currencyLabel} value={currency} onChange={setCurrency} options={[{ value: 'EGP', label: p.currencies.EGP }, { value: 'USD', label: p.currencies.USD }]} />
        <span className="pz-billtoggle-save caption">{p.save}</span>
        <span className="pz-placeholder caption">{p.placeholder}</span>
      </div>
      <div className="pz-tiers">
        {plans.map((plan) => {
          const c = copyOf(plan);
          const price = priceOf(plan);
          return (
            <section key={plan.key} className={cx('pz-tier', plan.popular && 'is-popular')} aria-labelledby={`tier-${plan.key}`}>
              {plan.popular ? (
                <span className="pz-tier-flag">
                  <Icon name="star" size={12} />
                  {p.mostPopular}
                </span>
              ) : null}
              <h3 id={`tier-${plan.key}`} className="title-2 pz-tier-name">
                {c.name}
              </h3>
              <p className="pz-tier-for">{c.for}</p>
              <div className="pz-tier-price">
                <span className="pz-tier-cur caption">{price.cur}</span>
                <span key={`${period}-${currency}`} className="metric pz-tier-amount">
                  {price.perMonth}
                </span>
                <span className="pz-tier-per">{p.perMonth}</span>
              </div>
              <p className="caption pz-muted pz-tier-bill">{yearly ? p.billedYearly.replace('{amount}', `${price.cur} ${price.total}`) : p.billedMonthly}</p>
              <a className={cx('pz-btn pz-tier-cta', plan.popular ? 'pz-btn-primary' : 'pz-btn-secondary')} href={`${SIGN_UP_URL}?plan=${encodeURIComponent(plan.key)}`}>
                {p.trial}
              </a>
              <ul className="pz-plan-list">
                {c.features.map((f) => (
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
      <p className="caption pz-muted pz-pricing-note">{source === 'api' ? p.noteApi : p.note}</p>
      {compare ? (
        <div className="pz-compare">
          <h3 className="title-2">{p.compareTitle}</h3>
          <div className="pz-compare-scroll" role="region" aria-label={p.compareTitle} tabIndex={0}>
            <table className="pz-compare-table">
              <thead>
                <tr>
                  <td />
                  {plans.map((plan) => {
                    const price = priceOf(plan);
                    return (
                      <th key={plan.key} scope="col" className={cx(plan.popular && 'is-popular')}>
                        {copyOf(plan).name}
                        <span className="caption pz-muted">
                          {price.cur} {price.perMonth}
                          {p.perMonthShort}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {p.compare.map((r) => (
                  <tr key={r.label}>
                    <th scope="row">
                      <span className="pz-compare-label">
                        {r.label}
                        <span className="pz-tip-wrap">
                          <span className="pz-compare-help" tabIndex={0} aria-label={r.help}>
                            <Icon name="circle-help" size={14} />
                          </span>
                          <span role="tooltip" className="pz-tip">
                            {r.help}
                          </span>
                        </span>
                      </span>
                    </th>
                    {plans.map((plan) => {
                      const v = cell(r, plan);
                      return (
                        <td key={plan.key} className={cx(plan.popular && 'is-popular')}>
                          {v === true ? (
                            <Icon name="check" className="pz-yes" label={p.included} />
                          ) : v === false ? (
                            <Icon name="minus" className="pz-no" label={p.notIncluded} />
                          ) : v === undefined ? (
                            <span className="pz-muted" aria-label={p.notListed}>
                              –
                            </span>
                          ) : (
                            <span className="time">{v}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : compareHref ? (
        <a className="pz-more-link" href={compareHref}>
          {p.compareLink}
          <Icon name="arrow-right" className="pz-flip-rtl" />
        </a>
      ) : null}
      {faq ? (
        <div className="pz-faq">
          <h3 className="title-2">{p.faqTitle}</h3>
          <Accordion items={p.faq} />
        </div>
      ) : null}
    </div>
  );
}
