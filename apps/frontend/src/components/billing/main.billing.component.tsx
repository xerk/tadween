'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Subscription } from '@prisma/client';
import { useDebouncedCallback } from 'use-debounce';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  PublicPlan,
  useTadweenPricing,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { useSWRConfig } from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
// Tadween: presentation from the design system; the logic below is Postiz's
import {
  Banner,
  Button,
  Icon,
  Spinner,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import {
  BillingPeriod,
  formatUsd,
  PeriodToggle,
} from '@gitroom/frontend/components/tadween/billing/pricing';
import { CurrentPlanCard } from '@gitroom/frontend/components/tadween/billing/current.plan';
import { isPaymentFailed } from '@gitroom/frontend/components/tadween/billing/trial.banner';
import {
  ChangePlanDialog,
  useBillingDialogs,
} from '@gitroom/frontend/components/tadween/billing/billing.dialogs';
import { PlansView } from '@gitroom/frontend/components/tadween/billing/plans.view';
import { CheckoutDrawer } from '@gitroom/frontend/components/tadween/billing/checkout.drawer';
import { useUtmUrl } from '@gitroom/helpers/utils/utm.saver';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { FinishTrial } from '@gitroom/frontend/components/billing/finish.trial';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';

type SubscriptionWithPlatform = Subscription & {
  platform?: 'web' | 'mobile';
};

export const Prorate: FC<{
  period: BillingPeriod;
  pack: string;
}> = (props) => {
  const { period, pack } = props;
  const t = useT();
  const fetch = useFetch();
  const [price, setPrice] = useState<number | false>(0);
  const [loading, setLoading] = useState(false);
  const calculatePrice = useDebouncedCallback(async () => {
    setLoading(true);
    setPrice(
      (
        await (
          await fetch('/billing/prorate', {
            method: 'POST',
            body: JSON.stringify({
              period,
              billing: pack,
            }),
          })
        ).json()
      ).price
    );
    setLoading(false);
  }, 500);
  useEffect(() => {
    setPrice(false);
    calculatePrice();
  }, [period, pack]);
  if (loading) {
    return (
      <>
        <Spinner size={14} label={t('tdw_calculating', 'Calculating')} />
        {t('tdw_calculating_pay_today', 'Calculating what you pay today…')}
      </>
    );
  }
  if (price === false) {
    return null;
  }
  return (
    <>
      {t('tdw_pay_today', 'Pay today')}{' '}
      <strong className="time">{formatUsd(price < 0 ? 0 : price)}</strong>
    </>
  );
};

export const MainBillingComponent: FC<{
  sub?: SubscriptionWithPlatform;
}> = (props) => {
  const { sub } = props;
  const { isGeneral } = useVariables();
  const { mutate } = useSWRConfig();
  const fetch = useFetch();
  const toast = useToaster();
  const user = useUser();
  const dub = useDubClickId();
  const dialogs = useBillingDialogs();
  const events = useFireEvents();
  const router = useRouter();
  const utm = useUtmUrl();
  const t = useT();
  const { plans, planFor } = useTadweenPricing();
  const queryParams = useSearchParams();
  const [finishTrial, setFinishTrial] = useState(
    !!queryParams.get('finishTrial')
  );

  const [subscription, setSubscription] = useState<
    SubscriptionWithPlatform | undefined
  >(sub);
  const [loading, setLoading] = useState<boolean>(false);
  const [period, setPeriod] = useState<BillingPeriod>(sub?.period || 'MONTHLY');
  const [changeTo, setChangeTo] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<PublicPlan | null>(null);
  useEffect(() => {
    setSubscription(sub);
    setPeriod(sub?.period || 'MONTHLY');
  }, [sub]);
  // /billing?plan=TIER (from the upgrade paywall) starts on that plan
  const preselect = queryParams.get('plan');
  useEffect(() => {
    const plan = plans.find((p) => p.tier === preselect);
    if (!plan || plan.tier === sub?.subscriptionTier) {
      return;
    }
    if (sub) {
      setChangeTo(plan.tier);
    } else {
      setCheckout(plan);
    }
  }, [preselect, plans.length]);

  // Card, invoices and receipts live in the Stripe customer portal
  const openPortal = useCallback(async () => {
    // Open the tab now (still inside the click) so it isn't blocked as a popup
    const tab = window.open('', '_blank');
    const { portal } = await (await fetch('/billing/portal')).json();
    if (portal && tab) {
      tab.location.href = portal;
    } else {
      tab?.close();
    }
  }, []);

  // In-app cancel (with reason and retention offer) and resume, both Postiz's
  const toggleCancel = useCallback(
    async (resume: boolean) => {
      let feedback = '';
      if (!resume) {
        const current = planFor(subscription?.subscriptionTier || '');
        if (
          !(await dialogs.confirm({
            title: t('tdw_cancel_subscription_q', 'Cancel your subscription?'),
            description: t(
              'tdw_cancel_subscription_desc_plan',
              'You keep {{name}} until the end of this billing period. After that the workspace has no plan.',
              { name: current?.name || '' }
            ),
            confirmLabel: t('tdw_yes_cancel', 'Yes, cancel'),
            cancelLabel: t('tdw_billing_keep_plan', 'Keep my plan'),
            tone: 'destructive',
          }))
        ) {
          return;
        }
        const reason = await dialogs.askReason();
        if (reason === null) {
          return;
        }
        feedback = reason;
        const checkDiscount = await (
          await fetch('/billing/check-discount')
        ).json();
        if (
          checkDiscount.offerCoupon &&
          (await dialogs.offerDiscount()) !== 'cancel'
        ) {
          return;
        }
        events('cancel_subscription');
      }
      setLoading(true);
      const { cancel_at } = await (
        await fetch('/billing/cancel', {
          method: 'POST',
          body: JSON.stringify({ feedback }),
        })
      ).json();
      setSubscription((subs) => ({ ...subs!, cancelAt: cancel_at || null }));
      toast.show(
        cancel_at
          ? t('tdw_cancel_scheduled', 'Your plan ends on {{date}}.', {
              date: newDayjs(cancel_at).local().format('D MMM YYYY'),
            })
          : t('tdw_resumed', 'Your subscription continues.')
      );
      setLoading(false);
    },
    [subscription, planFor]
  );

  // Switch plan or period on a live subscription: Stripe prorates
  const switchPlan = useCallback(
    async (tier: string) => {
      const target = planFor(tier);
      const current = planFor(subscription?.subscriptionTier || '');
      if (
        current &&
        target &&
        current.teamMembers !== 0 &&
        target.teamMembers === 0 &&
        !(await dialogs.confirm({
          title: t('tdw_change_plan_q', 'Change your plan?'),
          description: t(
            'tdw_team_removed',
            'Your team members will be removed from this workspace.'
          ),
          confirmLabel: t('tdw_yes_continue', 'Yes, continue'),
          tone: 'destructive',
        }))
      ) {
        return;
      }
      setLoading(true);
      const { portal, blocked, checkout: needsCheckout } = await (
        await fetch('/billing/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            period,
            utm,
            billing: tier,
            ...(dub ? { dub } : {}),
          }),
        })
      ).json();
      setLoading(false);
      if (blocked) {
        await dialogs.confirm({
          title: t('tdw_already_subscribed', 'Already subscribed'),
          description: t(
            'billing_other_account_subscribed',
            'Another account with this email already has an active subscription. Please log off and sign in to that account to manage your subscription.'
          ),
          confirmLabel: t('tdw_ok', 'OK'),
          alert: true,
        });
        return;
      }
      // A plan granted by an admin isn't paid through Stripe yet
      if (needsCheckout) {
        setCheckout(target || null);
        return;
      }
      if (portal) {
        if (
          await dialogs.confirm({
            title: t('tdw_payment_method_required', 'Payment method required'),
            description: t(
              'tdw_could_not_charge',
              'We could not charge your card. Update your payment method to continue.'
            ),
            confirmLabel: t('tdw_update_card', 'Update card'),
          })
        ) {
          window.open(portal);
        }
        return;
      }
      setSubscription((subs) => ({
        ...subs!,
        subscriptionTier: tier as Subscription['subscriptionTier'],
        period,
        cancelAt: null,
      }));
      mutate('/user/self');
      toast.show(
        t('tdw_plan_changed', 'You’re now on {{name}}.', {
          name: target?.name || '',
        })
      );
    },
    [subscription, period, utm, dub, planFor]
  );

  if (user?.isLifetime) {
    router.replace('/');
    return null;
  }

  const faq = (
    <section className="tdw-billing-faq">
      <h2 className="tdw-section-title">{t('tdw_questions', 'Questions')}</h2>
      <FAQComponent />
    </section>
  );

  if (subscription?.platform && subscription.platform !== 'web') {
    return (
      <TadweenScope className="tdw-billing-page">
        <section className="pz-bill-card pz-bill-center">
          <span className="pz-retention-mark" aria-hidden="true">
            <Icon name="smartphone" size={20} />
          </span>
          <h2 className="title-2 m-0">
            {t('subscription_managed_by', 'Your subscription is managed by')}{' '}
            <span className="capitalize">{subscription.provider}</span>
          </h2>
          <p>
            {t(
              'subscription_manage_on_platform',
              'Please go to {{platform}} to manage it',
              { platform: subscription.platform }
            )}
          </p>
        </section>
        {faq}
      </TadweenScope>
    );
  }

  const currentPlan = subscription
    ? planFor(subscription.subscriptionTier)
    : undefined;
  const samePeriod = subscription?.period === period;
  const otherPlans = plans.filter(
    (p) => !(p.tier === subscription?.subscriptionTier && samePeriod)
  );
  const trialEligible = !subscription && !!user?.allowTrial;

  const cta = (plan: PublicPlan) => {
    if (!subscription) {
      return (
        <Button
          variant={plan.mostPopular ? 'primary' : 'secondary'}
          size="lg"
          className="w-full"
          onClick={() => setCheckout(plan)}
        >
          {trialEligible && plan.trialDays > 0
            ? t('tdw_start_trial', 'Start {{n}}-day trial', {
                n: plan.trialDays,
              })
            : t('tdw_choose_plan_name', 'Choose {{name}}', { name: plan.name })}
        </Button>
      );
    }
    if (plan.tier === subscription.subscriptionTier && samePeriod) {
      return (
        <Button size="lg" className="w-full" disabled icon="check">
          {t('tdw_current_plan', 'Current plan')}
        </Button>
      );
    }
    return (
      <Button
        variant={plan.mostPopular ? 'primary' : 'secondary'}
        size="lg"
        className="w-full"
        disabled={loading}
        onClick={() => setChangeTo(plan.tier)}
      >
        {plan.tier === subscription.subscriptionTier
          ? period === 'YEARLY'
            ? t('tdw_switch_yearly', 'Switch to yearly')
            : t('tdw_switch_monthly', 'Switch to monthly')
          : (currentPlan?.monthlyPriceUsd || 0) < plan.monthlyPriceUsd
          ? t('tdw_upgrade_to', 'Upgrade to {{name}}', { name: plan.name })
          : t('tdw_switch_to', 'Switch to {{name}}', { name: plan.name })}
      </Button>
    );
  };

  return (
    <TadweenScope className="tdw-billing-page">
      {dialogs.node}
      {finishTrial && <FinishTrial close={() => setFinishTrial(false)} />}
      {subscription?.cancelAt && isGeneral && (
        <Banner
          tone="warning"
          title={t('tdw_plan_ends_on', 'Your plan ends on {{date}}.', {
            date: newDayjs(subscription.cancelAt).local().format('D MMM YYYY'),
          })}
        >
          {t(
            'tdw_plan_ends_desc',
            'You will not be charged again. Resume any time before then to keep it.'
          )}
        </Banner>
      )}
      {!!subscription && (
        <CurrentPlanCard
          plan={currentPlan}
          period={subscription.period as BillingPeriod}
          trial={!!user?.isTrailing}
          paymentFailed={isPaymentFailed(subscription.status)}
          priceCents={subscription.priceCents}
          cancelAt={subscription.cancelAt}
          actions={
            <>
              <Button variant="primary" icon="credit-card" onClick={openPortal}>
                {isPaymentFailed(subscription.status)
                  ? t('tdw_update_card', 'Update card')
                  : t('tdw_manage_billing', 'Manage billing')}
              </Button>
              <Button variant="ghost" icon="receipt" onClick={openPortal}>
                {t('tdw_invoices', 'Invoices')}
              </Button>
              <span className="grow" />
              {isGeneral &&
                (subscription.cancelAt ? (
                  <Button
                    variant="secondary"
                    loading={loading}
                    onClick={() => toggleCancel(true)}
                  >
                    {t('tdw_resume_subscription', 'Resume subscription')}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="is-danger"
                    loading={loading}
                    onClick={() => toggleCancel(false)}
                  >
                    {t('tdw_cancel_subscription', 'Cancel subscription')}
                  </Button>
                ))}
            </>
          }
        />
      )}
      <PlansView
        title={
          subscription
            ? t('tdw_plans', 'Plans')
            : t('tdw_choose_a_plan', 'Choose a plan')
        }
        lead={
          subscription
            ? t(
                'tdw_plans_lead_switch',
                'Switch any time. Stripe charges only the difference for the rest of this period.'
              )
            : t(
                'tdw_paywall_lead_plans',
                'Plans differ in limits: channels, team members and AI credits.'
              )
        }
        period={period}
        onPeriod={setPeriod}
        currentTier={samePeriod ? subscription?.subscriptionTier : undefined}
        cta={cta}
        note={(plan) =>
          subscription &&
          !(plan.tier === subscription.subscriptionTier && samePeriod) ? (
            <Prorate period={period} pack={plan.tier} />
          ) : null
        }
      />
      {faq}
      <ChangePlanDialog
        open={!!changeTo}
        onClose={() => setChangeTo(null)}
        options={otherPlans.map((p) => ({
          value: p.tier,
          label: `${p.name} · ${formatUsd(
            period === 'YEARLY' ? p.yearlyPriceUsd / 12 : p.monthlyPriceUsd
          )}${t('tdw_per_mo', '/mo')}`,
          description: p.description || '',
        }))}
        value={changeTo || ''}
        onChange={setChangeTo}
        period={
          <PeriodToggle
            value={period}
            onChange={setPeriod}
            save={plans[0]?.yearlyDiscountPercent || 0}
          />
        }
        payToday={changeTo ? <Prorate period={period} pack={changeTo} /> : null}
        loading={loading}
        onConfirm={() => {
          const target = changeTo;
          setChangeTo(null);
          if (target) {
            switchPlan(target);
          }
        }}
      />
      <CheckoutDrawer
        plan={checkout}
        period={period}
        onClose={() => setCheckout(null)}
      />
    </TadweenScope>
  );
};
