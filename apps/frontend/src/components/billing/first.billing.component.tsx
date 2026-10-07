'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import dynamic from 'next/dynamic';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { useTadweenPricing } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { capitalize } from 'lodash';
import {
  FAQComponent,
  FAQSection,
} from '@gitroom/frontend/components/billing/faq.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import useCookie from 'react-use-cookie';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { DeveloperIconComponent } from '@gitroom/frontend/components/developer/developer.icon.component';
import {
  Button,
  Icon,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import {
  BillingPeriod,
  formatUsd,
  monthlyEquivalent,
  PeriodToggle,
  useTierMeta,
} from '@gitroom/frontend/components/tadween/billing/pricing';
import { PaymentFormSkeleton } from '@gitroom/frontend/components/tadween/billing/billing.skeleton';

const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

const EmbeddedBilling = dynamic(
  () =>
    import('@gitroom/frontend/components/billing/embedded.billing').then(
      (mod) => mod.EmbeddedBilling
    ),
  {
    ssr: false,
  }
);

export const FirstBillingComponent = () => {
  const { stripeClient } = useVariables();
  const user = useUser();
  const dub = useDubClickId();
  const [stripe, setStripe] = useState<null | Promise<Stripe>>(null);
  const [stripeFailed, setStripeFailed] = useState(false);
  const [tier, setTier] = useState('STANDARD');
  const [period, setPeriod] = useState('MONTHLY');
  const fetch = useFetch();
  const { mutate } = useSWRConfig();
  const modals = useModals();
  const t = useT();
  const [datafast_visitor_id] = useCookie('datafast_visitor_id', '');
  const [datafast_session_id] = useCookie('datafast_session_id', '');
  // Tadween: plans from /admin (falls back to Postiz's pricing map)
  const { visible, nameFor, hasPlans, plans, planFor } = useTadweenPricing();
  const tierMeta = useTierMeta();
  useEffect(() => {
    if (hasPlans && !planFor(tier)) {
      setTier(plans[0].tier);
    }
  }, [hasPlans]);

  useEffect(() => {
    const stripePromise = loadStripe(stripeClient);
    stripePromise.catch(() => setStripeFailed(true));
    setStripe(stripePromise);
  }, []);

  const loadCheckout = useCallback(async () => {
    return (
      await fetch('/billing/embedded', {
        method: 'POST',
        body: JSON.stringify({
          billing: tier,
          period: period,
          ...(datafast_visitor_id && datafast_session_id
            ? { datafast_visitor_id, datafast_session_id }
            : {}),
          ...(dub ? { dub } : {}),
        }),
      })
    ).json();
  }, [tier, period]);

  const showYouTube = () => {
    modals.openModal({
      title: t('tdw_see_how_it_works', 'See how it works'),
      children: (
        <iframe
          className="h-full aspect-video min-w-[800px] mobile:min-w-0 mobile:w-full"
          src="https://www.youtube.com/embed/BdsCVvEYgHU?si=vvhaZJ8I5oXXvVJS?autoplay=1"
          title={t('tdw_tutorial', 'Tutorial')}
          allow="autoplay"
          allowFullScreen
        />
      ),
    });
  };

  const { data, isLoading } = useSWR(
    `/billing-${tier}-${period}`,
    loadCheckout,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
    }
  );

  useEffect(() => {
    if (data?.blocked) {
      mutate('/user/self');
    }
  }, [data?.blocked, mutate]);

  const price = useMemo(() => visible(false), [visible]);

  // Tadween: design-system presentation; data, Stripe and checkout are Postiz's
  const save = tierMeta.save;
  const notice = (text: string) => (
    <div className="tdw-paywall-notice" role="status">
      <Icon name="triangle-alert" />
      <div>{text}</div>
    </div>
  );

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
          <AttachToFeedbackIcon />
          <DeveloperIconComponent />
          {/*<NotificationComponent />*/}
          <div className="hover:text-newTextColor">
            {user?.tier.current === 'FREE' && <LogoutComponent isIcon={true} />}
          </div>
        </div>
      </header>
      <main className="tdw-paywall-main">
        <div className="tdw-paywall-hero" style={{ gridColumn: '1 / -1' }}>
          <h1>
            {t('tdw_paywall_title', 'Plan your LinkedIn week with Tadween')}
          </h1>
          <p>
            {t(
              'tdw_paywall_lead',
              'Schedule posts for your profile and the company pages you manage, and publish on time.'
            )}
          </p>
          <div className="flex flex-wrap items-center gap-[16px]">
            {!!user?.allowTrial && (
              <ul className="tdw-paywall-checks">
                <li>
                  <Icon name="check" />
                  {t('tdw_trial_7_days', '7-day free trial')}
                </li>
                <li>
                  <Icon name="check" />
                  {t('tdw_pay_nothing_today', 'Pay nothing today')}
                </li>
                <li>
                  <Icon name="check" />
                  {t('tdw_cancel_from_settings', 'Cancel any time from settings')}
                </li>
              </ul>
            )}
            <Button variant="ghost" size="sm" icon="play" onClick={showYouTube}>
              {t('tdw_see_how_it_works', 'See how it works')}
            </Button>
          </div>
        </div>
        <section className="tdw-paywall-pane">
          {data?.blocked ? (
            notice(
              t(
                'billing_other_account_subscribed',
                'Another account with this email already has an active subscription. Please log off and sign in to that account to manage your subscription.'
              )
            )
          ) : stripeFailed ? (
            notice(
              t(
                'billing_stripe_load_failed',
                'The payment form could not be loaded. Please disable ad blockers or privacy extensions for this page and reload.'
              )
            )
          ) : !isLoading && data && stripe ? (
            <EmbeddedBilling
              stripe={stripe}
              secret={data.client_secret}
              showCoupon={period === 'MONTHLY'}
              autoApplyCoupon={data.auto_apply_coupon}
            />
          ) : (
            <PaymentFormSkeleton />
          )}
        </section>
        <aside className="tdw-paywall-side">
          <div className="sticky">
            <div className="flex flex-wrap items-center justify-between gap-[12px]">
              <h2 className="title-2 m-0">
                {t('tdw_choose_a_plan', 'Choose a plan')}
              </h2>
              <PeriodToggle
                value={period as BillingPeriod}
                onChange={setPeriod}
                save={save}
              />
            </div>
            <div
              className="tdw-paywall-plans"
              role="radiogroup"
              aria-label={t('tdw_plan', 'Plan')}
            >
              {price.map(([key, value]) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={key === tier}
                  onClick={() => setTier(key)}
                  key={key}
                  className="tdw-plan-pick"
                >
                  <span className="name">
                    {nameFor(key, tierMeta.name(key) || capitalize(key))}
                  </span>
                  {tierMeta.popular(key) ? (
                    <span className="pz-plan-flag">
                      {t('tdw_most_popular', 'Most popular')}
                    </span>
                  ) : null}
                  <span key={period} className="price">
                    {formatUsd(
                      monthlyEquivalent(value, period as BillingPeriod)
                    )}{' '}
                    <span className="per">{t('tdw_per_month', '/ month')}</span>
                  </span>
                  <span className="caption pz-muted">
                    {period === 'YEARLY'
                      ? t('tdw_billed_yearly', 'Billed {{amount}} yearly', {
                          amount: formatUsd(value.year_price),
                        })
                      : t('tdw_billed_monthly', 'Billed monthly')}
                  </span>
                </button>
              ))}
            </div>
            <div className="grid gap-[12px]">
              <h3 className="headline m-0">
                {t('tdw_whats_included', 'What’s included')}
              </h3>
              <BillingFeatures tier={tier} />
            </div>
            <div className="pz-faq mobile:hidden tablet:hidden">
              <FAQComponent />
            </div>
          </div>
        </aside>
      </main>
    </TadweenScope>
  );
};

type FeatureItem = {
  key: string;
  defaultValue: string;
  prefix?: string | number;
};

export const BillingFeatures: FC<{ tier: string }> = ({ tier }) => {
  const t = useT();
  const { pricing, planFor } = useTadweenPricing();
  const features = useMemo(() => {
    // Tadween: a plan's own bullets replace the generated list
    const planFeatures = planFor(tier)?.features || [];
    if (planFeatures.length) {
      return planFeatures.map((f) => ({ key: f, defaultValue: f }));
    }
    const currentPricing = pricing[tier];
    const channelsOr = currentPricing.channel;
    const list: FeatureItem[] = [];

    list.push({
      key: channelsOr === 1 ? 'billing_channel' : 'billing_channels',
      defaultValue: channelsOr === 1 ? 'channel' : 'channels',
      prefix: channelsOr,
    });

    list.push({
      key: 'billing_posts_per_month',
      defaultValue: 'posts per month',
      prefix:
        currentPricing.posts_per_month > 10000
          ? 'unlimited'
          : currentPricing.posts_per_month,
    });

    if (currentPricing.team_members) {
      list.push({
        key: 'billing_unlimited_team_members',
        defaultValue: 'Unlimited team members',
      });
    }
    if (currentPricing?.ai) {
      list.push({
        key: 'billing_ai_auto_complete',
        defaultValue: 'AI auto-complete',
      });
      list.push({ key: 'billing_ai_copilots', defaultValue: 'AI copilots' });
      list.push({
        key: 'billing_ai_autocomplete',
        defaultValue: 'AI Autocomplete',
      });
    }
    list.push({
      key: 'billing_advanced_picture_editor',
      defaultValue: 'Advanced Picture Editor',
    });
    if (currentPricing?.image_generator) {
      list.push({
        key: 'billing_ai_images_per_month',
        defaultValue: 'AI Images per month',
        prefix: currentPricing?.image_generation_count,
      });
    }
    if (currentPricing?.generate_videos) {
      list.push({
        key: 'billing_ai_videos_per_month',
        defaultValue: 'AI Videos per month',
        prefix: currentPricing?.generate_videos,
      });
    }
    if (currentPricing?.clipping_minutes) {
      list.push({
        key: 'billing_clipping_minutes_per_month',
        defaultValue: 'minutes of AI video clipping per month',
        prefix: currentPricing?.clipping_minutes,
      });
    }
    return list;
  }, [tier, pricing, planFor]);

  const renderFeature = (feature: FeatureItem) => {
    const translatedText = t(feature.key, feature.defaultValue);
    if (feature.prefix === 'unlimited') {
      return `${t('billing_unlimited', 'Unlimited')} ${translatedText}`;
    }
    if (feature.prefix !== undefined) {
      return `${feature.prefix} ${translatedText}`;
    }
    return translatedText;
  };

  return (
    <ul className="pz-plan-list grid-cols-2 mobile:grid-cols-1" style={{ columnGap: 24 }}>
      {features.map((feature) => (
        <li key={feature.key}>
          <Icon name="check" />
          {renderFeature(feature)}
        </li>
      ))}
    </ul>
  );
};
