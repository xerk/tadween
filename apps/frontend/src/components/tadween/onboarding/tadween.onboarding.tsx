'use client';

// Tadween onboarding: what a new account sees after sign-up. Postiz's
// onboarding steps (OnboardingModal: connect channels, connect agents, watch
// the tutorial) in the design system's Onboarding / ScreenOnboarding shell
// (logo, spring progress bar, one focused step at a time that slides in from
// the direction of travel and mirrors in RTL, Back / Continue always
// reachable), with the plan as the last step of the same flow:
//   channels → every network the admin turned on, in the server's order (the
//              focus networks first, as equals), through Postiz's own
//              AddProviderComponent
//   agents   → the AI assistant guides of Settings → API & MCP
//   tutorial → the admin's tutorial video (Branding), when there is one
//   plan     → while the free trial (started at sign-up) runs without a
//              card: pick the plan to keep after it and save a card in
//              Stripe for the same trial, or "Maybe later" into the app
// A workspace without a plan (its trial didn't start, or ended) sees the
// same shell on the plan step alone.
//
// It renders full screen from LayoutComponent, in place of the app shell.
// Progress is kept in sessionStorage, so a channel's OAuth round trip comes
// back to the right step in the same tab.
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { orderBy } from 'lodash';
import i18next from 'i18next';
import useCookie from 'react-use-cookie';
import { useTranslation } from 'react-i18next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import {
  cookieName,
  fallbackLng,
  languages,
} from '@gitroom/react/translation/i18n.config';
import { AddProviderComponent } from '@gitroom/frontend/components/launches/add.provider.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import {
  isOnFreeTrial,
  useTrialInfo,
} from '@gitroom/frontend/components/tadween/billing/trial.banner';
import {
  useBrandLinks,
  useInstanceSettings,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { AgentConnect } from '@gitroom/frontend/components/tadween/settings/api.settings';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';
import {
  Button,
  cx,
  Icon,
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

export type OnboardingStep = 'channels' | 'agents' | 'tutorial' | 'plan';

const STORAGE_KEY = 'tdw_onboarding';
const STEPS: OnboardingStep[] = ['channels', 'agents', 'tutorial', 'plan'];

// { step, user } while onboarding runs; { done: user } once that user finished
// or skipped it in this tab, so browser Back to ?onboarding=true doesn't start
// over. Both are per user: another account signing up in this tab starts fresh.
type Saved = { step?: OnboardingStep; user?: string; done?: string };
const readSaved = (): Saved => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}') || {};
    return {
      step: STEPS.includes(saved.step) ? saved.step : undefined,
      user: typeof saved.user === 'string' ? saved.user : undefined,
      done: typeof saved.done === 'string' ? saved.done : undefined,
    };
  } catch (e) {
    return {};
  }
};
const writeSaved = (saved: Saved) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (e) {
    // private mode: onboarding still works, it just won't resume after a redirect
  }
};

/* Whether onboarding owns the screen, and at which step. Starts from
   `?onboarding=true` (set after sign-up, activation and a channel's OAuth
   return), resumes from sessionStorage. A payment return (`?check=`) ends it:
   the plan is being activated, CheckPayment finishes that. Decides once the
   signed-in user is known. */
export const useOnboarding = (userId?: string) => {
  const params = useSearchParams();
  const requested = params.get('onboarding') === 'true';
  const returnedFromChannel = !!params.get('added');
  const returnedFromPayment = !!params.get('check');
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<OnboardingStep | null>(null);
  // started once in this page: a later URL change never restarts it
  const started = useRef(false);

  useEffect(() => {
    if (!userId) {
      return;
    }
    const saved = readSaved();
    if (returnedFromPayment) {
      writeSaved({ done: userId });
      setStep(null);
    } else if (saved.step && saved.user === userId) {
      started.current = true;
      setStep(saved.step);
    } else if (requested && !started.current && saved.done !== userId) {
      started.current = true;
      writeSaved({ step: 'channels', user: userId });
      setStep('channels');
    }
    setReady(true);
  }, [userId, requested, returnedFromChannel, returnedFromPayment]);

  const go = useCallback(
    (next: OnboardingStep | null) => {
      writeSaved(next ? { step: next, user: userId } : { done: userId });
      setStep(next);
    },
    [userId]
  );

  return { ready, requested, step, go };
};

type Integration = {
  id: string;
  name: string;
  picture?: string;
  identifier: string;
  disabled?: boolean;
  type?: string;
};

const useConnected = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()).integrations;
  }, []);
  // Same key and options as Postiz's onboarding, so caches line up
  const { data } = useSWR<Integration[]>('/integrations/list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });
  return useMemo(
    () =>
      orderBy(
        data || [],
        ['type', 'disabled', 'identifier'],
        ['desc', 'asc', 'asc']
      ) as Integration[],
    [data]
  );
};

const useProviders = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/integrations')).json();
  }, []);
  return useSWR('get-all-integrations-onboarding', load);
};

/* Back from a channel's OAuth (`?added=…&msg=…`): what LaunchesComponent does
   on that return (event, toast, popup hand-off), since onboarding renders in
   its place. Then the two parameters are dropped, so a reload or Back doesn't
   repeat it. */
const useChannelReturn = (enabled: boolean) => {
  const t = useT();
  const toaster = useToaster();
  const fireEvents = useFireEvents();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    const added = params.get('added');
    const msg = params.get('msg');
    if (!enabled || (!added && !msg)) {
      return;
    }
    if (msg) {
      toaster.show(msg, 'success');
      window.opener?.postMessage({ msg, success: false }, '*');
    }
    if (added) {
      fireEvents('channel_added');
      window.opener?.postMessage(
        { msg: t('channel_added', 'Channel added'), success: true },
        '*'
      );
    }
    if (window.opener) {
      window.close();
      return;
    }
    router.replace(`${pathname}?onboarding=true`);
  }, []);
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

/* English ⇄ العربية in the header, applied at once like Settings →
   Preferences → Language. Every other language stays in Settings. */
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

// A YouTube or Vimeo page link as its embeddable player; null if unknown
const embedUrl = (url: string) => {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (host.endsWith('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) {
        return url;
      }
      const id =
        u.searchParams.get('v') || u.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host === 'player.vimeo.com') {
      return url;
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const TadweenOnboarding: FC<{
  // null: the plan step alone, for a workspace that needs a plan outside onboarding
  step: OnboardingStep | null;
  go: (step: OnboardingStep | null) => void;
  /** the workspace has no plan yet and billing is on */
  needsPlan: boolean;
}> = ({ step: requestedStep, go, needsPlan }) => {
  const t = useT();
  const { i18n } = useTranslation();
  const router = useRouter();
  const connected = useConnected();
  const { tutorialVideoUrl } = useBrandLinks();
  // the tutorial step depends on Branding: decide nothing before it is in
  const { data: settings } = useInstanceSettings();
  const rtl = i18n.dir() === 'rtl';
  const ar = i18n.resolvedLanguage === 'ar';
  const [travel, setTravel] = useState(1);
  const standalone = !requestedStep;
  const step: OnboardingStep = requestedStep || 'plan';
  useChannelReturn(!standalone);

  // The free trial starts at sign-up; while it runs without a card, the
  // plan step asks for the plan to keep after it
  const user = useUser();
  const { mutate } = useSWRConfig();
  // (only who manages billing: an invited teammate never sees the plan step)
  const trialing =
    isOnFreeTrial(user) && ['ADMIN', 'SUPERADMIN'].includes(user?.role || '');
  const { data: trialInfo } = useTrialInfo(trialing);
  const planStep =
    needsPlan || (trialing && !!trialInfo && !trialInfo.hasPaymentMethod);
  // Right after sign-up the trial's subscription is still on its way (Stripe's
  // webhook): look again for a few seconds before showing channels as locked
  const trialStarting =
    !standalone && step === 'channels' && needsPlan && !!user?.allowTrial;
  const [waited, setWaited] = useState(0);
  useEffect(() => {
    if (!trialStarting || waited >= 5) {
      return;
    }
    const timer = setTimeout(() => {
      mutate('/user/self');
      setWaited((n) => n + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [trialStarting, waited]);
  const starting = trialStarting && waited < 5;

  // Postiz's three steps, the tutorial only when Branding has a video, then
  // the plan while the workspace has none to keep after its trial
  const order = useMemo(
    () =>
      STEPS.filter(
        (s) =>
          (s !== 'tutorial' || !!tutorialVideoUrl) && (s !== 'plan' || planStep)
      ),
    [tutorialVideoUrl, planStep]
  );
  const index = Math.max(0, order.indexOf(step));
  const last = index === order.length - 1;

  // replace: browser Back must not land on ?onboarding=true and start over
  const finish = useCallback(() => {
    go(null);
    router.replace('/today');
  }, [go]);

  // A step that doesn't apply any more (the plan was bought in another tab,
  // the tutorial was removed) moves on
  useEffect(() => {
    if (
      standalone ||
      !settings ||
      (trialing && !trialInfo) ||
      order.includes(step)
    ) {
      return;
    }
    const next = order.find((s) => STEPS.indexOf(s) > STEPS.indexOf(step));
    if (next) {
      go(next);
    } else {
      finish();
    }
  }, [standalone, settings, trialing, trialInfo, order, step]);

  const labels: Record<OnboardingStep, string> = {
    channels: t('tdw_ob_s_channels', 'Channels'),
    agents: t('tdw_ob_s_agents', 'AI agents'),
    tutorial: t('tdw_ob_s_tutorial', 'Tutorial'),
    plan: t('tdw_ob_s_plan', 'Plan'),
  };

  const move = (next: OnboardingStep) => {
    setTravel(order.indexOf(next) >= index ? 1 : -1);
    go(next);
  };

  const forward = () => {
    if (last) {
      finish();
      return;
    }
    move(order[index + 1]);
  };

  // Skipping setup never skips the plan: it goes straight to it
  const skip = () => {
    if (planStep) {
      move('plan');
      return;
    }
    finish();
  };

  const backIcon = rtl ? 'arrow-right' : 'arrow-left';
  const nextIcon = rtl ? 'arrow-left' : 'arrow-right';
  const hasChannels = connected.length > 0;
  const onPlan = step === 'plan';

  return (
    <TadweenScope className={cx('tdw-ob-page', ar && 'is-ar')}>
      <div className="pz-ob">
        <header className="pz-ob-head">
          <span className="pz-ob-logo">
            <Logo />
            <span className="pz-ob-logo-word">Tadween</span>
          </span>
          {standalone ? (
            <span className="pz-ob-progress" aria-hidden="true" />
          ) : (
            <ol
              className="pz-ob-progress"
              style={{ ['--steps' as string]: order.length }}
              aria-label={t('tdw_ob_progress', 'Step {{n}} of {{total}}', {
                n: index + 1,
                total: order.length,
              })}
            >
              {order.map((s, i) => (
                <li
                  key={s}
                  className={cx(
                    i < index && 'is-done',
                    i === index && 'is-current'
                  )}
                  aria-current={i === index ? 'step' : undefined}
                >
                  <span className="pz-ob-bar">
                    <span />
                  </span>
                  <span className="caption">{labels[s]}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="tdw-ob-tools">
            {onPlan ? <OrganizationSelector /> : null}
            <LanguageSwitch />
            {onPlan ? (
              <span className="tdw-ob-logout">
                <LogoutComponent isIcon={true} />
              </span>
            ) : (
              <Button variant="ghost" size="sm" onClick={skip}>
                {t('tdw_ob_skip', 'Skip setup')}
              </Button>
            )}
          </div>
        </header>

        <main className={cx('pz-ob-stage', onPlan && 'is-plan')}>
          <div
            key={step}
            className={cx('pz-ob-step', step !== 'channels' && 'is-wide')}
            style={{ ['--travel' as string]: travel }}
          >
            {step === 'channels' ? (
              <ChannelsStep
                connected={connected}
                needsPlan={needsPlan}
                starting={starting}
                onChoosePlan={() => move('plan')}
              />
            ) : step === 'agents' ? (
              <AgentsStep />
            ) : step === 'tutorial' ? (
              <TutorialStep url={tutorialVideoUrl} />
            ) : (
              <FirstBillingComponent onDone={finish} />
            )}
          </div>
        </main>

        {standalone ? null : (
          <footer className="pz-ob-foot">
            {index > 0 ? (
              <Button
                variant="ghost"
                icon={backIcon}
                onClick={() => move(order[index - 1])}
              >
                {t('tdw_back', 'Back')}
              </Button>
            ) : null}
            <span className="pz-ob-foot-note caption">
              {step === 'agents'
                ? t(
                    'tdw_ob_agents_later',
                    'Every assistant and the API key are in Settings → API & MCP.'
                  )
                : null}
            </span>
            {onPlan ? null : (
              <Button
                variant={
                  step === 'channels' && !hasChannels && !needsPlan
                    ? 'ghost'
                    : 'primary'
                }
                icon={last ? 'calendar-days' : undefined}
                iconEnd={last ? undefined : nextIcon}
                onClick={forward}
              >
                {last
                  ? t('tdw_ob_go_today', 'Go to Today')
                  : step === 'channels' && !hasChannels && !needsPlan
                  ? t('tdw_ob_without', 'Continue without channels')
                  : step === 'agents'
                  ? t('tdw_ob_continue_skip', 'Continue or skip')
                  : order[index + 1] === 'plan'
                  ? t('tdw_ob_choose_plan', 'Choose a plan')
                  : t('tdw_continue', 'Continue')}
              </Button>
            )}
          </footer>
        )}
      </div>
    </TadweenScope>
  );
};

/* Heading shared by every step: big friendly title, one lead line */
export const StepHead: FC<{
  title: string;
  lead: string;
  center?: boolean;
}> = ({ title, lead, center }) => (
  <div className={cx('tdw-ob-headline', center && 'is-center')}>
    <h1 className="title-1">{title}</h1>
    <p className="pz-ob-lead">{lead}</p>
  </div>
);

/* Step 1: one card per network customers can add, in the order the server
   sends (GET /integrations: the focus networks first, as equals, then the
   rest). The cards press Postiz's own provider tile, so each provider's connect
   flow (OAuth, custom fields, web3, extension) is unchanged. */
const ChannelsStep: FC<{
  connected: Integration[];
  // no plan yet: the server refuses channels until the plan step starts one
  needsPlan: boolean;
  // the trial started at sign-up is still arriving
  starting: boolean;
  onChoosePlan: () => void;
}> = ({ connected, needsPlan, starting, onChoosePlan }) => {
  const t = useT();
  const hidden = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { data } = useProviders();
  const social: { identifier: string; name: string; toolTip?: string }[] =
    data?.social || [];
  const article = data?.article || [];
  // Channels without a card above (e.g. a network the admin turned off later)
  // are listed under "Connected"
  const others = connected.filter(
    (c) => !social.some((s) => s.identifier === c.identifier)
  );

  const connect = (identifier: string) => {
    const tile = hidden.current?.querySelector<HTMLElement>(
      `[data-identifier="${identifier}"]`
    );
    if (!tile) return;
    setBusy(identifier);
    tile.click();
    setTimeout(() => setBusy(null), 4000);
  };

  return (
    <>
      <StepHead
        title={t('tdw_ob_channels_title', 'Connect your first channel')}
        lead={t(
          'tdw_ob_channels_lead3',
          'Pick the networks you post to. You can add more any time.'
        )}
      />
      {needsPlan && !starting ? (
        <div className="tdw-ob-gate">
          <Icon name="lock" size={16} />
          <span>
            {t(
              'tdw_ob_channels_after_plan',
              'You can connect channels as soon as your plan or free trial starts, the last step of this setup.'
            )}
          </span>
          <Button size="sm" variant="secondary" onClick={onChoosePlan}>
            {t('tdw_ob_choose_plan', 'Choose a plan')}
          </Button>
        </div>
      ) : null}
      {!data || starting ? (
        <div className="pz-ob-cards" aria-busy="true">
          <Skeleton height={72} radius={14} />
          <Skeleton height={72} radius={14} />
        </div>
      ) : (
        <div className="pz-ob-cards">
          {social.map((item) => {
            const done = connected.filter(
              (c) => c.identifier === item.identifier
            );
            return (
              <div
                key={item.identifier}
                className={cx('pz-ob-card', done.length && 'is-done')}
              >
                <img
                  src={`/icons/platforms/${item.identifier}.png`}
                  alt=""
                  width={40}
                  height={40}
                />
                <div className="pz-ob-card-text">
                  <div className="headline">
                    {item.name.replace(/\s*\n\s*/g, ' ')}
                  </div>
                  {done.length || item.toolTip ? (
                    <div className="caption pz-muted">
                      {done.length
                        ? done.map((d) => d.name).join(', ')
                        : item.toolTip}
                    </div>
                  ) : null}
                </div>
                {needsPlan ? null : done.length ? (
                  <>
                    <span className="pz-ob-ok">
                      <Icon name="circle-check" size={18} />
                      {t('tdw_ob_connected', 'Connected')}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="plus"
                      onClick={() => connect(item.identifier)}
                    >
                      {t('tdw_ob_add_another', 'Add another')}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === item.identifier}
                    loadingLabel={t('tdw_ob_connecting', 'Connecting…')}
                    onClick={() => connect(item.identifier)}
                  >
                    {t('tdw_ob_connect', 'Connect')}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div ref={hidden} hidden aria-hidden="true">
        {data && (
          <AddProviderComponent
            invite={false}
            social={social as any}
            article={[]}
            onboarding={true}
          />
        )}
      </div>

      {others.length > 0 && (
        <div className="pz-ob-section">
          <h2 className="caption pz-ob-section-title">
            {t('tdw_ob_connected_channels', 'Connected channels')}
          </h2>
          <div className="pz-ob-connected">
            {others.map((c) => (
              <span key={c.id} className="pz-ob-chip">
                <span className="pz-ob-chip-av">
                  <img src={c.picture || '/no-picture.jpg'} alt="" />
                  <img src={`/icons/platforms/${c.identifier}.png`} alt="" />
                </span>
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {!!data && !social.length && !article.length && (
        <p className="caption pz-muted">
          {t(
            'tdw_add_channel_none',
            'No channel types are available to add yet. Ask your administrator to set them up.'
          )}
        </p>
      )}

      {article.length > 0 && !needsPlan && (
        <div className="pz-ob-section">
          <h2 className="caption pz-ob-section-title">
            {t('tdw_ob_other_networks', 'Other networks')}
          </h2>
          <div className="pz-ob-providers">
            <AddProviderComponent
              invite={false}
              social={[]}
              article={article}
              onboarding={true}
            />
          </div>
        </div>
      )}
    </>
  );
};

/* Step 2: an AI assistant (Claude, ChatGPT, Cursor…) or the API, with the
   exact settings for this workspace, as in Settings → API & MCP */
const AgentsStep: FC = () => {
  const t = useT();
  return (
    <>
      <StepHead
        center
        title={t('tdw_ob_agents_title', 'Connect your AI agent')}
        lead={t(
          'tdw_ob_agents_lead',
          'Pick the agent you use and let it draft and schedule posts for you.'
        )}
      />
      <AgentConnect />
    </>
  );
};

/* Step 3: the tutorial video from Branding */
const TutorialStep: FC<{ url: string }> = ({ url }) => {
  const t = useT();
  const embed = embedUrl(url);
  return (
    <>
      <StepHead
        center
        title={t('tdw_ob_tutorial_title', 'Learn how to use Tadween')}
        lead={t(
          'tdw_ob_tutorial_lead',
          'Watch this short video to get the most out of Tadween.'
        )}
      />
      {embed ? (
        <div className="pz-ob-video tdw-ob-video">
          <iframe
            src={embed}
            title={t('tdw_ob_tutorial_video', 'Tadween tutorial')}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <a
          className="tdw-ob-link is-center"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="play" size={14} />
          {t('tdw_ob_watch_tour', 'Watch a short tour')}
        </a>
      )}
    </>
  );
};
