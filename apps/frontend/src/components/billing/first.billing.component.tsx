'use client';

// Postiz's first billing screen: what a new workspace sees right after
// sign-up, in place of the app, before the onboarding modal. One page: the
// plan picker (tier, Monthly/Yearly, features) next to Stripe's payment form,
// which follows the picked plan in place. Tadween differences:
//   · the free trial already started at sign-up (no card). While it runs,
//     paying saves a card for that same trial (/billing/trial/plan keeps its
//     end) and a quiet "Maybe later" goes on without one.
//   · a workspace that can still try but has no trial yet can start it
//     without a card ("Maybe later" → POST /billing/trial).
//   · once the trial has ended there is no way around a plan, as Postiz.
import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import i18next from 'i18next';
import useCookie from 'react-use-cookie';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  cookieName,
  fallbackLng,
  languages,
} from '@gitroom/react/translation/i18n.config';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { embedUrl } from '@gitroom/frontend/components/onboarding/onboarding.modal';
import {
  PublicPlan,
  useBrandLinks,
  useTadweenPricing,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';
import {
  Button,
  cx,
  Icon,
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import {
  BillingPeriod,
  formatUsd,
  PeriodToggle,
} from '@gitroom/frontend/components/tadween/billing/pricing';
import {
  FounderNote,
  PlanFeatureList,
  planPrice,
} from '@gitroom/frontend/components/tadween/billing/plans.view';
import {
  isOnFreeTrial,
  useTrialInfo,
} from '@gitroom/frontend/components/tadween/billing/trial.banner';
import {
  CheckoutPanel,
  waitForSubscription,
} from '@gitroom/frontend/components/tadween/billing/checkout.panel';

const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

const STORAGE_KEY = 'tdw_first_billing';

const readDismissed = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  } catch (e) {
    return '';
  }
};

/* Whether the first billing screen takes the place of the app, as Postiz's
   LayoutComponent decides it (a workspace without a plan), plus Tadween's
   sign-up case: after sign-up (`?onboarding=true`) an admin whose free trial
   runs without a card sees it first, until they pay or choose "Maybe later"
   (kept for the tab, so a channel's OAuth return doesn't bring it back). */
export const useFirstBilling = (
  // /user/self: LayoutComponent decides this before the user context exists
  user:
    | {
        id?: string;
        role?: string;
        allowTrial?: boolean;
        subscriptionStatus?: string | null;
      }
    | undefined,
  needsPlan: boolean
) => {
  const params = useSearchParams();
  const { mutate } = useSWRConfig();
  const requested = params.get('onboarding') === 'true';
  const manages = ['ADMIN', 'SUPERADMIN'].includes(user?.role || '');
  const asked = requested && manages && isOnFreeTrial(user) && !needsPlan;
  const { data: trial, error } = useTrialInfo(asked);
  const [dismissed, setDismissed] = useState<string | null>(null);
  // Right after sign-up the trial's subscription is still on its way
  // (Stripe's webhook): look again for a few seconds before deciding
  const [waited, setWaited] = useState(0);
  const starting = requested && needsPlan && !!user?.allowTrial && waited < 5;
  useEffect(() => {
    if (!starting) {
      return;
    }
    const timer = setTimeout(() => {
      mutate('/user/self');
      setWaited((n) => n + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [starting, waited]);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, user?.id || '');
    } catch (e) {
      // private mode: it just shows again after a reload
    }
    setDismissed(user?.id || '');
  }, [user?.id]);

  const offered =
    asked && !!trial && !trial.hasPaymentMethod && dismissed !== user?.id;
  return {
    // decide nothing before the trial's state is in
    ready: dismissed !== null && !starting && (!asked || !!trial || !!error),
    show: needsPlan || offered,
    // after sign-up: what the first load most likely shows
    requested,
    dismiss,
  };
};

// Native name of a language ("العربية", "English")
const languageName = (code: string) => {
  try {
    return (
      new Intl.DisplayNames([code.replace('_', '-')], { type: 'language' }).of(
        code.replace('_', '-')
      ) || code
    );
  } catch (e) {
    return code;
  }
};

/* English ⇄ العربية, applied at once like Settings → Preferences → Language */
const LanguageSwitch: FC = () => {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || fallbackLng;
  const [, setCookie] = useCookie(cookieName, current);
  const other = current === 'ar' ? 'en' : 'ar';
  if (!languages.includes(other)) {
    return null;
  }
  const change = () => {
    setCookie(other);
    i18next.changeLanguage(other);
    document.documentElement.setAttribute('dir', i18next.dir(other));
    document.documentElement.setAttribute('lang', other);
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      icon="globe"
      lang={other}
      onClick={change}
    >
      {languageName(other)}
    </Button>
  );
};

/* Step one of the page: which plan. Postiz's tier cards (name and price),
   one tap each, as a radio group */
const TierPicker: FC<{
  plans: PublicPlan[];
  tier: string;
  period: BillingPeriod;
  disabled: boolean;
  onChange: (tier: string) => void;
}> = ({ plans, tier, period, disabled, onChange }) => {
  const t = useT();
  return (
    <div
      className="tdw-tiers"
      role="radiogroup"
      aria-label={t('billing_choose_plan', 'Choose a Plan')}
      data-count={plans.length}
    >
      {plans.map((plan) => (
        <button
          key={plan.key}
          type="button"
          role="radio"
          aria-checked={plan.tier === tier}
          disabled={disabled}
          className={cx('tdw-tier', plan.tier === tier && 'is-on')}
          onClick={() => onChange(plan.tier)}
        >
          <span className="tdw-tier-top">
            <span className="tdw-tier-name">{plan.name}</span>
            {plan.mostPopular ? (
              <span className="tdw-tier-flag">
                {t('tdw_most_popular', 'Most popular')}
              </span>
            ) : null}
          </span>
          <span className="tdw-tier-price">
            <span key={period} className="tdw-tier-amount">
              {formatUsd(planPrice(plan, period))}
            </span>
            <span className="tdw-tier-per">
              {t('tdw_per_month', '/ month')}
            </span>
          </span>
          {plan.founderPrice ? (
            <FounderNote plan={plan} period={period} compact inline />
          ) : null}
        </button>
      ))}
    </div>
  );
};

/* The one-page checkout, shared by the first billing screen and Billing (a
   workspace without a paid plan): the plan picker (Monthly/Yearly, tiers,
   features) beside Stripe's payment form, which follows the pick in place.
   Phones stack them, plan first, with a bar that leads to the payment while
   it is out of view. */
export const PlanCheckout: FC<{
  // above the picker (the first billing screen's headline)
  intro?: ReactNode;
  // under the features (the questions)
  after?: ReactNode;
  // under the payment form ("Maybe later"); hidden once the payment is sent
  aside?: ReactNode;
  initialTier?: string | null;
  initialPeriod?: BillingPeriod;
  onDone?: () => void;
}> = ({ intro, after, aside, initialTier, initialPeriod, onDone }) => {
  const t = useT();
  const { plans } = useTadweenPricing();
  const featured = plans.find((p) => p.mostPopular) || plans[0];
  const [period, setPeriod] = useState<BillingPeriod>(
    initialPeriod || 'MONTHLY'
  );
  const [picked, setPicked] = useState<string | null>(initialTier || null);
  // From the moment Stripe confirmed the payment, the choice stays as paid
  const [locked, setLocked] = useState(false);
  const pay = useRef<HTMLDivElement>(null);
  const [payInView, setPayInView] = useState(true);
  const plan = plans.find((p) => p.tier === picked) || featured;

  useEffect(() => {
    const el = pay.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setPayInView(entry.isIntersecting),
      { rootMargin: '0px 0px -25% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [plans.length]);

  return (
    <div className="tdw-fb-body">
      <section className="tdw-fb-plans">
        {intro}
        <div className="tdw-fb-choose">
          <h2 className="tdw-fb-h2">
            {t('billing_choose_plan', 'Choose a Plan')}
          </h2>
          <span inert={locked || undefined}>
            <PeriodToggle
              value={period}
              onChange={setPeriod}
              save={plans[0]?.yearlyDiscountPercent ?? 0}
            />
          </span>
        </div>
        {plan ? (
          <>
            <TierPicker
              plans={plans}
              tier={plan.tier}
              period={period}
              disabled={locked}
              onChange={setPicked}
            />
            <div className="tdw-fb-features">
              <h2 className="tdw-fb-h2">
                {t('billing_features', 'Features')}
              </h2>
              <FounderNote plan={plan} period={period} />
              <PlanFeatureList plan={plan} all />
            </div>
          </>
        ) : (
          <div className="tdw-tiers" aria-busy="true">
            <Skeleton height={104} radius={16} />
            <Skeleton height={104} radius={16} />
            <Skeleton height={104} radius={16} />
          </div>
        )}
        {after}
      </section>

      <aside ref={pay} className="tdw-fb-pay">
        {plan ? (
          <CheckoutPanel
            plan={plan}
            period={period}
            onLock={setLocked}
            onDone={onDone}
          />
        ) : (
          <Skeleton height={420} radius={20} />
        )}
        {locked ? null : aside}
      </aside>

      {plan && !payInView && !locked ? (
        <div className="tdw-fb-bar">
          <span className="tdw-fb-bar-text">
            <strong>{plan.name}</strong>
            <span>
              {formatUsd(
                period === 'YEARLY' ? plan.yearlyPriceUsd : plan.monthlyPriceUsd
              )}
              {period === 'YEARLY'
                ? t('tdw_per_year_short', '/year')
                : t('tdw_per_month_short', '/month')}
            </span>
          </span>
          <Button
            variant="primary"
            iconEnd="arrow-down"
            onClick={() =>
              pay.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          >
            {t('tdw_fb_continue_payment', 'Continue to payment')}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export const FirstBillingComponent: FC<{
  // After paying, or "Maybe later": the app (and the onboarding modal) opens
  onDone: () => void;
}> = ({ onDone }) => {
  const user = useUser();
  const t = useT();
  const { i18n } = useTranslation();
  const fetch = useFetch();
  const toaster = useToaster();
  const modals = useModals();
  const { mutate } = useSWRConfig();
  const { plans } = useTadweenPricing();
  const { tutorialVideoUrl } = useBrandLinks();
  const featured = plans.find((p) => p.mostPopular) || plans[0];
  // /billing?plan=TIER (the upgrade paywall) picks that plan
  const preselect = useSearchParams().get('plan');
  const [skipping, setSkipping] = useState(false);
  const trialing = isOnFreeTrial(user);
  const trialDays = user?.allowTrial ? featured?.trialDays || 0 : 0;
  const daysLeft = user?.trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(user.trialEndsAt).getTime() - Date.now()) / 86_400_000
        )
      )
    : 0;
  const ar = i18n.resolvedLanguage === 'ar';
  const video = tutorialVideoUrl ? embedUrl(tutorialVideoUrl) : null;

  // "Maybe later" before any trial: the trial without a card, on the
  // highlighted plan
  const startTrial = useCallback(async () => {
    if (!featured) {
      return;
    }
    setSkipping(true);
    const res = await fetch('/billing/trial', {
      method: 'POST',
      body: JSON.stringify({ billing: featured.tier, period: 'MONTHLY' }),
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
    onDone();
  }, [featured, onDone]);

  const showVideo = () => {
    if (!video) {
      return;
    }
    modals.openModal({
      title: t('tdw_fb_video', 'See Tadween in action'),
      children: (
        <div className="aspect-video w-[min(800px,calc(100vw-48px))]">
          <iframe
            className="w-full h-full"
            src={video}
            title={t('tdw_ob_tutorial_video', 'Tadween tutorial')}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      ),
    });
  };

  const checks = trialing
    ? [
        t('tdw_fb_check_today', 'Nothing is charged today'),
        t('tdw_fb_check_trial_end', 'Your plan starts when your trial ends'),
        t('billing_cancel_anytime', 'Cancel anytime, from settings'),
      ]
    : trialDays > 0
    ? [
        t('tdw_fb_check_trial', '{{n}}-day free trial', { n: trialDays }),
        t('tdw_fb_check_today', 'Nothing is charged today'),
        t('billing_cancel_anytime', 'Cancel anytime, from settings'),
      ]
    : [t('billing_cancel_anytime', 'Cancel anytime, from settings')];

  const intro = (
    <div className="tdw-fb-intro">
      <h1 className="tdw-fb-title">
        {trialing
          ? t(
              'tdw_plan_step_title_trial',
              'Pick your plan to keep going after your free trial'
            )
          : trialDays > 0
          ? t('tdw_fb_title_trial', 'Start your {{n}}-day free trial', {
              n: trialDays,
            })
          : t('tdw_plan_step_title', 'Choose your plan')}
      </h1>
      <p className="tdw-fb-lead">
        {trialing
          ? daysLeft === 1
            ? t(
                'tdw_fb_lead_left_one',
                '1 day left in your free trial. Schedule posts to Facebook, Instagram, LinkedIn, Threads and YouTube from one calendar.'
              )
            : t(
                'tdw_fb_lead_left',
                '{{n}} days left in your free trial. Schedule posts to Facebook, Instagram, LinkedIn, Threads and YouTube from one calendar.',
                { n: daysLeft }
              )
          : t(
              'tdw_fb_lead',
              'Schedule posts to Facebook, Instagram, LinkedIn, Threads and YouTube from one calendar.'
            )}
      </p>
      {video ? (
        <button type="button" className="tdw-fb-video" onClick={showVideo}>
          <Icon name="play" size={14} />
          {t('tdw_fb_video', 'See Tadween in action')}
        </button>
      ) : null}
      <ul className="tdw-fb-checks">
        {checks.map((c) => (
          <li key={c}>
            <Icon name="circle-check" size={18} />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <TadweenScope className={cx('tdw-fb', ar && 'is-ar')}>
      <header className="tdw-fb-head">
        <span className="pz-ob-logo">
          <Logo />
          <span className="pz-ob-logo-word">Tadween</span>
        </span>
        <div className="tdw-fb-tools">
          <OrganizationSelector />
          <span className="tdw-fb-icon">
            <ModeComponent />
          </span>
          <LanguageSwitch />
          <span className="tdw-fb-icon">
            <LogoutComponent isIcon={true} />
          </span>
        </div>
      </header>
      <PlanCheckout
        intro={intro}
        initialTier={preselect}
        onDone={onDone}
        after={
          <div className="tdw-fb-faq">
            <FAQComponent />
          </div>
        }
        aside={
          trialing || trialDays > 0 ? (
            <div className="tdw-plan-later">
              <Button
                variant="ghost"
                size="sm"
                loading={skipping}
                onClick={trialing ? onDone : startTrial}
              >
                {t('tdw_paywall_later', 'Maybe later')}
              </Button>
            </div>
          ) : null
        }
      />
    </TadweenScope>
  );
};
