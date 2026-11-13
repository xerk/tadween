'use client';

// Paying for a plan in the page, the way Postiz's first billing screen does
// it: a Checkout Session in Stripe's `custom` UI mode, rendered with Checkout
// Elements. Stripe's Payment Element collects the card (or Link, or a wallet)
// and our own button confirms it; with a trial nothing is charged today and
// Stripe charges the card when the trial ends. When Stripe reports the
// payment confirmed, the app still waits for the webhook to create the
// subscription (GET /billing/check/:id) before saying the plan is active.
import React, {
  FC,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Appearance, loadStripe, StripeElementLocale } from '@stripe/stripe-js';
import {
  CheckoutProvider,
  PaymentElement,
  useCheckout,
} from '@stripe/react-stripe-js/checkout';
import useSWR, { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';
import { PublicPlan } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import {
  Button,
  Icon,
  Input,
  Skeleton,
  Spinner,
} from '@gitroom/frontend/components/tadween/ui';
import {
  BillingPeriod,
  formatUsd,
} from '@gitroom/frontend/components/tadween/billing/pricing';

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

// One Checkout Session per plan and period (POST /billing/embedded), kept for
// the page's life so going back and forth between plans reuses it
const useCheckoutSession = (tier: string, period: BillingPeriod) => {
  const fetch = useFetch();
  const dub = useDubClickId();
  const load = useCallback(async () => {
    const res = await fetch('/billing/embedded', {
      method: 'POST',
      body: JSON.stringify({
        billing: tier,
        period,
        ...(dub ? { dub } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error('checkout');
    }
    return (await res.json()) as {
      client_secret?: string;
      check?: string;
      blocked?: boolean;
      // set when the workspace is already on its free trial: the session
      // saves a card for that trial (setup mode), nothing is charged
      trialEnd?: string | null;
    };
  }, [tier, period, dub]);
  return useSWR(`/billing/embedded/${tier}/${period}`, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    shouldRetryOnError: false,
  });
};

// Whether the app is in light mode (`light` on <body>, set by the mode switch)
const useLightMode = () => {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const read = () => setLight(document.body.classList.contains('light'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);
  return light;
};

const GEIST =
  'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap';

// Stripe's fields in Tadween's colours: the tokens of the current mode
const tadweenAppearance = (light: boolean): Appearance => {
  const css = getComputedStyle(document.body);
  const token = (name: string) =>
    css.getPropertyValue(name).trim() || undefined;
  return {
    theme: light ? 'stripe' : 'night',
    variables: {
      colorPrimary: token('--tdw-primary'),
      colorBackground: token('--tdw-card'),
      colorText: token('--tdw-foreground'),
      colorTextSecondary: token('--tdw-muted-foreground'),
      colorDanger: token('--tdw-destructive'),
      fontFamily: 'Geist, system-ui, sans-serif',
      fontSizeBase: '15px',
      borderRadius: '10px',
    },
    rules: {
      '.Input': {
        borderColor: token('--tdw-border') || '',
        boxShadow: 'none',
      },
      '.Label': { fontWeight: '500' },
      '.Tab': { borderColor: token('--tdw-border') || '', boxShadow: 'none' },
    },
  };
};

const usePeriodLabel = () => {
  const t = useT();
  return (period: BillingPeriod) =>
    period === 'YEARLY'
      ? t('tdw_per_year_short', '/year')
      : t('tdw_per_month_short', '/month');
};

const formatDate = (seconds: number) =>
  new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(seconds * 1000));

// "Have a promo code?": Stripe applies it to the session (monthly plans)
const PromoCode: FC = () => {
  const t = useT();
  const state = useCheckout();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (state.type !== 'success') {
    return null;
  }
  const { checkout } = state;
  const applied = checkout.discountAmounts?.[0];
  const apply = async () => {
    if (!code.trim()) {
      return;
    }
    setBusy(true);
    setError('');
    const result = await checkout.applyPromotionCode(code.trim());
    setBusy(false);
    if (result.type === 'error') {
      setError(
        result.error.message || t('tdw_promo_invalid', 'This code isn’t valid.')
      );
      return;
    }
    setCode('');
    setOpen(false);
  };
  if (applied) {
    return (
      <div className="tdw-promo is-applied">
        <Icon name="tag" size={14} />
        <span>
          {applied.promotionCode || applied.displayName}
          {applied.percentOff ? ` · −${applied.percentOff}%` : ''}
        </span>
        <button
          type="button"
          className="tdw-promo-link"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await checkout.removePromotionCode();
            setBusy(false);
          }}
        >
          {t('tdw_remove', 'Remove')}
        </button>
      </div>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        className="tdw-promo-link"
        onClick={() => setOpen(true)}
      >
        {t('tdw_promo_have', 'Have a promo code?')}
      </button>
    );
  }
  return (
    <div className="tdw-promo">
      <Input
        aria-label={t('tdw_promo_code', 'Promo code')}
        placeholder={t('tdw_promo_code', 'Promo code')}
        value={code}
        autoFocus
        error={error || undefined}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
          if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      <Button size="sm" loading={busy} onClick={apply}>
        {t('tdw_apply', 'Apply')}
      </Button>
    </div>
  );
};

// Stripe's Payment Element (card, Link, wallets), what is due and our own
// confirm button. With a trial Stripe saves the card and charges nothing today.
const PaymentForm: FC<{
  plan: PublicPlan;
  period: BillingPeriod;
  promo: boolean;
  // the running free trial's end, when the session only saves a card for it
  trialEnd?: string | null;
  onPaid: (sessionId: string) => void;
}> = ({ plan, period, promo, trialEnd, onPaid }) => {
  const t = useT();
  const per = usePeriodLabel();
  const state = useCheckout();
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  if (state.type === 'error') {
    return (
      <p className="tdw-checkout-error" role="alert">
        {state.error.message}
      </p>
    );
  }
  const checkout = state.type === 'success' ? state.checkout : null;
  const trial = checkout?.recurring?.trial;
  // Choosing the plan during the free trial: the card is saved now and the
  // plan's price is charged when the trial ends
  const keepTrial = trialEnd ? new Date(trialEnd).getTime() / 1000 : 0;
  const nextDate = keepTrial || trial?.trialEnd || 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkout || paying) {
      return;
    }
    setPaying(true);
    setError('');
    // Card, Link and wallets confirm here; only a payment method that needs
    // its own page goes to the session's return_url (CheckPayment finishes)
    const result = await checkout.confirm({ redirect: 'if_required' });
    if (result.type === 'error') {
      setError(result.error.message);
      setPaying(false);
      return;
    }
    onPaid(checkout.id);
  };

  return (
    <form className="tdw-checkout-form" onSubmit={submit} noValidate>
      {ready ? null : <Skeleton height={236} radius={12} />}
      {checkout ? (
        <PaymentElement
          options={{
            layout: 'tabs',
            fields: { billingDetails: { address: 'if_required' } },
          }}
          onReady={() => setReady(true)}
        />
      ) : null}
      {ready && checkout ? (
        <>
          {promo && !keepTrial ? <PromoCode /> : null}
          <dl className="tdw-checkout-total">
            <div>
              <dt>{t('tdw_due_today_label', 'Due today')}</dt>
              <dd>{keepTrial ? formatUsd(0) : checkout.total.total.amount}</dd>
            </div>
            {nextDate ? (
              <div className="is-next">
                <dt>
                  {t('tdw_then_from', 'From {{date}}', {
                    date: formatDate(nextDate),
                  })}
                </dt>
                <dd>
                  {keepTrial
                    ? formatUsd(
                        period === 'YEARLY'
                          ? plan.yearlyPriceUsd
                          : plan.monthlyPriceUsd
                      )
                    : checkout.recurring?.dueNext.total.amount}
                  {per(period)}
                </dd>
              </div>
            ) : null}
          </dl>
          {error ? (
            <p className="tdw-checkout-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="tdw-checkout-submit"
            loading={paying}
            loadingLabel={t('tdw_confirming', 'Confirming')}
          >
            {keepTrial
              ? t('tdw_choose_plan_name', 'Choose {{name}}', {
                  name: plan.name,
                })
              : trial
              ? t('tdw_start_free_trial', 'Start {{n}}-day free trial', {
                  n: trial.trialPeriodDays,
                })
              : t('tdw_subscribe_amount', 'Subscribe · {{amount}}', {
                  amount: checkout.total.total.amount,
                  interpolation: { escapeValue: false },
                })}
          </Button>
          <p className="tdw-checkout-fine">
            {nextDate
              ? t(
                  'tdw_checkout_trial_fine',
                  'Nothing is charged today. Stripe charges your card on {{date}} unless you cancel before then in Settings → Billing.',
                  {
                    date: formatDate(nextDate),
                    interpolation: { escapeValue: false },
                  }
                )
              : t(
                  'tdw_cancel_anytime_billing',
                  'Cancel any time in Settings → Billing.'
                )}
          </p>
        </>
      ) : null}
    </form>
  );
};

// The payment form for one plan and period, then what happened: confirming
// (waiting for the webhook), done, refused, or still activating. `onLock`
// keeps the choice fixed from the moment Stripe confirmed the payment.
export const CheckoutPanel: FC<{
  plan: PublicPlan;
  period: BillingPeriod;
  onLock?: (locked: boolean) => void;
  // After "Get started"; the plan is active by then. Default: Today.
  onDone?: () => void;
}> = ({ plan, period, onLock, onDone }) => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const { i18n } = useTranslation();
  const { stripeClient } = useVariables();
  const locale = (i18n.resolvedLanguage || 'auto') as StripeElementLocale;
  const stripePromise = useMemo(
    () => (stripeClient ? loadStripe(stripeClient, { locale }) : null),
    [stripeClient, locale]
  );
  const light = useLightMode();
  const [step, setStep] = useState<Step>('pay');
  const toaster = useToaster();
  const {
    data: session,
    error,
    mutate: renewSession,
  } = useCheckoutSession(plan.tier, period);
  const check = useRef('');
  check.current = session?.check || '';
  const trialDays = user?.allowTrial ? plan.trialDays : 0;

  useEffect(() => {
    // Ad blockers or a network error can keep Stripe.js from loading
    stripePromise?.catch(() => setStep('unavailable'));
  }, [stripePromise]);

  useEffect(() => {
    setStep('pay');
  }, [plan.tier, period]);

  useEffect(() => {
    onLock?.(step === 'confirming' || step === 'done' || step === 'slow');
  }, [step]);

  // Never trust the client alone: wait until the webhook stored it. During
  // the free trial the saved card and the plan are put on the trial first.
  const keepTrial = !!session?.trialEnd;
  const onPaid = useCallback(
    async (sessionId: string) => {
      setStep('confirming');
      if (keepTrial) {
        const res = await fetch('/billing/trial/plan', {
          method: 'POST',
          body: JSON.stringify({ session: sessionId }),
        });
        const data = res.ok ? await res.json() : { failed: true };
        if (data.ended) {
          // the trial ended meanwhile: the next try is a regular checkout
          toaster.show(
            t(
              'tdw_trial_ended_meanwhile',
              'Your free trial has ended. Enter your card again to subscribe.'
            ),
            'warning'
          );
          await mutate('/user/self');
          renewSession(undefined);
          setStep('pay');
          return;
        }
        if (data.failed || !data.check) {
          setStep('failed');
          return;
        }
      }
      setStep(await waitForSubscription(fetch, check.current));
    },
    [keepTrial]
  );

  // Only now: refreshing /user/self ends the paywall
  const finish = useCallback(async () => {
    await mutate('/user/self');
    mutate('/user/subscription');
    // the trial banner's "Choose plan" becomes "Manage billing"
    mutate('/billing/trial');
    if (onDone) {
      onDone();
      return;
    }
    router.push('/today');
  }, [onDone]);

  const options = useMemo(
    () =>
      session?.client_secret
        ? {
            clientSecret: session.client_secret,
            elementsOptions: {
              appearance: tadweenAppearance(light),
              fonts: [{ cssSrc: GEIST }],
            },
            // Local currency where Stripe offers it; prices stay USD
            adaptivePricing: { allowed: true },
          }
        : null,
    [session?.client_secret, light]
  );

  const shown: Step =
    step !== 'pay'
      ? step
      : session?.blocked
      ? 'blocked'
      : error
      ? 'unavailable'
      : 'pay';

  return (
    <section
      id="tdw-checkout"
      className="tdw-checkout"
      aria-label={t('tdw_payment', 'Payment')}
    >
      {shown === 'pay' ? (
        <>
          <header className="tdw-checkout-head">
            <h2 className="tdw-checkout-title">
              {t('tdw_payment_details', 'Payment details')}
            </h2>
            <span className="tdw-checkout-secure">
              <Icon name="shield-check" size={14} />
              {t('tdw_trust_stripe', 'Secure payment by Stripe')}
            </span>
          </header>
          {options && stripePromise ? (
            <CheckoutProvider
              key={options.clientSecret}
              stripe={stripePromise}
              options={options}
            >
              <PaymentForm
                plan={plan}
                period={period}
                promo={period === 'MONTHLY'}
                trialEnd={session?.trialEnd}
                onPaid={onPaid}
              />
            </CheckoutProvider>
          ) : (
            <Skeleton height={236} radius={12} />
          )}
        </>
      ) : shown === 'confirming' ? (
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
      ) : shown === 'done' ? (
        <div className="tdw-checkout-state is-done" role="status">
          <span className="tdw-checkout-mark">
            <Icon name="circle-check" size={28} />
          </span>
          <h3>
            {t('tdw_youre_on', 'You’re on {{name}}', { name: plan.name })}
          </h3>
          <p>
            {keepTrial && session?.trialEnd
              ? t(
                  'tdw_youre_on_keep_trial',
                  'Your free trial continues. Stripe charges your card when it ends, on {{date}}.',
                  {
                    date: formatDate(
                      new Date(session.trialEnd).getTime() / 1000
                    ),
                    interpolation: { escapeValue: false },
                  }
                )
              : trialDays > 0
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
            iconEnd="arrow-right"
            onClick={finish}
          >
            {t('tdw_get_started', 'Get started')}
          </Button>
        </div>
      ) : shown === 'failed' ? (
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
          <Button
            variant="primary"
            onClick={() => {
              // the refused session is complete: the next try needs a new one
              renewSession(undefined);
              setStep('pay');
            }}
          >
            {t('tdw_try_again', 'Try again')}
          </Button>
        </div>
      ) : shown === 'slow' ? (
        <div className="tdw-checkout-state" role="status">
          <span className="tdw-checkout-mark">
            <Icon name="clock" size={28} />
          </span>
          <h3>{t('tdw_payment_received', 'Payment received')}</h3>
          <p>
            {t(
              'tdw_payment_received_page_desc',
              'We are still activating your plan. It will appear in a minute.'
            )}
          </p>
          <Button variant="secondary" onClick={finish}>
            {t('tdw_continue', 'Continue')}
          </Button>
        </div>
      ) : shown === 'unavailable' ? (
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
    </section>
  );
};
