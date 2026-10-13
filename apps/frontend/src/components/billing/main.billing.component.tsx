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
import { PlanUsage } from '@gitroom/frontend/components/tadween/billing/current.plan';
import {
  isPaymentFailed,
  useTrialInfo,
} from '@gitroom/frontend/components/tadween/billing/trial.banner';
import { useBillingDialogs } from '@gitroom/frontend/components/tadween/billing/billing.dialogs';
import { PlanCard } from '@gitroom/frontend/components/tadween/billing/plans.view';
import {
  CheckoutPanel,
  OrderSummary,
} from '@gitroom/frontend/components/tadween/billing/checkout.panel';
import {
  AiCreditsCard,
  BuyCreditsDrawer,
} from '@gitroom/frontend/components/tadween/billing/ai.credits';
import { BillingHistory } from '@gitroom/frontend/components/tadween/billing/billing.history';
import { useUtmUrl } from '@gitroom/helpers/utils/utm.saver';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { FinishTrial } from '@gitroom/frontend/components/billing/finish.trial';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';

// What each plan card compares at a glance, as on the plan step
const CARD_ROWS = ['channels', 'posts', 'team', 'ai_images'];

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
  const { data: trialInfo } = useTrialInfo(
    !!user?.isTrailing && !isPaymentFailed(user?.subscriptionStatus)
  );
  const queryParams = useSearchParams();
  const [finishTrial, setFinishTrial] = useState(
    !!queryParams.get('finishTrial')
  );

  const [subscription, setSubscription] = useState<
    SubscriptionWithPlatform | undefined
  >(sub);
  const [loading, setLoading] = useState<boolean>(false);
  const [period, setPeriod] = useState<BillingPeriod>(sub?.period || 'MONTHLY');
  // The plan being paid on this page: a workspace without a Stripe
  // subscription (e.g. a plan granted by an admin) pays through the same
  // checkout as the plan step
  const [payTier, setPayTier] = useState<string | null>(null);
  // While Stripe's payment is being confirmed the choice stays as paid
  const [locked, setLocked] = useState(false);
  // which card's button started the request, so only that one spins
  const [clicked, setClicked] = useState('');
  // /billing?credits=1 (from the AI credits paywall) opens the top-up drawer
  const [buyCredits, setBuyCredits] = useState(!!queryParams.get('credits'));
  useEffect(() => {
    setSubscription(sub);
    setPeriod(sub?.period || 'MONTHLY');
  }, [sub]);
  // /billing?plan=TIER (from the upgrade paywall): the plans in view
  const preselect = queryParams.get('plan');
  useEffect(() => {
    if (!preselect || !plans.length) {
      return;
    }
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
        setPayTier(tier);
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
        // the new price comes with the webhook; until then the plan's price
        priceCents: null,
      }));
      mutate('/user/self');
      mutate('/billing/invoices');
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
  const failed = isPaymentFailed(subscription?.status);
  // The free trial without a card yet: every plan is chosen through the
  // same checkout as the plan step (it saves a card for this trial)
  const cardless =
    !!subscription &&
    !!user?.isTrailing &&
    !failed &&
    !!trialInfo &&
    !trialInfo.hasPaymentMethod;
  const trial = !!user?.allowTrial;
  const payPlan = plans.find((p) => p.tier === payTier);
  // What the subscription pays a month (a founder price stays locked)
  const currentAmount =
    samePeriod && typeof subscription?.priceCents === 'number'
      ? period === 'YEARLY'
        ? subscription.priceCents / 1200
        : subscription.priceCents / 100
      : undefined;

  // One action per plan, as Postiz's billing: current plan, resume, switch
  // the period, upgrade or downgrade (Stripe prorates), or pay for a first one
  const planAction = (plan: PublicPlan) => {
    const run = (fn: () => void) => () => {
      setClicked(plan.tier);
      fn();
    };
    if (!subscription || cardless) {
      return {
        label: cardless
          ? t('tdw_choose_plan_name', 'Choose {{name}}', { name: plan.name })
          : trial && plan.trialDays > 0
          ? t('tdw_start_free_trial', 'Start {{n}}-day free trial', {
              n: plan.trialDays,
            })
          : t('tdw_choose_plan_name', 'Choose {{name}}', {
              name: plan.name,
            }),
        variant: plan.mostPopular ? 'primary' : 'secondary',
        onClick: () => {
          setPayTier(plan.tier);
          requestAnimationFrame(() =>
            document
              .getElementById('tdw-plan-pay')
              ?.scrollIntoView({ block: 'start' })
          );
        },
      } as const;
    }
    if (plan.tier === subscription.subscriptionTier) {
      if (subscription.cancelAt) {
        return {
          label: t('tdw_resume_subscription', 'Resume subscription'),
          variant: 'primary',
          onClick: run(() => toggleCancel(true)),
        } as const;
      }
      if (samePeriod) {
        return {
          label: t('tdw_current_plan', 'Current plan'),
          variant: 'secondary',
          disabled: true,
        } as const;
      }
      return {
        label:
          period === 'YEARLY'
            ? t('tdw_switch_yearly', 'Switch to yearly')
            : t('tdw_switch_monthly', 'Switch to monthly'),
        variant: 'primary',
        onClick: run(() => switchPlan(plan.tier)),
      } as const;
    }
    const up = (currentPlan?.monthlyPriceUsd || 0) < plan.monthlyPriceUsd;
    return {
      label: up
        ? t('tdw_upgrade_to', 'Upgrade to {{name}}', { name: plan.name })
        : t('tdw_downgrade_to', 'Downgrade to {{name}}', { name: plan.name }),
      variant: up ? 'primary' : 'secondary',
      onClick: run(() => switchPlan(plan.tier)),
    } as const;
  };

  const flag = failed
    ? t('tdw_payment_failed', 'Payment failed')
    : subscription?.cancelAt
    ? t('tdw_ends_on_short', 'Ends {{date}}', {
        date: newDayjs(subscription.cancelAt).local().format('D MMM'),
      })
    : user?.isTrailing
    ? t('tdw_trial_pill', 'Trial')
    : t('tdw_active', 'Active');

  return (
    <TadweenScope className="tdw-billing-page">
      {dialogs.node}
      {finishTrial && <FinishTrial close={() => setFinishTrial(false)} />}
      <header className="tdw-billing-head">
        <div className="min-w-0">
          <h1 className="tdw-billing-title">
            {t('tdw_billing_title', 'Billing & subscription')}
          </h1>
          <p className="tdw-billing-lead">
            {t(
              'tdw_billing_lead',
              'Your plan, your payment method and your invoices.'
            )}
          </p>
        </div>
        <span inert={locked || undefined}>
          <PeriodToggle
            value={period}
            onChange={setPeriod}
            save={plans[0]?.yearlyDiscountPercent ?? 0}
          />
        </span>
      </header>
      {failed ? (
        <Banner
          tone="error"
          title={t(
            'tdw_payment_failed_bar',
            'Your last payment failed. Update your card to keep posting.'
          )}
          action={
            <Button size="sm" variant="primary" onClick={openPortal}>
              {t('tdw_update_card', 'Update card')}
            </Button>
          }
        >
          {t(
            'tdw_payment_failed_retry',
            'Stripe retries the card over the next days; everything keeps working until then.'
          )}
        </Banner>
      ) : subscription?.cancelAt && isGeneral ? (
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
      ) : null}
      <div id="tdw-plans" className="tdw-plan-row" data-count={plans.length}>
        {plans.map((plan) => {
          const action = planAction(plan);
          const current = plan.tier === subscription?.subscriptionTier;
          return (
            <PlanCard
              key={plan.key}
              plan={plan}
              period={period}
              rows={CARD_ROWS}
              current={current}
              flag={current ? flag : undefined}
              amount={current ? currentAmount : undefined}
              cta={
                <Button
                  variant={action.variant}
                  disabled={
                    ('disabled' in action && action.disabled) ||
                    locked ||
                    (loading && clicked !== plan.tier)
                  }
                  loading={loading && clicked === plan.tier}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              }
              note={
                current && currentPlan ? (
                  <PlanUsage plan={currentPlan} />
                ) : subscription && !subscription.cancelAt && !cardless ? (
                  <Prorate period={period} pack={plan.tier} />
                ) : null
              }
            />
          );
        })}
      </div>
      {payPlan ? (
        <div id="tdw-plan-pay" className="tdw-plan-pay">
          <div className="tdw-plan-pay-side">
            <OrderSummary
              plan={payPlan}
              period={period}
              trialDays={trial ? payPlan.trialDays : 0}
            />
          </div>
          <CheckoutPanel
            plan={payPlan}
            period={period}
            onLock={setLocked}
            onDone={() => setPayTier(null)}
          />
        </div>
      ) : null}
      {!!subscription && (
        <section className="tdw-paymethod">
          <span className="tdw-paymethod-ico" aria-hidden="true">
            <Icon name="credit-card" size={22} />
          </span>
          <div className="tdw-paymethod-text">
            <h2>{t('tdw_payment_method', 'Payment method')}</h2>
            <p>
              {t(
                'tdw_payment_method_desc',
                'Update your card, billing address and tax details in the secure billing portal.'
              )}
            </p>
          </div>
          <div className="tdw-paymethod-actions">
            {isGeneral && !subscription.cancelAt ? (
              <Button
                variant="ghost"
                className="is-danger"
                loading={loading && clicked === 'CANCEL'}
                disabled={loading}
                onClick={() => {
                  setClicked('CANCEL');
                  toggleCancel(false);
                }}
              >
                {t('tdw_cancel_subscription', 'Cancel subscription')}
              </Button>
            ) : null}
            <Button icon="external-link" onClick={openPortal}>
              {failed
                ? t('tdw_update_card', 'Update card')
                : t('tdw_update_payment_method', 'Update payment method')}
            </Button>
          </div>
        </section>
      )}
      {!!subscription && <AiCreditsCard onBuy={() => setBuyCredits(true)} />}
      {!!subscription && <BillingHistory />}
      {faq}
      <BuyCreditsDrawer
        open={buyCredits}
        onClose={() => setBuyCredits(false)}
      />
    </TadweenScope>
  );
};
