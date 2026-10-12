'use client';

// Subscribing from a workspace without a plan: an order summary above Stripe
// Embedded Checkout, in a drawer (full screen on phones). Stripe handles card,
// wallets, 3-D Secure, promotion codes and local currency. When Stripe reports
// the payment complete, the app still waits for the webhook to create the
// subscription (GET /billing/check/:id) before saying the plan is active.
import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { useSWRConfig } from 'swr';
import { useRouter } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { PublicPlan } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import {
  Button,
  Drawer,
  Icon,
  Spinner,
} from '@gitroom/frontend/components/tadween/ui';
import {
  BillingPeriod,
  formatUsd,
} from '@gitroom/frontend/components/tadween/billing/pricing';
import {
  FounderNote,
  usePlanFeatureText,
} from '@gitroom/frontend/components/tadween/billing/plans.view';

type Step =
  | 'pay'
  | 'confirming'
  | 'done'
  | 'failed'
  | 'slow'
  | 'blocked'
  | 'unavailable';

// Poll for the webhook for up to ~45 seconds
const POLL_MS = 1500;
const POLL_TRIES = 30;

// After checkout (or a card-less trial), wait until the webhook created the
// subscription: GET /billing/check/:id answers 2 (active), 1 (refused).
export const waitForSubscription = async (
  fetch: ReturnType<typeof useFetch>,
  check: string
): Promise<'done' | 'failed' | 'slow'> => {
  for (let i = 0; i < POLL_TRIES; i++) {
    const { status } = await (await fetch('/billing/check/' + check)).json();
    if (status === 2) {
      return 'done';
    }
    if (status === 1) {
      return 'failed';
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return 'slow';
};

const OrderSummary: FC<{
  plan: PublicPlan;
  period: BillingPeriod;
  trialDays: number;
}> = ({ plan, period, trialDays }) => {
  const t = useT();
  const text = usePlanFeatureText();
  const [all, setAll] = useState(false);
  const yearly = period === 'YEARLY';
  const amount = yearly ? plan.yearlyPriceUsd : plan.monthlyPriceUsd;
  const per = yearly
    ? t('tdw_per_year_short', '/year')
    : t('tdw_per_month_short', '/month');
  const saving = plan.monthlyPriceUsd * 12 - plan.yearlyPriceUsd;
  const items = [
    ...plan.featureItems.map((i) => text(i)),
    ...plan.extraFeatures,
  ];
  const shown = all ? items : items.slice(0, 4);
  const firstCharge = newDayjs().add(trialDays, 'day').toDate();
  const dateLabel = new Intl.DateTimeFormat(
    document.documentElement.lang || undefined,
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  ).format(firstCharge);
  return (
    <section className="tdw-order">
      <div className="tdw-order-head">
        <div className="min-w-0">
          <h3 className="tdw-order-name">{plan.name}</h3>
          {plan.description ? (
            <p className="tdw-order-desc">{plan.description}</p>
          ) : null}
        </div>
        <div className="tdw-order-price">
          <span className="tdw-order-amount">{formatUsd(amount)}</span>
          <span className="tdw-order-per">{per}</span>
        </div>
      </div>
      <FounderNote plan={plan} period={period} />
      <div className="tdw-order-meta">
        <span>
          {yearly
            ? t('tdw_billed_yearly_label', 'Billed yearly')
            : t('tdw_billed_monthly', 'Billed monthly')}
        </span>
        {yearly && saving > 0 ? (
          <span className="tdw-order-save">
            {t('tdw_you_save', 'You save {{amount}}', {
              amount: formatUsd(saving),
            })}
          </span>
        ) : null}
      </div>
      {trialDays > 0 ? (
        <p className="tdw-order-trial">
          <Icon name="sparkles" size={16} />
          <span>
            {t(
              'tdw_trial_line',
              '{{n}}-day free trial — {{today}} today, then {{amount}}{{per}} from {{date}}',
              {
                n: trialDays,
                today: formatUsd(0),
                amount: formatUsd(amount),
                per,
                date: dateLabel,
                // React escapes; i18next would turn "/month" into "&#x2F;month"
                interpolation: { escapeValue: false },
              }
            )}
          </span>
        </p>
      ) : (
        <p className="tdw-order-trial">
          <Icon name="credit-card" size={16} />
          <span>
            {t('tdw_due_today', '{{amount}} today, renews every {{period}}', {
              amount: formatUsd(amount),
              period: yearly ? t('tdw_year', 'year') : t('tdw_month', 'month'),
            })}
          </span>
        </p>
      )}
      <div className="tdw-order-included">
        <h4>{t('tdw_whats_included', 'What’s included')}</h4>
        <ul className="tdw-plan-features">
          {shown.map((f) => (
            <li key={f}>
              <Icon name="check" size={16} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {items.length > 4 ? (
          <button
            type="button"
            className="tdw-order-more"
            onClick={() => setAll(!all)}
          >
            {all ? t('tdw_see_less', 'See less') : t('tdw_see_all', 'See all')}
          </button>
        ) : null}
      </div>
      <p className="tdw-order-note">
        {t(
          'tdw_cancel_anytime_billing',
          'Cancel any time in Settings → Billing.'
        )}
      </p>
    </section>
  );
};

export const CheckoutDrawer: FC<{
  plan: PublicPlan | null;
  period: BillingPeriod;
  onClose: () => void;
}> = ({ plan, period, onClose }) => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const dub = useDubClickId();
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const { stripeClient } = useVariables();
  const stripePromise = useMemo(
    () => (stripeClient ? loadStripe(stripeClient) : null),
    [stripeClient]
  );
  const [step, setStep] = useState<Step>('pay');
  const check = useRef<string>('');
  const open = !!plan;
  const trialDays = user?.allowTrial && plan ? plan.trialDays : 0;

  useEffect(() => {
    if (open) {
      setStep('pay');
      check.current = '';
      // Ad blockers or a network error can keep Stripe.js from loading
      stripePromise?.catch(() => setStep('unavailable'));
    }
  }, [open, plan?.tier, period]);

  const fetchClientSecret = useCallback(async () => {
    const data = await (
      await fetch('/billing/embedded', {
        method: 'POST',
        body: JSON.stringify({
          billing: plan!.tier,
          period,
          ...(dub ? { dub } : {}),
        }),
      })
    ).json();
    if (data.blocked || !data.client_secret) {
      setStep('blocked');
      throw new Error('blocked');
    }
    check.current = data.check;
    return data.client_secret as string;
  }, [plan, period, dub]);

  // Never trust the client callback alone: wait until the webhook stored it
  const onComplete = useCallback(async () => {
    setStep('confirming');
    setStep(await waitForSubscription(fetch, check.current));
  }, []);

  const finish = useCallback(async () => {
    await mutate('/user/self');
    mutate('/user/subscription');
    onClose();
    router.push('/launches');
  }, [onClose]);

  const options = useMemo(
    () => ({ fetchClientSecret, onComplete }),
    [fetchClientSecret, onComplete]
  );

  return (
    <Drawer
      open={open}
      onClose={
        step === 'confirming' ? () => {} : step === 'done' ? finish : onClose
      }
      size="lg"
      title={
        plan
          ? t('tdw_subscribe_to', 'Subscribe to {{name}}', { name: plan.name })
          : ''
      }
    >
      {plan ? (
        <div className="tdw-checkout">
          {step === 'pay' ? (
            <>
              <OrderSummary plan={plan} period={period} trialDays={trialDays} />
              <div className="tdw-checkout-stripe">
                {stripePromise ? (
                  <EmbeddedCheckoutProvider
                    key={`${plan.tier}-${period}`}
                    stripe={stripePromise}
                    options={options}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                ) : null}
              </div>
            </>
          ) : step === 'confirming' ? (
            <div className="tdw-checkout-state" role="status">
              <Spinner size={28} label={t('tdw_confirming', 'Confirming')} />
              <h3>
                {t('tdw_confirming_payment', 'Confirming your subscription…')}
              </h3>
              <p>
                {t(
                  'tdw_confirming_desc',
                  'This takes a few seconds. Please keep this window open.'
                )}
              </p>
            </div>
          ) : step === 'done' ? (
            <div className="tdw-checkout-state is-done" role="status">
              <span className="tdw-checkout-mark">
                <Icon name="circle-check" size={28} />
              </span>
              <h3>
                {t('tdw_youre_on', 'You’re on {{name}}', { name: plan.name })}
              </h3>
              <p>
                {trialDays > 0
                  ? t(
                      'tdw_youre_on_trial_desc',
                      'Your {{n}}-day free trial has started. Next: connect your channels and schedule your first post.',
                      { n: trialDays }
                    )
                  : t(
                      'tdw_youre_on_desc',
                      'Your plan is active. Next: connect your channels and schedule your first post.'
                    )}
              </p>
              <Button
                variant="primary"
                size="lg"
                icon="arrow-right"
                onClick={finish}
              >
                {t('tdw_get_started', 'Get started')}
              </Button>
            </div>
          ) : step === 'failed' ? (
            <div className="tdw-checkout-state is-error" role="alert">
              <span className="tdw-checkout-mark">
                <Icon name="circle-x" size={28} />
              </span>
              <h3>
                {t('tdw_card_not_validated', 'We couldn’t validate your card')}
              </h3>
              <p>
                {t(
                  'tdw_card_not_validated_desc',
                  'Nothing was charged. Try again with another card.'
                )}
              </p>
              <Button variant="primary" onClick={() => setStep('pay')}>
                {t('tdw_try_again', 'Try again')}
              </Button>
            </div>
          ) : step === 'slow' ? (
            <div className="tdw-checkout-state" role="status">
              <span className="tdw-checkout-mark">
                <Icon name="clock" size={28} />
              </span>
              <h3>{t('tdw_payment_received', 'Payment received')}</h3>
              <p>
                {t(
                  'tdw_payment_received_desc',
                  'We are still activating your plan. It will appear in a minute; you can close this window.'
                )}
              </p>
              <Button variant="secondary" onClick={finish}>
                {t('tdw_close', 'Close')}
              </Button>
            </div>
          ) : step === 'unavailable' ? (
            <div className="tdw-checkout-state is-error" role="alert">
              <span className="tdw-checkout-mark">
                <Icon name="triangle-alert" size={28} />
              </span>
              <h3>
                {t('tdw_checkout_unavailable', 'The payment form didn’t load')}
              </h3>
              <p>
                {t(
                  'billing_stripe_load_failed',
                  'The payment form could not be loaded. Please disable ad blockers or privacy extensions for this page and reload.'
                )}
              </p>
            </div>
          ) : (
            <div className="tdw-checkout-state is-error" role="alert">
              <span className="tdw-checkout-mark">
                <Icon name="triangle-alert" size={28} />
              </span>
              <h3>{t('tdw_already_subscribed', 'Already subscribed')}</h3>
              <p>
                {t(
                  'billing_other_account_subscribed',
                  'Another account with this email already has an active subscription. Please log off and sign in to that account to manage your subscription.'
                )}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </Drawer>
  );
};
