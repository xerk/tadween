'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Subscription } from '@prisma/client';
import { useDebouncedCallback } from 'use-debounce';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useTadweenPricing } from '@gitroom/frontend/components/tadween/instance/instance.settings';
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
} from '@gitroom/frontend/components/tadween/billing/pricing';
import { CurrentPlanCard } from '@gitroom/frontend/components/tadween/billing/current.plan';
import { isPaymentFailed } from '@gitroom/frontend/components/tadween/billing/trial.banner';
import {
  ChangePlanPanel,
  useBillingDialogs,
} from '@gitroom/frontend/components/tadween/billing/billing.dialogs';
import {
  PlanPicker,
  TrustRow,
} from '@gitroom/frontend/components/tadween/billing/plans.view';
import {
  CheckoutPanel,
  OrderSummary,
} from '@gitroom/frontend/components/tadween/billing/checkout.panel';
import {
  AiCreditsCard,
  BuyCreditsDrawer,
} from '@gitroom/frontend/components/tadween/billing/ai.credits';
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
  // The plan picked on the page; with a subscription it starts on its plan
  const [tier, setTier] = useState<string>(sub?.subscriptionTier || '');
  // A plan granted by an admin has no Stripe subscription to change: it is
  // paid through the same inline checkout as a workspace without a plan
  const [needsCheckout, setNeedsCheckout] = useState(false);
  // While Stripe's payment is being confirmed the choice stays as paid
  const [locked, setLocked] = useState(false);
  // /billing?credits=1 (from the AI credits paywall) opens the top-up drawer
  const [buyCredits, setBuyCredits] = useState(!!queryParams.get('credits'));
  useEffect(() => {
    setSubscription(sub);
    setPeriod(sub?.period || 'MONTHLY');
    setTier(sub?.subscriptionTier || '');
  }, [sub]);
  // /billing?plan=TIER (from the upgrade paywall) starts on that plan, with
  // what it changes in view
  const preselect = queryParams.get('plan');
  useEffect(() => {
    const plan = plans.find((p) => p.tier === preselect);
    if (!plan || plan.tier === sub?.subscriptionTier) {
      return;
    }
    setTier(plan.tier);
    requestAnimationFrame(() =>
      document.getElementById('tdw-plans')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      })
    );
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
      const { portal, blocked, checkout } = await (
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
      if (checkout) {
        setNeedsCheckout(true);
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
  const selected =
    plans.find((p) => p.tier === tier) ||
    currentPlan ||
    plans.find((p) => p.mostPopular) ||
    plans[0];
  // No subscription to change: the picked plan is paid on this page
  const paying = !subscription || needsCheckout;
  const unchanged =
    !!subscription &&
    selected?.tier === subscription.subscriptionTier &&
    samePeriod;
  const priceLabel = (amount: number, p: BillingPeriod) =>
    `${formatUsd(amount)}${
      p === 'YEARLY'
        ? t('tdw_per_year_short', '/year')
        : t('tdw_per_month_short', '/month')
    }`;
  const changeLabel = !selected
    ? ''
    : selected.tier === subscription?.subscriptionTier
    ? period === 'YEARLY'
      ? t('tdw_switch_yearly', 'Switch to yearly')
      : t('tdw_switch_monthly', 'Switch to monthly')
    : (currentPlan?.monthlyPriceUsd || 0) < selected.monthlyPriceUsd
    ? t('tdw_upgrade_to', 'Upgrade to {{name}}', { name: selected.name })
    : t('tdw_switch_to', 'Switch to {{name}}', { name: selected.name });

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
      {!!subscription && (
        <AiCreditsCard onBuy={() => setBuyCredits(true)} />
      )}
      {selected ? (
        <div id="tdw-plans" className="tdw-billing-plans">
          <PlanPicker
            title={
              subscription
                ? t('tdw_plans', 'Plans')
                : t('tdw_choose_a_plan', 'Choose a plan')
            }
            value={selected.tier}
            onChange={setTier}
            period={period}
            onPeriod={setPeriod}
            currentTier={subscription?.subscriptionTier}
            disabled={locked || loading}
          />
          <div className="tdw-pay">
            <div className="tdw-pay-main">
              <OrderSummary
                plan={selected}
                period={period}
                trialDays={
                  paying && user?.allowTrial ? selected.trialDays : 0
                }
                change={!paying}
              />
              <TrustRow />
            </div>
            {paying ? (
              <CheckoutPanel
                plan={selected}
                period={period}
                onLock={setLocked}
              />
            ) : (
              <ChangePlanPanel
                now={
                  currentPlan
                    ? `${currentPlan.name} · ${priceLabel(
                        typeof subscription?.priceCents === 'number'
                          ? subscription.priceCents / 100
                          : subscription?.period === 'YEARLY'
                          ? currentPlan.yearlyPriceUsd
                          : currentPlan.monthlyPriceUsd,
                        subscription?.period as BillingPeriod
                      )}`
                    : t('tdw_your_plan', 'Your plan')
                }
                next={
                  unchanged
                    ? null
                    : `${selected.name} · ${priceLabel(
                        period === 'YEARLY'
                          ? selected.yearlyPriceUsd
                          : selected.monthlyPriceUsd,
                        period
                      )}`
                }
                payToday={
                  unchanged ? null : (
                    <Prorate period={period} pack={selected.tier} />
                  )
                }
                confirmLabel={changeLabel}
                loading={loading}
                onConfirm={() => switchPlan(selected.tier)}
              />
            )}
          </div>
        </div>
      ) : null}
      {faq}
      <BuyCreditsDrawer
        open={buyCredits}
        onClose={() => setBuyCredits(false)}
      />
    </TadweenScope>
  );
};
