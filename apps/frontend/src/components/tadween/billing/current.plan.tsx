'use client';

// Billing's header card: the workspace's plan, its price and state, usage
// against the plan's limits (channels, team members) and the actions. AI
// credits have their own card (ai.credits.tsx). Invoices and the card live in
// the Stripe customer portal.
import React, { FC, ReactNode, useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { PublicPlan } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import {
  Pill,
  Skeleton,
  UsageMeter,
} from '@gitroom/frontend/components/tadween/ui';
import {
  BillingPeriod,
  formatUsd,
} from '@gitroom/frontend/components/tadween/billing/pricing';

const useJson = () => {
  const fetch = useFetch();
  return useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(path);
    }
    return res.json();
  }, []);
};

// Same key the launches screen uses, so the list is usually cached already
const useChannelsUsed = () => {
  const load = useJson();
  const { data } = useSWR('/integrations/list', load, {
    revalidateOnFocus: false,
  });
  return data
    ? ((data.integrations || []) as { disabled?: boolean }[]).filter(
        (i) => !i.disabled
      ).length
    : undefined;
};

// Only for plans with a team: without one the server refuses the list (402),
// which would open the upgrade paywall over Billing
const useTeamUsed = (enabled: boolean) => {
  const load = useJson();
  const { data } = useSWR(enabled ? '/settings/team' : null, load, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  return data
    ? ((data.users || []) as { role: string }[]).filter(
        (u) => u.role !== 'SUPERADMIN'
      ).length
    : undefined;
};

const Meter: FC<{ label: ReactNode; used?: number; limit: number }> = ({
  label,
  used,
  limit,
}) =>
  used === undefined ? (
    <div className="grid gap-[8px]">
      <Skeleton width="60%" />
      <Skeleton height={4} />
    </div>
  ) : (
    <UsageMeter label={label} used={used} limit={limit} />
  );

export const CurrentPlanCard: FC<{
  plan?: PublicPlan;
  period: BillingPeriod;
  trial?: boolean;
  // Stripe reported the last renewal as failed (past_due / unpaid)
  paymentFailed?: boolean;
  // What the subscription's Stripe price charges (a locked founder price
  // stays after the plan's price changes); else the plan's price
  priceCents?: number | null;
  cancelAt?: Date | string | null;
  actions: ReactNode;
}> = ({ plan, period, trial, paymentFailed, priceCents, cancelAt, actions }) => {
  const t = useT();
  const channels = useChannelsUsed();
  const team = useTeamUsed(!!plan && plan.teamMembers !== 0);
  const amount =
    typeof priceCents === 'number'
      ? priceCents / 100
      : period === 'YEARLY'
      ? plan?.yearlyPriceUsd
      : plan?.monthlyPriceUsd;
  const price =
    !plan || amount === undefined
      ? ''
      : period === 'YEARLY'
      ? t('tdw_price_per_year', '{{amount}} / year', {
          amount: formatUsd(amount),
        })
      : t('tdw_price_per_month', '{{amount}} / month', {
          amount: formatUsd(amount),
        });
  return (
    <section className="tdw-current">
      <div className="tdw-current-head">
        <div className="min-w-0">
          <span className="tdw-current-label">
            {t('tdw_current_plan', 'Current plan')}
          </span>
          <h2 className="tdw-current-name">
            {plan?.name || t('tdw_your_plan', 'Your plan')}
          </h2>
          <p className="tdw-current-price">
            {price}
            {cancelAt
              ? ` · ${t('tdw_ends_on', 'ends {{date}}', {
                  date: newDayjs(cancelAt).local().format('D MMM YYYY'),
                })}`
              : ''}
          </p>
        </div>
        {paymentFailed ? (
          <Pill tone="bad" icon="triangle-alert">
            {t('tdw_payment_failed', 'Payment failed')}
          </Pill>
        ) : cancelAt ? (
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
      {paymentFailed ? (
        <p className="tdw-current-failed" role="alert">
          {t(
            'tdw_payment_failed_bar',
            'Your last payment failed. Update your card to keep posting.'
          )}{' '}
          {t(
            'tdw_payment_failed_retry',
            'Stripe retries the card over the next days; everything keeps working until then.'
          )}
        </p>
      ) : null}
      {plan ? (
        <div className="tdw-current-usage">
          <Meter
            label={t('tdw_channels', 'Channels')}
            used={channels}
            limit={plan.channels}
          />
          {plan.teamMembers !== 0 ? (
            <Meter
              label={t('tdw_cmp_team', 'Team members')}
              used={team}
              limit={plan.teamMembers}
            />
          ) : null}
        </div>
      ) : null}
      <div className="tdw-current-actions">{actions}</div>
    </section>
  );
};
