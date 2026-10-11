'use client';

// AI credits: the workspace's balance (monthly allowance + purchased top-ups),
// the card on Billing, the small "credits left" indicator used next to AI
// actions, and the top-up drawer (Stripe Embedded Checkout, one-time payment).
// Purchased credits are credited by the webhook; the drawer waits for it.
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import {
  Button,
  cx,
  Drawer,
  Icon,
  RadioGroup,
  Skeleton,
  Spinner,
  UsageMeter,
} from '@gitroom/frontend/components/tadween/ui';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';

export interface AiCreditPack {
  id: string;
  credits: number;
  // USD cents
  amount: number;
}

export interface AiCredits {
  limit: number;
  used: number;
  monthlyLeft: number;
  purchased: number;
  available: number;
  resetsAt: string;
  costs: { write: number; agent_message: number; image: number };
  packs: AiCreditPack[];
}

// Plans store "unlimited" as a very large allowance
const UNLIMITED = 1000000;

export const useAiCredits = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(path);
    }
    return res.json();
  }, []);
  return useSWR<AiCredits>('/billing/ai-credits', load, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
};

const useNumber = () => {
  const t = useT();
  return (n: number) =>
    n >= UNLIMITED
      ? t('tdw_unlimited', 'Unlimited')
      : new Intl.NumberFormat(
          typeof document === 'undefined'
            ? undefined
            : document.documentElement.lang || undefined
        ).format(n);
};

// A compact "N AI credits left" chip for the places AI is used
export const AiCreditsBadge: FC<{ className?: string }> = ({ className }) => {
  const t = useT();
  const number = useNumber();
  const { data } = useAiCredits();
  if (!data) {
    return null;
  }
  const out = data.available <= 0;
  // Its own kit scope: the badge also sits in Postiz screens (composer media bar)
  return (
    <span className={cx('tdw-ui tdw-credits-badge-scope', className)}>
      <Link
        href={out ? '/billing?credits=1' : '/billing'}
        className={cx('tdw-credits-badge', out && 'is-out')}
        title={t(
          'tdw_ai_credits_badge_title',
          'Monthly credits left plus purchased credits'
        )}
      >
        <Icon name="sparkles" size={14} />
        {out
          ? t('tdw_ai_credits_out', 'No AI credits left')
          : t('tdw_ai_credits_left', '{{n}} AI credits left', {
              n: number(data.available),
            })}
      </Link>
    </span>
  );
};

export const AiCreditsCard: FC<{ onBuy: () => void }> = ({ onBuy }) => {
  const t = useT();
  const number = useNumber();
  const { data } = useAiCredits();
  return (
    <section className="tdw-credits">
      <div className="tdw-credits-head">
        <div className="min-w-0">
          <h2 className="tdw-credits-title">
            {t('tdw_ai_credits', 'AI credits')}
          </h2>
          <p className="tdw-credits-lead">
            {t(
              'tdw_ai_credits_lead',
              'Writing, the AI agent and images use credits. Your plan’s credits renew every month; credits you buy never expire and are used after them.'
            )}
          </p>
        </div>
        <Button variant="primary" icon="plus" onClick={onBuy}>
          {t('tdw_buy_credits', 'Buy credits')}
        </Button>
      </div>
      {!data ? (
        <div className="grid gap-[8px]">
          <Skeleton width="60%" />
          <Skeleton height={4} />
        </div>
      ) : (
        <div className="tdw-credits-body">
          <UsageMeter
            label={t('tdw_ai_credits_month', 'Plan credits this month')}
            used={data.used}
            limit={data.limit >= UNLIMITED ? -1 : data.limit}
            hint={t('tdw_ai_credits_resets', 'Renews {{date}}', {
              date: newDayjs(data.resetsAt).local().format('D MMM YYYY'),
            })}
          />
          <div className="tdw-credits-stat">
            <span className="tdw-credits-stat-label">
              {t('tdw_ai_credits_purchased', 'Purchased credits')}
            </span>
            <span className="tdw-credits-stat-value">
              {number(data.purchased)}
            </span>
            <span className="caption pz-muted">
              {t('tdw_ai_credits_never_expire', 'Never expire')}
            </span>
          </div>
          <div className="tdw-credits-stat">
            <span className="tdw-credits-stat-label">
              {t('tdw_ai_credits_available', 'Available now')}
            </span>
            <span className="tdw-credits-stat-value">
              {number(data.available)}
            </span>
          </div>
        </div>
      )}
      {data ? (
        <ul className="tdw-credits-costs">
          <li>
            {t('tdw_ai_cost_write', 'Write or rewrite a post: {{n}}', {
              n: data.costs.write,
            })}
          </li>
          <li>
            {t('tdw_ai_cost_agent', 'Agent message: {{n}}', {
              n: data.costs.agent_message,
            })}
          </li>
          <li>
            {t('tdw_ai_cost_image', 'Image: {{n}}', { n: data.costs.image })}
          </li>
        </ul>
      ) : null}
    </section>
  );
};

type Step = 'choose' | 'pay' | 'confirming' | 'done' | 'slow' | 'unavailable';

// Poll for the webhook for up to ~45 seconds, like the subscription checkout
const POLL_MS = 1500;
const POLL_TRIES = 30;

export const BuyCreditsDrawer: FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const t = useT();
  const fetch = useFetch();
  const number = useNumber();
  const { data, mutate } = useAiCredits();
  const { stripeClient } = useVariables();
  const stripePromise = useMemo(
    () => (stripeClient ? loadStripe(stripeClient) : null),
    [stripeClient]
  );
  const packs = data?.packs || [];
  const [pack, setPack] = useState('');
  const [step, setStep] = useState<Step>('choose');
  const [check, setCheck] = useState('');
  const chosen = packs.find((p) => p.id === pack);

  useEffect(() => {
    if (open) {
      setStep('choose');
      setCheck('');
      setPack((current) => current || packs[1]?.id || packs[0]?.id || '');
      stripePromise?.catch(() => setStep('unavailable'));
    }
  }, [open, packs.length]);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch('/billing/ai-credits', {
      method: 'POST',
      body: JSON.stringify({ pack }),
    });
    const body = await res.json();
    if (!res.ok || !body.client_secret) {
      setStep('unavailable');
      throw new Error('checkout');
    }
    setCheck(body.check);
    return body.client_secret as string;
  }, [pack]);

  const onComplete = useCallback(async () => {
    setStep('confirming');
  }, []);

  // Never trust the client callback alone: wait until the webhook stored it
  useEffect(() => {
    if (step !== 'confirming' || !check) {
      return;
    }
    let cancelled = false;
    (async () => {
      for (let i = 0; i < POLL_TRIES && !cancelled; i++) {
        const { done } = await (
          await fetch(`/billing/ai-credits/${check}`)
        ).json();
        if (done) {
          await mutate();
          if (!cancelled) setStep('done');
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (!cancelled) setStep('slow');
    })();
    return () => {
      cancelled = true;
    };
  }, [step, check]);

  const options = useMemo(
    () => ({ fetchClientSecret, onComplete }),
    [fetchClientSecret, onComplete]
  );

  const close = () => {
    if (step === 'done' || step === 'slow') {
      mutate();
    }
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={step === 'confirming' ? () => {} : close}
      size="lg"
      title={t('tdw_buy_ai_credits', 'Buy AI credits')}
      description={t(
        'tdw_buy_ai_credits_desc',
        'A one-time payment. Purchased credits never expire and are used after your plan’s monthly credits.'
      )}
      footer={
        step === 'choose' ? (
          <>
            <span className="flex-1" />
            <Button variant="ghost" onClick={close}>
              {t('tdw_cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={!chosen}
              onClick={() => setStep('pay')}
            >
              {chosen
                ? t('tdw_pay_amount', 'Pay {{amount}}', {
                    amount: formatUsd(chosen.amount / 100),
                  })
                : t('tdw_continue', 'Continue')}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="tdw-checkout">
        {step === 'choose' ? (
          <RadioGroup
            label={t('tdw_ai_credit_pack', 'Credit pack')}
            value={pack}
            onChange={setPack}
            options={packs.map((p) => ({
              value: p.id,
              icon: 'sparkles' as const,
              label: t('tdw_n_credits', '{{n}} credits', {
                n: number(p.credits),
              }),
              description: formatUsd(p.amount / 100),
            }))}
          />
        ) : step === 'pay' && chosen ? (
          <>
            <section className="tdw-order">
              <div className="tdw-order-head">
                <h3 className="tdw-order-name">
                  {t('tdw_n_ai_credits', '{{n}} AI credits', {
                    n: number(chosen.credits),
                  })}
                </h3>
                <div className="tdw-order-price">
                  <span className="tdw-order-amount">
                    {formatUsd(chosen.amount / 100)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="tdw-order-more"
                onClick={() => setStep('choose')}
              >
                {t('tdw_change_pack', 'Change pack')}
              </button>
            </section>
            <div className="tdw-checkout-stripe">
              {stripePromise ? (
                <EmbeddedCheckoutProvider
                  key={chosen.id}
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
            <h3>{t('tdw_adding_credits', 'Adding your credits…')}</h3>
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
              {t('tdw_credits_added', '{{n}} credits added', {
                n: number(chosen?.credits || 0),
              })}
            </h3>
            <p>
              {t('tdw_credits_added_desc', 'You now have {{n}} AI credits.', {
                n: number(data?.available || 0),
              })}
            </p>
            <Button variant="primary" onClick={close}>
              {t('tdw_done', 'Done')}
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
                'tdw_credits_slow_desc',
                'We are still adding your credits. They will appear in a minute; you can close this window.'
              )}
            </p>
            <Button variant="secondary" onClick={close}>
              {t('tdw_close', 'Close')}
            </Button>
          </div>
        ) : (
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
        )}
      </div>
    </Drawer>
  );
};
