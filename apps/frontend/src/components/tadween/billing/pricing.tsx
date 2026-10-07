'use client';

// Pricing pieces from the design system's PricingTable: the period toggle
// with its saving, tier cards with the "Most popular" flag, the compare table
// with per-row help, and price helpers. Data comes from Postiz's pricing map
// with the /admin plans overlaid (useTadweenPricing); nothing here talks to
// the billing API.
import React, { FC, ReactNode, useMemo } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PricingInnerInterface } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { useTadweenPricing } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import {
  cx,
  Icon,
  SegmentedControl,
  Tooltip,
} from '@gitroom/frontend/components/tadween/ui';

export type BillingPeriod = 'MONTHLY' | 'YEARLY';

// Without admin plans, flag the middle paid tier like the design system does
const FALLBACK_POPULAR = 'PRO';

export const formatUsd = (n: number) => {
  const r = Math.round(n * 100) / 100;
  const digits = Number.isInteger(r) ? 0 : 2;
  return `$${r.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};

// Yearly prices are stored as the yearly total
export const monthlyEquivalent = (
  values: PricingInnerInterface,
  period: BillingPeriod
) => (period === 'YEARLY' ? values.year_price / 12 : values.month_price);

export const useTierMeta = () => {
  const t = useT();
  const { planFor, hasPlans, nameFor, pricing } = useTadweenPricing();
  return useMemo(() => {
    const fallback: Record<string, string> = {
      FREE: t('tdw_tier_for_free', 'For trying Tadween out'),
      STANDARD: t('tdw_tier_for_standard', 'For one voice on LinkedIn'),
      TEAM: t('tdw_tier_for_team', 'For brands with a small team'),
      PRO: t('tdw_tier_for_pro', 'For creators who post every week'),
      ULTIMATE: t('tdw_tier_for_ultimate', 'For agencies and many clients'),
    };
    const fallbackName: Record<string, string> = {
      FREE: t('tdw_tier_free', 'Free'),
      STANDARD: t('tdw_tier_standard', 'Standard'),
      TEAM: t('tdw_tier_team', 'Team'),
      PRO: t('tdw_tier_pro', 'Pro'),
      ULTIMATE: t('tdw_tier_ultimate', 'Ultimate'),
    };
    // Largest saving across the paid tiers, for the "Save N%" badge
    const save = Math.max(
      0,
      ...Object.values(pricing)
        .filter((v) => v.month_price > 0)
        .map((v) => Math.round((1 - v.year_price / (v.month_price * 12)) * 100))
    );
    return {
      name: (tier: string) => nameFor(tier, fallbackName[tier] || tier),
      description: (tier: string) =>
        planFor(tier)?.description || fallback[tier] || '',
      popular: (tier: string) =>
        hasPlans ? !!planFor(tier)?.mostPopular : tier === FALLBACK_POPULAR,
      trialDays: (tier: string) => planFor(tier)?.trialDays || 7,
      save,
    };
  }, [t, planFor, hasPlans, nameFor, pricing]);
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
          {t('tdw_save_yearly', 'Save {{n}}% yearly', { n: save })}
        </span>
      ) : null}
    </div>
  );
};

export const TierCard: FC<{
  tier: string;
  values: PricingInnerInterface;
  period: BillingPeriod;
  current?: boolean;
  cta: ReactNode;
  note?: ReactNode;
  features: ReactNode;
}> = ({ tier, values, period, current, cta, note, features }) => {
  const t = useT();
  const meta = useTierMeta();
  const popular = meta.popular(tier);
  const free = values.month_price === 0;
  return (
    <section
      className={cx(
        'pz-tier',
        popular && 'is-popular',
        current && !popular && 'is-current'
      )}
    >
      {popular ? (
        <span className="pz-tier-flag">
          <Icon name="star" size={12} />
          {t('tdw_most_popular', 'Most popular')}
        </span>
      ) : null}
      <h3 className="title-2 pz-tier-name">{meta.name(tier)}</h3>
      <p className="pz-tier-for">{meta.description(tier)}</p>
      <div className="pz-tier-price">
        <span key={period} className="metric pz-tier-amount">
          {formatUsd(monthlyEquivalent(values, period))}
        </span>
        <span className="pz-tier-per">{t('tdw_per_month', '/ month')}</span>
      </div>
      <p className="caption pz-muted pz-tier-bill">
        {free
          ? t('tdw_free_forever', 'Free')
          : period === 'YEARLY'
          ? t('tdw_billed_yearly', 'Billed {{amount}} yearly', {
              amount: formatUsd(values.year_price),
            })
          : t('tdw_billed_monthly', 'Billed monthly')}
      </p>
      <div className="pz-tier-ctas">{cta}</div>
      <div className="caption pz-tier-prorate">{note}</div>
      {features}
    </section>
  );
};

type Cell = boolean | string;

export const CompareTable: FC<{
  tiers: [string, PricingInnerInterface][];
  period: BillingPeriod;
}> = ({ tiers, period }) => {
  const t = useT();
  const meta = useTierMeta();
  const unlimited = (n: number) => (n >= 10000 ? '∞' : String(n));
  const rows: { label: string; help: string; cell: (v: PricingInnerInterface) => Cell }[] = [
    {
      label: t('tdw_cmp_channels', 'Channels'),
      help: t('tdw_cmp_channels_help', 'LinkedIn profiles, company pages and other accounts you can connect.'),
      cell: (v) => String(v.channel || 0),
    },
    {
      label: t('tdw_cmp_posts', 'Posts per month'),
      help: t('tdw_cmp_posts_help', 'Posts you can schedule each month.'),
      cell: (v) => unlimited(v.posts_per_month),
    },
    {
      label: t('tdw_cmp_team', 'Team members'),
      help: t('tdw_cmp_team_help', 'Invite people to draft, review and schedule with you.'),
      cell: (v) => v.team_members,
    },
    {
      label: t('tdw_cmp_ai', 'Smart writing'),
      help: t('tdw_cmp_ai_help', 'AI copilot and autocomplete inside the post editor.'),
      cell: (v) => v.ai,
    },
    {
      label: t('tdw_cmp_images', 'AI images per month'),
      help: t('tdw_cmp_images_help', 'Images generated for your posts each month.'),
      cell: (v) => (v.image_generator ? String(v.image_generation_count) : false),
    },
    {
      label: t('tdw_cmp_videos', 'AI videos per month'),
      help: t('tdw_cmp_videos_help', 'Short videos generated for your posts each month.'),
      cell: (v) => (v.generate_videos ? String(v.generate_videos) : false),
    },
    {
      label: t('tdw_cmp_api', 'Agents, MCP and API'),
      help: t('tdw_cmp_api_help', 'Schedule from Claude, ChatGPT, Cursor or your own tools.'),
      cell: (v) => v.public_api,
    },
    {
      label: t('tdw_cmp_webhooks', 'Webhooks'),
      help: t('tdw_cmp_webhooks_help', 'Notify your own systems when posts publish.'),
      cell: (v) => (v.webhooks ? unlimited(v.webhooks) : false),
    },
    {
      label: t('tdw_cmp_autopost', 'RSS auto-post'),
      help: t('tdw_cmp_autopost_help', 'Turn a feed into scheduled posts automatically.'),
      cell: (v) => v.autoPost,
    },
    {
      label: t('tdw_cmp_import', 'Import from channels'),
      help: t('tdw_cmp_import_help', 'Bring in posts you already published.'),
      cell: (v) => v.import_from_channels,
    },
  ];
  return (
    <div className="pz-compare">
      <h3 className="title-2">{t('tdw_compare_plans', 'Compare plans')}</h3>
      <div className="pz-compare-wrap">
        <table className="pz-compare-table">
          <thead>
            <tr>
              <th>
                <span className="pz-sr">{t('tdw_feature', 'Feature')}</span>
              </th>
              {tiers.map(([tier, v]) => (
                <th key={tier} className={cx(meta.popular(tier) && 'is-popular')}>
                  {meta.name(tier)}
                  <span className="caption pz-muted">
                    {formatUsd(monthlyEquivalent(v, period))}
                    {t('tdw_per_mo', '/mo')}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">
                  <span className="pz-compare-label">
                    {r.label}
                    <Tooltip label={r.help}>
                      <span className="pz-compare-help" tabIndex={0} aria-label={r.help}>
                        <Icon name="circle-help" size={14} />
                      </span>
                    </Tooltip>
                  </span>
                </th>
                {tiers.map(([tier, v]) => {
                  const c = r.cell(v);
                  return (
                    <td key={tier} className={cx(meta.popular(tier) && 'is-popular')}>
                      {c === true ? (
                        <Icon name="check" className="pz-yes" label={t('tdw_included', 'Included')} />
                      ) : c === false || c === '0' ? (
                        <Icon name="minus" className="pz-no" label={t('tdw_not_included', 'Not included')} />
                      ) : (
                        <span className="time">{c}</span>
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
