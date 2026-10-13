'use client';

// The plan step: what a workspace without a plan sees, as the last step of
// onboarding (or alone, in the same shell, when it needs a plan later). Like
// Postiz's first billing screen, each plan has one action: pick it, start the
// free trial with a card in Stripe (Payment Element with Link, then Confirm),
// Stripe charges the card when the trial ends. While the workspace can still
// start a trial, a quiet "Maybe later" starts it without a card instead. Once
// the trial has ended there is no way around a plan.
import React, { FC, useCallback, useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useTadweenPricing } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { Button, Skeleton } from '@gitroom/frontend/components/tadween/ui';
import {
  BillingPeriod,
  PeriodToggle,
} from '@gitroom/frontend/components/tadween/billing/pricing';
import { PlanCard } from '@gitroom/frontend/components/tadween/billing/plans.view';
import {
  CheckoutPanel,
  OrderSummary,
  waitForSubscription,
} from '@gitroom/frontend/components/tadween/billing/checkout.panel';

// What each card compares at a glance; the chosen plan's full list is in the
// summary next to the payment form
const CARD_ROWS = ['channels', 'posts', 'team', 'ai_images'];

export const FirstBillingComponent: FC<{ onDone: () => void }> = ({
  onDone,
}) => {
  const user = useUser();
  const t = useT();
  const { i18n } = useTranslation();
  const fetch = useFetch();
  const toaster = useToaster();
  const { mutate } = useSWRConfig();
  const { plans } = useTadweenPricing();
  const [period, setPeriod] = useState<BillingPeriod>('MONTHLY');
  // /billing?plan=TIER (from the upgrade paywall) opens that plan's payment
  const preselect = useSearchParams().get('plan');
  const [chosen, setChosen] = useState<string | null>(preselect);
  // From the moment Stripe confirmed the payment, the choice stays as paid
  const [locked, setLocked] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const trial = !!user?.allowTrial;
  const plan = plans.find((p) => p.tier === chosen);
  const featured = plans.find((p) => p.mostPopular) || plans[0];
  const trialDays = trial ? featured?.trialDays || 0 : 0;
  const back = i18n.dir() === 'rtl' ? 'arrow-right' : 'arrow-left';

  // Choosing a plan (or going back to all plans) starts at the top: on a
  // phone the cards are a long column
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [chosen]);

  // "Maybe later": the trial without a card, on the highlighted plan
  const skip = useCallback(async () => {
    if (!featured) {
      return;
    }
    setSkipping(true);
    const res = await fetch('/billing/trial', {
      method: 'POST',
      body: JSON.stringify({ billing: featured.tier, period: 'MONTHLY' }),
    });
    const data = res.ok ? await res.json() : {};
    const result = data.check
      ? await waitForSubscription(fetch, data.check)
      : 'failed';
    if (result === 'failed') {
      setSkipping(false);
      toaster.show(
        data.blocked
          ? t(
              'billing_other_account_subscribed',
              'Another account with this email already has an active subscription. Please log off and sign in to that account to manage your subscription.'
            )
          : t(
              'tdw_trial_not_started',
              'We couldn’t start your trial. Please try again.'
            ),
        'warning'
      );
      return;
    }
    await mutate('/user/self');
    onDone();
  }, [featured, onDone]);

  if (!plans.length) {
    return (
      <div className="tdw-plan-step" aria-busy="true">
        <Skeleton height={40} width="50%" radius={8} />
        <div className="tdw-plan-row">
          <Skeleton height={360} radius={20} />
          <Skeleton height={360} radius={20} />
          <Skeleton height={360} radius={20} />
        </div>
      </div>
    );
  }

  // Step two: the chosen plan next to Stripe's payment form
  if (plan) {
    return (
      <div className="tdw-plan-step is-pay">
        <div className="tdw-plan-pay">
          <div className="tdw-plan-pay-side">
            <Button
              variant="ghost"
              size="sm"
              icon={back}
              disabled={locked}
              onClick={() => setChosen(null)}
            >
              {t('tdw_all_plans', 'All plans')}
            </Button>
            <OrderSummary
              plan={plan}
              period={period}
              trialDays={trial ? plan.trialDays : 0}
            />
          </div>
          <CheckoutPanel
            plan={plan}
            period={period}
            onLock={setLocked}
            onDone={onDone}
          />
        </div>
      </div>
    );
  }

  // Step one: the plans side by side, one action each
  return (
    <div className="tdw-plan-step">
      <div className="tdw-plan-step-head">
        <div className="tdw-ob-headline">
          <h1 className="title-1">
            {t('tdw_plan_step_title', 'Choose your plan')}
          </h1>
          <p className="pz-ob-lead">
            {trial
              ? t(
                  'tdw_plan_step_lead_trial',
                  'Every plan starts with a {{n}}-day free trial. You’re charged when it ends, and you can cancel any time before.',
                  { n: trialDays }
                )
              : t(
                  'tdw_plan_step_lead',
                  'Pick the plan for your workspace. You can change or cancel it any time in Settings → Billing.'
                )}
          </p>
        </div>
        <PeriodToggle
          value={period}
          onChange={setPeriod}
          save={plans[0]?.yearlyDiscountPercent ?? 0}
        />
      </div>
      <div className="tdw-plan-row" data-count={plans.length}>
        {plans.map((p) => (
          <PlanCard
            key={p.key}
            plan={p}
            period={period}
            rows={CARD_ROWS}
            cta={
              <Button
                variant={p.mostPopular ? 'primary' : 'secondary'}
                disabled={skipping}
                onClick={() => setChosen(p.tier)}
              >
                {trial && p.trialDays > 0
                  ? t('tdw_start_free_trial', 'Start {{n}}-day free trial', {
                      n: p.trialDays,
                    })
                  : t('tdw_choose_plan_name', 'Choose {{name}}', {
                      name: p.name,
                    })}
              </Button>
            }
          />
        ))}
      </div>
      {trialDays > 0 ? (
        <div className="tdw-plan-later">
          <Button variant="ghost" size="sm" loading={skipping} onClick={skip}>
            {t('tdw_paywall_later', 'Maybe later')}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
