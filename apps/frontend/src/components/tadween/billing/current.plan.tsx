'use client';

// BillingScreen's top row: the current plan with its actions, and usage this
// period. Postiz has no per-user invoice data (its /billing/charges is
// super-admin only), so invoices stay behind the Stripe portal button.
import React, { FC, ReactNode, useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PricingInnerInterface } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import {
  Pill,
  Skeleton,
  UsageMeter,
} from '@gitroom/frontend/components/tadween/ui';
import {
  BillingPeriod,
  formatUsd,
  useTierMeta,
} from '@gitroom/frontend/components/tadween/billing/pricing';

const useChannelCount = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()).integrations || [];
  }, []);
  // Same key the launches screen uses, so the list is usually cached already
  const { data, isLoading } = useSWR('/integrations/list', load, {
    revalidateOnFocus: false,
  });
  return {
    loading: isLoading && !data,
    used: (data || []).filter((i: { disabled?: boolean }) => !i.disabled)
      .length as number,
  };
};

export const CurrentPlanCard: FC<{
  tier: string;
  values: PricingInnerInterface;
  period: BillingPeriod;
  trial?: boolean;
  cancelAt?: Date | string | null;
  actions: ReactNode;
}> = ({ tier, values, period, trial, cancelAt, actions }) => {
  const t = useT();
  const meta = useTierMeta();
  const channels = useChannelCount();
  const unlimited = (n: number) => n > 10000;
  const price =
    period === 'YEARLY'
      ? t('tdw_price_per_year', '{{amount}} / year', {
          amount: formatUsd(values.year_price),
        })
      : t('tdw_price_per_month', '{{amount}} / month', {
          amount: formatUsd(values.month_price),
        });
  return (
    <div className="pz-billing-grid">
      <section className="pz-bill-card">
        <div className="pz-bill-plan">
          <div>
            <span className="caption pz-muted">
              {t('tdw_current_plan', 'Current plan')}
            </span>
            <h3 className="title-2">
              {meta.name(tier)}
              {trial ? ` · ${t('tdw_trial', 'trial')}` : ''}
            </h3>
            <p className="pz-muted">
              {price}
              {cancelAt
                ? ` · ${t('tdw_ends_on', 'ends {{date}}', {
                    date: newDayjs(cancelAt).local().format('D MMM YYYY'),
                  })}`
                : ''}
            </p>
          </div>
          {cancelAt ? (
            <Pill tone="warn" icon="clock">
              {t('tdw_cancelling', 'Cancelling')}
            </Pill>
          ) : trial ? (
            <Pill tone="brand" icon="clock">
              {t('tdw_trial_pill', 'Trial')}
            </Pill>
          ) : (
            <Pill tone="ok" icon="check">
              {t('tdw_active', 'Active')}
            </Pill>
          )}
        </div>
        <div className="pz-bill-actions">{actions}</div>
      </section>
      <section className="pz-bill-card">
        <h3 className="headline">
          {t('tdw_usage_this_period', 'Usage this period')}
        </h3>
        {channels.loading ? (
          <div className="grid gap-[8px]">
            <Skeleton width="60%" />
            <Skeleton height={4} />
          </div>
        ) : (
          <UsageMeter
            label={t('tdw_channels', 'Channels')}
            used={channels.used}
            limit={values.channel || 0}
          />
        )}
        <ul className="pz-bill-limits">
          <li>
            <span>{t('tdw_cmp_posts', 'Posts per month')}</span>
            {unlimited(values.posts_per_month) ? (
              <span>{t('tdw_unlimited', 'Unlimited')}</span>
            ) : (
              <span className="time">{values.posts_per_month}</span>
            )}
          </li>
          <li>
            <span>{t('tdw_cmp_team', 'Team members')}</span>
            <span>
              {values.team_members
                ? t('tdw_unlimited', 'Unlimited')
                : t('tdw_just_you', 'Just you')}
            </span>
          </li>
          {values.image_generator ? (
            <li>
              <span>{t('tdw_cmp_images', 'AI images per month')}</span>
              <span className="time">{values.image_generation_count}</span>
            </li>
          ) : null}
          {values.generate_videos ? (
            <li>
              <span>{t('tdw_cmp_videos', 'AI videos per month')}</span>
              <span className="time">{values.generate_videos}</span>
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
};
