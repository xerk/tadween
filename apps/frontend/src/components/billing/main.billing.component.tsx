'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Subscription } from '@prisma/client';
import { useDebouncedCallback } from 'use-debounce';
import { useToaster } from '@gitroom/react/toaster/toaster';
import dayjs from 'dayjs';
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
  CheckList,
  CompareTable,
  formatUsd,
  PeriodToggle,
  TierCard,
  useTierMeta,
} from '@gitroom/frontend/components/tadween/billing/pricing';
import { CurrentPlanCard } from '@gitroom/frontend/components/tadween/billing/current.plan';
import {
  ChangePlanDialog,
  useBillingDialogs,
} from '@gitroom/frontend/components/tadween/billing/billing.dialogs';
import { useUtmUrl } from '@gitroom/helpers/utils/utm.saver';
import { useTrack } from '@gitroom/react/helpers/use.track';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { FinishTrial } from '@gitroom/frontend/components/billing/finish.trial';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';

type SubscriptionWithPlatform = Subscription & {
  platform?: 'web' | 'mobile';
};

export const Prorate: FC<{
  period: 'MONTHLY' | 'YEARLY';
  pack: 'STANDARD' | 'PRO';
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
export const Features: FC<{
  pack: 'FREE' | 'STANDARD' | 'PRO';
}> = (props) => {
  const { pack } = props;
  // Tadween: plans from /admin overlay the pricing map; their bullets win
  const { pricing, planFor } = useTadweenPricing();
  const features = useMemo(() => {
    const planFeatures = planFor(pack)?.features || [];
    if (planFeatures.length) {
      return planFeatures;
    }
    const currentPricing = pricing[pack];
    const channelsOr = currentPricing.channel;
    const list = [];
    list.push(`${channelsOr} ${channelsOr === 1 ? 'channel' : 'channels'}`);
    list.push(
      `${
        currentPricing.posts_per_month > 10000
          ? 'Unlimited'
          : currentPricing.posts_per_month
      } posts per month`
    );
    if (currentPricing.team_members) {
      list.push(`Unlimited team members`);
    }
    if (currentPricing?.ai) {
      list.push(`AI auto-complete`);
      list.push(`AI copilots`);
      list.push(`AI Autocomplete`);
    }
    list.push(`Advanced Picture Editor`);
    if (currentPricing?.image_generator) {
      list.push(
        `${currentPricing?.image_generation_count} AI Images per month`
      );
    }
    if (currentPricing?.generate_videos) {
      list.push(`${currentPricing?.generate_videos} AI Videos per month`);
    }
    if (currentPricing?.clipping_minutes) {
      list.push(
        `${currentPricing?.clipping_minutes} minutes of AI video clipping per month`
      );
    }
    return list;
  }, [pack, pricing, planFor]);
  return <CheckList items={features} />;
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
  const tierMeta = useTierMeta();
  const [changeTo, setChangeTo] = useState<string | null>(null);
  const router = useRouter();
  const utm = useUtmUrl();
  const track = useTrack();
  const t = useT();
  const { pricing, visible } = useTadweenPricing();
  const queryParams = useSearchParams();
  const [finishTrial, setFinishTrial] = useState(
    !!queryParams.get('finishTrial')
  );

  const [subscription, setSubscription] = useState<SubscriptionWithPlatform | undefined>(
    sub
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>(
    subscription?.period || 'MONTHLY'
  );
  const [monthlyOrYearly, setMonthlyOrYearly] = useState<'on' | 'off'>(
    period === 'MONTHLY' ? 'off' : 'on'
  );
  const [initialChannels, setInitialChannels] = useState(
    sub?.totalChannels || 1
  );
  useEffect(() => {
    if (initialChannels !== sub?.totalChannels) {
      setInitialChannels(sub?.totalChannels || 1);
    }
    if (period !== sub?.period) {
      setPeriod(sub?.period || 'MONTHLY');
      setMonthlyOrYearly(
        (sub?.period || 'MONTHLY') === 'MONTHLY' ? 'off' : 'on'
      );
    }
    setSubscription(sub);
  }, [sub]);
  const updatePayment = useCallback(async () => {
    const { portal } = await (await fetch('/billing/portal')).json();
    window.location.href = portal;
  }, []);
  const currentPackage = useMemo(() => {
    if (!subscription) {
      return 'FREE';
    }
    if (period === 'YEARLY' && monthlyOrYearly === 'off') {
      return '';
    }
    if (period === 'MONTHLY' && monthlyOrYearly === 'on') {
      return '';
    }
    return subscription?.subscriptionTier;
  }, [subscription, initialChannels, monthlyOrYearly, period]);
  const moveToCheckout = useCallback(
    (billing: 'STANDARD' | 'PRO' | 'FREE', reactivate = false) =>
      async () => {
        if (reactivate) {
          setLoading(true);
          const { cancel_at } = await (
            await fetch('/billing/cancel', {
              method: 'POST',
              body: JSON.stringify({
                feedback: '',
              }),
              headers: {
                'Content-Type': 'application/json',
              },
            })
          ).json();
          setSubscription((subs) => ({
            ...subs!,
            cancelAt: cancel_at,
          }));

          toast.show('Subscription reactivated successfully');
          setLoading(false);
          return;
        }

        const messages = [];
        if (
          !pricing[billing].team_members &&
          pricing[subscription?.subscriptionTier!]?.team_members
        ) {
          messages.push(
            `Your team members will be removed from your organization`
          );
        }
        if (billing === 'FREE') {
          if (
            subscription?.cancelAt ||
            (await dialogs.confirm({
              title: t('tdw_cancel_subscription_q', 'Cancel your subscription?'),
              description: [
                t(
                  'tdw_cancel_subscription_desc',
                  'Your plan stays active until the end of this billing period.'
                ),
                ...messages,
              ].join(' '),
              confirmLabel: t('tdw_yes_cancel', 'Yes, cancel'),
              cancelLabel: t('tdw_billing_keep_plan', 'Keep my plan'),
              tone: 'destructive',
            }))
          ) {
            // Tadween: reason (20+ characters) first, then the retention offer
            const info = await dialogs.askReason();
            if (info === null) {
              return;
            }

            const checkDiscount = await (
              await fetch('/billing/check-discount')
            ).json();
            if (checkDiscount.offerCoupon) {
              if ((await dialogs.offerDiscount()) !== 'cancel') {
                return;
              }
            }

            events('cancel_subscription');
            setLoading(true);
            const { cancel_at } = await (
              await fetch('/billing/cancel', {
                method: 'POST',
                body: JSON.stringify({
                  feedback: info,
                }),
                headers: {
                  'Content-Type': 'application/json',
                },
              })
            ).json();
            setSubscription((subs) => ({
              ...subs!,
              cancelAt: cancel_at,
            }));
            if (cancel_at)
              toast.show('Subscription set to canceled successfully');
            setLoading(false);
          }
          return;
        }
        if (
          messages.length &&
          !(await dialogs.confirm({
            title: t('tdw_change_plan_q', 'Change your plan?'),
            description: messages.join(' '),
            confirmLabel: t('tdw_yes_continue', 'Yes, continue'),
            tone: 'destructive',
          }))
        ) {
          return;
        }
        setLoading(true);
        const { url, portal, blocked } = await (
          await fetch('/billing/subscribe', {
            method: 'POST',
            body: JSON.stringify({
              period: monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY',
              utm,
              billing,
              ...(dub ? { dub } : {}),
            }),
          })
        ).json();
        if (blocked) {
          setLoading(false);
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
        if (url) {
          await track(TrackEnum.InitiateCheckout, {
            value:
              pricing[billing][
                monthlyOrYearly === 'on' ? 'year_price' : 'month_price'
              ],
          });
          window.location.href = url;
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
        } else {
          setPeriod(monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY');
          setSubscription((subs) => ({
            ...subs!,
            subscriptionTier: billing,
            cancelAt: null,
          }));
          mutate(
            '/user/self',
            {
              ...user,
              tier: billing,
            },
            {
              revalidate: false,
            }
          );
          toast.show('Subscription updated successfully');
        }
        setLoading(false);
      },
    [monthlyOrYearly, subscription, user, utm, pricing]
  );
  if (user?.isLifetime) {
    router.replace('/');
    return null;
  }
  // Tadween: everything below is presentation; the handlers are Postiz's
  const billingPeriod: BillingPeriod =
    monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY';
  const setBillingPeriod = (v: BillingPeriod) =>
    setMonthlyOrYearly(v === 'YEARLY' ? 'on' : 'off');
  const tiers = visible(true).filter((f) => !isGeneral || f[0] !== 'FREE');
  const changeOptions = tiers
    .filter(([name]) => name !== 'FREE' && name !== currentPackage)
    .map(([name, values]) => ({
      value: name,
      label: `${tierMeta.name(name)} · ${formatUsd(
        billingPeriod === 'YEARLY' ? values.year_price / 12 : values.month_price
      )}${t('tdw_per_mo', '/mo')}`,
      description: tierMeta.description(name),
    }));
  const trialEligible =
    // @ts-ignore
    (user?.tier === 'FREE' || user?.tier?.current === 'FREE') &&
    user.allowTrial;
  const footer = (
    <div className="flex justify-center">
      <LogoutComponent />
    </div>
  );
  const faq = (
    <div className="pz-faq">
      <h3 className="title-2">{t('tdw_questions', 'Questions')}</h3>
      <FAQComponent />
    </div>
  );
  if (subscription?.platform && subscription.platform !== 'web') {
    return (
      <TadweenScope className="tdw-billing">
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
        {footer}
      </TadweenScope>
    );
  }
  const ctaFor = (name: string) => {
    const upper = name.toUpperCase();
    const popular = tierMeta.popular(upper);
    if (currentPackage === upper && subscription?.cancelAt) {
      return (
        <Button
          variant="primary"
          loading={loading}
          onClick={moveToCheckout('FREE', true)}
        >
          {t('tdw_reactivate', 'Reactivate subscription')}
        </Button>
      );
    }
    if (currentPackage === upper) {
      return (
        <Button disabled icon="check">
          {t('tdw_your_plan', 'Your plan')}
        </Button>
      );
    }
    if (upper === 'FREE') {
      return (
        <Button
          variant="ghost"
          className="is-danger"
          loading={loading}
          disabled={!!subscription?.cancelAt}
          onClick={moveToCheckout('FREE')}
        >
          {subscription?.cancelAt
            ? t('tdw_downgrades_on', 'Downgrades on {{date}}', {
                date: dayjs
                  .utc(subscription?.cancelAt)
                  .local()
                  .format('D MMM YYYY'),
              })
            : t('tdw_cancel_subscription', 'Cancel subscription')}
        </Button>
      );
    }
    if (subscription) {
      return (
        <Button
          variant={popular ? 'primary' : 'secondary'}
          disabled={loading}
          onClick={() => setChangeTo(upper)}
        >
          {t('tdw_switch_to', 'Switch to {{name}}', {
            name: tierMeta.name(upper),
          })}
        </Button>
      );
    }
    return (
      <Button
        variant={popular ? 'primary' : 'secondary'}
        loading={loading}
        onClick={moveToCheckout(upper as 'STANDARD' | 'PRO')}
      >
        {trialEligible
          ? t('tdw_start_trial', 'Start {{n}}-day trial', {
              n: tierMeta.trialDays(upper),
            })
          : t('tdw_choose_plan_name', 'Choose {{name}}', {
              name: tierMeta.name(upper),
            })}
      </Button>
    );
  };
  return (
    <TadweenScope className="tdw-billing">
      {dialogs.node}
      {finishTrial && <FinishTrial close={() => setFinishTrial(false)} />}
      {!!subscription && user?.isTrailing && !subscription.cancelAt && (
        <Banner
          tone="info"
          icon="clock"
          title={t('tdw_on_trial', 'You are on a free trial.')}
        >
          {t(
            'tdw_on_trial_desc',
            'You will not be charged until it ends. Cancel any time from this page.'
          )}
        </Banner>
      )}
      {subscription?.cancelAt && isGeneral && (
        <Banner
          tone="warning"
          title={`${t(
            'your_subscription_will_be_canceled_at',
            'Your subscription will be canceled at'
          )} ${newDayjs(subscription.cancelAt).local().format('D MMM YYYY')}.`}
        >
          {t(
            'you_will_never_be_charged_again',
            'You will never be charged again'
          )}
        </Banner>
      )}
      {!!subscription && !!pricing[subscription.subscriptionTier] && (
        <CurrentPlanCard
          tier={subscription.subscriptionTier}
          values={pricing[subscription.subscriptionTier]}
          period={period}
          trial={!!user?.isTrailing}
          cancelAt={subscription.cancelAt}
          actions={
            <>
              {subscription.cancelAt ? (
                <Button
                  variant="primary"
                  loading={loading}
                  onClick={moveToCheckout('FREE', true)}
                >
                  {t('tdw_reactivate', 'Reactivate subscription')}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={loading || !changeOptions.length}
                  onClick={() => setChangeTo(changeOptions[0]?.value || null)}
                >
                  {t('tdw_change_plan', 'Change plan')}
                </Button>
              )}
              {!!subscription.id && (
                <Button variant="ghost" icon="credit-card" onClick={updatePayment}>
                  {t('tdw_update_card_invoices', 'Payment method and invoices')}
                </Button>
              )}
              <span className="grow" />
              {isGeneral && !subscription.cancelAt && (
                <Button
                  variant="ghost"
                  className="is-danger"
                  loading={loading}
                  onClick={moveToCheckout('FREE')}
                >
                  {t('tdw_cancel_subscription', 'Cancel subscription')}
                </Button>
              )}
            </>
          }
        />
      )}
      <div className="pz-pricing">
        <div className="tdw-billing-head">
          <div>
            <h1 className="title-1">
              {subscription
                ? t('tdw_plans', 'Plans')
                : t('tdw_choose_a_plan', 'Choose a plan')}
            </h1>
            <p>
              {trialEligible
                ? t(
                    'tdw_plans_trial_lead',
                    'Every plan starts with a 7-day free trial. Cancel any time.'
                  )
                : t(
                    'tdw_plans_lead',
                    'Prices in USD. Change or cancel any time from this page.'
                  )}
            </p>
          </div>
          <PeriodToggle
            value={billingPeriod}
            onChange={setBillingPeriod}
            save={tierMeta.save}
          />
        </div>
        <div
          className="pz-tiers"
          style={{
            gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))`,
          }}
        >
          {tiers.map(([name, values]) => (
            <TierCard
              key={name}
              tier={name}
              values={values}
              period={billingPeriod}
              current={currentPackage === name.toUpperCase()}
              cta={ctaFor(name)}
              note={
                subscription &&
                currentPackage !== name.toUpperCase() &&
                name !== 'FREE' &&
                !!name ? (
                  <Prorate
                    period={billingPeriod}
                    pack={name.toUpperCase() as 'STANDARD' | 'PRO'}
                  />
                ) : null
              }
              features={
                <Features
                  pack={name.toUpperCase() as 'FREE' | 'STANDARD' | 'PRO'}
                />
              }
            />
          ))}
        </div>
        <CompareTable tiers={tiers} period={billingPeriod} />
        {faq}
      </div>
      {footer}
      <ChangePlanDialog
        open={!!changeTo}
        onClose={() => setChangeTo(null)}
        options={changeOptions}
        value={changeTo || ''}
        onChange={setChangeTo}
        period={
          <PeriodToggle
            value={billingPeriod}
            onChange={setBillingPeriod}
            save={tierMeta.save}
          />
        }
        payToday={
          changeTo && changeTo !== currentPackage ? (
            <Prorate
              period={billingPeriod}
              pack={changeTo as 'STANDARD' | 'PRO'}
            />
          ) : null
        }
        loading={loading}
        onConfirm={() => {
          const target = changeTo;
          setChangeTo(null);
          if (target) {
            moveToCheckout(target as 'STANDARD' | 'PRO')();
          }
        }}
      />
    </TadweenScope>
  );
};
