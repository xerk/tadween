'use client';

// The paywall a workspace without a plan sees in place of the app: a calm,
// centred plan picker. Choosing a plan opens Stripe Embedded Checkout in a
// drawer; nothing talks to Stripe until then.
import React, { useCallback, useEffect, useState } from 'react';
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
import { Button, TadweenScope } from '@gitroom/frontend/components/tadween/ui';
import { BillingPeriod } from '@gitroom/frontend/components/tadween/billing/pricing';
import { PlansView } from '@gitroom/frontend/components/tadween/billing/plans.view';
import {
  CheckoutDrawer,
  waitForSubscription,
} from '@gitroom/frontend/components/tadween/billing/checkout.drawer';

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
  const [chosen, setChosen] = useState<PublicPlan | null>(null);
  const trial = !!user?.allowTrial;
  const fetch = useFetch();
  const toaster = useToaster();
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const { plans } = useTadweenPricing();
  const [skipping, setSkipping] = useState(false);
  // "Skip for now" tries the highlighted plan, without a card
  const trialPlan = plans.find((p) => p.mostPopular) || plans[0];
  // /billing?plan=TIER (from the upgrade paywall) opens that plan's checkout
  const preselect = useSearchParams().get('plan');
  useEffect(() => {
    const plan = plans.find((p) => p.tier === preselect);
    if (plan) {
      setChosen(plan);
    }
  }, [preselect, plans.length]);

  const skip = useCallback(async () => {
    if (!trialPlan) {
      return;
    }
    setSkipping(true);
    const res = await fetch('/billing/trial', {
      method: 'POST',
      body: JSON.stringify({ billing: trialPlan.tier, period: 'MONTHLY' }),
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
  }, [trialPlan]);

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
        </div>
      </header>
      <main className="tdw-billing-page">
        <PlansView
          title={t('tdw_paywall_title', 'Plan your LinkedIn week with Tadween')}
          lead={
            trial
              ? t(
                  'tdw_paywall_trial_lead',
                  'Start with a free trial on any plan. Both plans have every feature; they differ only in limits.'
                )
              : t(
                  'tdw_paywall_lead_plans',
                  'Both plans have every feature; they differ only in limits.'
                )
          }
          period={period}
          onPeriod={setPeriod}
          belowCards={
            trial && trialPlan && trialPlan.trialDays > 0 ? (
              <div className="tdw-skip">
                <span>
                  {t(
                    'tdw_skip_lead',
                    'Not ready to pay? Try {{name}} free for {{n}} days, no card needed.',
                    { name: trialPlan.name, n: trialPlan.trialDays }
                  )}
                </span>
                <Button variant="secondary" loading={skipping} onClick={skip}>
                  {t('tdw_skip_for_now', 'Skip for now')}
                </Button>
              </div>
            ) : null
          }
          cta={(plan) => (
            <Button
              variant={plan.mostPopular ? 'primary' : 'secondary'}
              size="lg"
              className="w-full"
              onClick={() => setChosen(plan)}
            >
              {trial && plan.trialDays > 0
                ? t('tdw_start_trial', 'Start {{n}}-day trial', {
                    n: plan.trialDays,
                  })
                : t('tdw_choose_plan_name', 'Choose {{name}}', {
                    name: plan.name,
                  })}
            </Button>
          )}
        />
        <section className="tdw-billing-faq">
          <h2 className="tdw-section-title">
            {t('tdw_questions', 'Questions')}
          </h2>
          <FAQComponent />
        </section>
      </main>
      <CheckoutDrawer
        plan={chosen}
        period={period}
        onClose={() => setChosen(null)}
      />
    </TadweenScope>
  );
};
