'use client';

// The paywall a workspace without a plan sees in place of the app, as one
// page (Postiz's first-billing layout): the plans side by side, and under
// them the chosen plan's summary next to Stripe Embedded Checkout. Choosing
// another plan or period updates both in place. While the workspace can still
// start a trial, the paywall can be escaped: the × in the top bar, "Maybe
// later" under the title and "Skip for now" all start the card-less trial of
// the chosen plan and open the app (or the next onboarding step). Without a
// trial left (it ended without a plan) the paywall stays.
import React, { useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import dynamic from 'next/dynamic';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import {
  PublicPlan,
  useTadweenPricing,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';
import {
  Button,
  IconButton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import {
  BillingPeriod,
  formatUsd,
} from '@gitroom/frontend/components/tadween/billing/pricing';
import {
  PlanPicker,
  planPrice,
  TrustRow,
} from '@gitroom/frontend/components/tadween/billing/plans.view';
import {
  CheckoutPanel,
  OrderSummary,
  PayBar,
  scrollToCheckout,
  waitForSubscription,
} from '@gitroom/frontend/components/tadween/billing/checkout.panel';

const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

export const FirstBillingComponent = () => {
  const user = useUser();
  const t = useT();
  const [period, setPeriod] = useState<BillingPeriod>('MONTHLY');
  const trial = !!user?.allowTrial;
  const fetch = useFetch();
  const toaster = useToaster();
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const { plans } = useTadweenPricing();
  const [skipping, setSkipping] = useState(false);
  // From the moment Stripe reports the payment, the choice stays as paid
  const [locked, setLocked] = useState(false);
  // /billing?plan=TIER (from the upgrade paywall) starts on that plan, else
  // the highlighted one
  const preselect = useSearchParams().get('plan');
  const [tier, setTier] = useState(preselect || '');
  const plan =
    plans.find((p) => p.tier === tier) ||
    plans.find((p) => p.mostPopular) ||
    plans[0];
  const trialDays = trial && plan ? plan.trialDays : 0;
  const canEscape = trialDays > 0 && !locked;

  const skip = useCallback(async () => {
    if (!plan) {
      return;
    }
    setSkipping(true);
    const res = await fetch('/billing/trial', {
      method: 'POST',
      body: JSON.stringify({ billing: plan.tier, period: 'MONTHLY' }),
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
    router.push('/launches');
  }, [plan]);

  return (
    <TadweenScope className="blurMe tdw-paywall">
      <header className="tdw-paywall-top">
        <LogoTextComponent />
        <span className="grow" />
        <div className="tdw-paywall-tools">
          <OrganizationSelector />
          <div className="hover:text-newTextColor">
            <ModeComponent />
          </div>
          <span className="sep" />
          <LanguageComponent />
          <span className="sep" />
          <div className="hover:text-newTextColor">
            <LogoutComponent isIcon={true} />
          </div>
          {canEscape ? (
            <>
              <span className="sep" />
              <IconButton
                icon="x"
                label={t('tdw_paywall_later', 'Maybe later')}
                disabled={skipping}
                onClick={skip}
              />
            </>
          ) : null}
        </div>
      </header>
      <main className="tdw-billing-page is-paywall">
        <header className="tdw-plans-head">
          <h1 className="tdw-plans-title">
            {t('tdw_paywall_title', 'Plan your LinkedIn week with Tadween')}
          </h1>
          <p className="tdw-plans-lead">
            {trial
              ? t(
                  'tdw_paywall_trial_lead',
                  'Start with a free trial on any plan. Plans differ in limits: channels, team members and AI credits.'
                )
              : t(
                  'tdw_paywall_lead_plans',
                  'Plans differ in limits: channels, team members and AI credits.'
                )}
          </p>
          {canEscape ? (
            <Button variant="ghost" loading={skipping} onClick={skip}>
              {t(
                'tdw_paywall_later_trial',
                'Maybe later, start my free {{n}}-day trial',
                { n: trialDays }
              )}
            </Button>
          ) : null}
        </header>
        {plan ? (
          <>
            <PlanPicker
              title={t('tdw_choose_a_plan', 'Choose a plan')}
              value={plan.tier}
              onChange={setTier}
              period={period}
              onPeriod={setPeriod}
              disabled={locked}
            />
            <div className="tdw-pay">
              <div className="tdw-pay-main">
                <OrderSummary
                  plan={plan}
                  period={period}
                  trialDays={trialDays}
                />
                {canEscape ? (
                  <div className="tdw-skip">
                    <span>
                      {t(
                        'tdw_skip_lead',
                        'Not ready to pay? Try {{name}} free for {{n}} days, no card needed.',
                        { name: plan.name, n: trialDays }
                      )}
                    </span>
                    <Button
                      variant="secondary"
                      loading={skipping}
                      onClick={skip}
                    >
                      {t('tdw_skip_for_now', 'Skip for now')}
                    </Button>
                  </div>
                ) : null}
                <TrustRow />
              </div>
              <CheckoutPanel plan={plan} period={period} onLock={setLocked} />
            </div>
            {locked ? null : (
              <PayBar
                target="tdw-checkout"
                label={
                  <>
                    <strong>{plan.name}</strong> ·{' '}
                    {formatUsd(planPrice(plan, period))}
                    {t('tdw_per_month_short', '/month')}
                  </>
                }
                action={
                  <Button variant="primary" onClick={scrollToCheckout}>
                    {trialDays > 0
                      ? t('tdw_start_trial', 'Start {{n}}-day trial', {
                          n: trialDays,
                        })
                      : t('tdw_continue_to_payment', 'Continue to payment')}
                  </Button>
                }
              />
            )}
          </>
        ) : null}
        <section className="tdw-billing-faq">
          <h2 className="tdw-section-title">
            {t('tdw_questions', 'Questions')}
          </h2>
          <FAQComponent />
        </section>
      </main>
    </TadweenScope>
  );
};
