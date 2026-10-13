'use client';

// Tadween onboarding: what a new account sees after sign-up, as the design
// system's Onboarding / ScreenOnboarding (logo, spring progress bar, one
// focused step at a time that slides in from the direction of travel and
// mirrors in RTL, Back / Continue / Skip setup always reachable).
//
// It renders full screen from LayoutComponent, in place of the app shell, while
// a step is active. The steps only use what the server already has:
//   welcome  → your name (POST /user/personal, the same call as Settings → Profile)
//   language → language (the i18next cookie) and the time format (localStorage
//              `isUS`, as Settings → Preferences); the time zone is the device's
//   plan     → only when the workspace still needs a plan: the layout shows the
//              one-page /billing paywall, and onboarding resumes after it
//   channels → every network the admin turned on, in the server's order (the
//              focus networks first, as equals), through Postiz's own
//              AddProviderComponent
//   done     → summary, then Today
// The workspace name is asked on the sign-up card (it is required to create
// the workspace). The AI agent setup lives in Settings → API & MCP.
//
// Progress is kept in sessionStorage, so a channel's OAuth round trip or the
// paywall come back to the right step in the same tab.
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
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { AddProviderComponent } from '@gitroom/frontend/components/launches/add.provider.component';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { usePersonal } from '@gitroom/frontend/components/tadween/settings/account.settings';
import { useOrganizations } from '@gitroom/frontend/components/tadween/settings/workspace.settings';
import { useBrandLinks } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import {
  Button,
  cx,
  Icon,
  Input,
  RadioGroup,
  SegmentedControl,
  Select,
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

export type OnboardingStep = 'welcome' | 'language' | 'plan' | 'channels' | 'done';

const STORAGE_KEY = 'tdw_onboarding';
const STEPS: OnboardingStep[] = ['welcome', 'language', 'plan', 'channels', 'done'];

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
   return), resumes from sessionStorage, never restarts after a payment return.
   Decides once the signed-in user is known. */
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
    if (saved.step && saved.user === userId) {
      started.current = true;
      setStep(saved.step);
    } else if (
      requested &&
      !returnedFromPayment &&
      !started.current &&
      saved.done !== userId
    ) {
      started.current = true;
      const first = returnedFromChannel ? 'channels' : 'welcome';
      writeSaved({ step: first, user: userId });
      setStep(first);
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

/* The welcome step's name, saved with Settings → Profile's call (bio and
   picture are sent back unchanged). save() resolves false to keep the step open. */
const useNameStep = () => {
  const t = useT();
  const fetch = useFetch();
  const { mutate } = useSWRConfig();
  const { data: personal, isLoading } = usePersonal();
  const [name, setName] = useState<string>();
  const [error, setError] = useState('');
  const value = name ?? personal?.name ?? '';

  const change = useCallback((next: string) => {
    setError('');
    setName(next);
  }, []);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === (personal?.name || '')) {
      return true;
    }
    if (trimmed.length < 3) {
      setError(t('tdw_auth_err_min', 'Use at least {{count}} characters.', { count: 3 }));
      return false;
    }
    const response = await fetch('/user/personal', {
      method: 'POST',
      body: JSON.stringify({
        fullname: trimmed,
        bio: personal?.bio || '',
        picture: personal?.picture || null,
      }),
    });
    if (!response.ok) {
      setError(t('tdw_ob_name_error', 'We couldn’t save your name. Try again.'));
      return false;
    }
    mutate('/user/personal');
    // the sidebar and Today read the name from /user/self
    mutate('/user/self');
    return true;
  };

  return { value, change, error, loading: isLoading, save };
};

/* Back from a channel's OAuth (`?added=…&msg=…`): what LaunchesComponent does
   on that return (event, toast, popup hand-off), since onboarding renders in
   its place. Then the two parameters are dropped, so a reload or Back doesn't
   repeat it. */
const useChannelReturn = () => {
  const t = useT();
  const toaster = useToaster();
  const fireEvents = useFireEvents();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    const added = params.get('added');
    const msg = params.get('msg');
    if (!added && !msg) {
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

const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || '';

export const TadweenOnboarding: FC<{
  step: OnboardingStep;
  go: (step: OnboardingStep | null) => void;
  /** the workspace has no plan yet and billing is on */
  needsPlan: boolean;
}> = ({ step, go, needsPlan }) => {
  const t = useT();
  const { i18n } = useTranslation();
  const router = useRouter();
  const user = useUser();
  const connected = useConnected();
  const rtl = i18n.dir() === 'rtl';
  const ar = i18n.resolvedLanguage === 'ar';
  const [travel, setTravel] = useState(1);
  const [busy, setBusy] = useState(false);
  const nameStep = useNameStep();
  useChannelReturn();

  // The plan step only exists while the workspace still needs one; once the
  // paywall is done (trial or payment), onboarding carries on with channels
  const order: OnboardingStep[] =
    step === 'plan' || needsPlan
      ? ['welcome', 'language', 'plan', 'channels', 'done']
      : ['welcome', 'language', 'channels', 'done'];
  useEffect(() => {
    if (step === 'plan' && !needsPlan) {
      go('channels');
    }
  }, [step, needsPlan]);

  const labels: Record<OnboardingStep, string> = {
    welcome: t('tdw_ob_s_you', 'You'),
    language: t('tdw_ob_s_language', 'Language'),
    plan: t('tdw_ob_s_plan', 'Plan'),
    channels: t('tdw_ob_s_channels', 'Channels'),
    done: t('tdw_ob_s_ready', 'Ready'),
  };
  const index = Math.max(0, order.indexOf(step));

  const move = (next: OnboardingStep) => {
    setTravel(order.indexOf(next) >= index ? 1 : -1);
    go(next);
  };

  // replace: browser Back must not land on ?onboarding=true and start over
  const finish = useCallback(() => {
    go(null);
    router.replace('/today');
  }, []);

  const forward = async () => {
    if (step === 'welcome') {
      setBusy(true);
      const ok = await nameStep.save();
      setBusy(false);
      if (!ok) {
        return;
      }
    }
    if (step === 'done') {
      finish();
      return;
    }
    move(order[index + 1]);
  };

  const backIcon = rtl ? 'arrow-right' : 'arrow-left';
  const nextIcon = rtl ? 'arrow-left' : 'arrow-right';
  const hasChannels = connected.length > 0;

  return (
    <TadweenScope className={cx('tdw-ob-page', ar && 'is-ar')}>
      <div className="pz-ob">
        <header className="pz-ob-head">
          <span className="pz-ob-logo">
            <Logo />
            <span className="pz-ob-logo-word">Tadween</span>
          </span>
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
                className={cx(i < index && 'is-done', i === index && 'is-current')}
                aria-current={i === index ? 'step' : undefined}
              >
                <span className="pz-ob-bar">
                  <span />
                </span>
                <span className="caption">{labels[s]}</span>
              </li>
            ))}
          </ol>
          {step !== 'done' ? (
            <Button variant="ghost" size="sm" onClick={finish}>
              {t('tdw_ob_skip', 'Skip setup')}
            </Button>
          ) : (
            <span className="tdw-ob-head-spacer" />
          )}
        </header>

        <main className="pz-ob-stage">
          <div
            key={step}
            className="pz-ob-step"
            style={{ ['--travel' as string]: travel }}
          >
            {step === 'welcome' ? (
              <WelcomeStep {...nameStep} onEnter={forward} />
            ) : step === 'language' ? (
              <LanguageStep />
            ) : step === 'channels' ? (
              <ChannelsStep connected={connected} />
            ) : step === 'done' ? (
              <DoneStep connected={connected} name={firstName(user?.name)} />
            ) : (
              <PlanPending />
            )}
          </div>
        </main>

        <footer className="pz-ob-foot">
          {index > 0 && step !== 'done' ? (
            <Button variant="ghost" icon={backIcon} onClick={() => move(order[index - 1])}>
              {t('tdw_back', 'Back')}
            </Button>
          ) : null}
          <span className="pz-ob-foot-note" />
          {step === 'channels' && !hasChannels ? (
            <Button variant="ghost" onClick={() => move('done')}>
              {t('tdw_ob_later', 'I’ll do this later')}
            </Button>
          ) : null}
          {step === 'channels' && !hasChannels ? null : (
            <Button
              variant="primary"
              loading={busy}
              loadingLabel={t('tdw_ob_saving', 'Saving…')}
              icon={step === 'done' ? 'calendar-days' : undefined}
              iconEnd={step === 'done' ? undefined : nextIcon}
              onClick={forward}
            >
              {step === 'done'
                ? t('tdw_ob_go_today', 'Go to Today')
                : step === 'language' && order[index + 1] === 'plan'
                ? t('tdw_ob_choose_plan', 'Choose a plan')
                : t('tdw_continue', 'Continue')}
            </Button>
          )}
        </footer>
      </div>
    </TadweenScope>
  );
};

/* Heading shared by every step: big friendly title, one lead line */
const StepHead: FC<{ title: string; lead: string; center?: boolean }> = ({
  title,
  lead,
  center,
}) => (
  <div className={cx('tdw-ob-headline', center && 'is-center')}>
    <h1 className="title-1">{title}</h1>
    <p className="pz-ob-lead">{lead}</p>
  </div>
);

/* Step 1: your name, and the workspace you're in */
const WelcomeStep: FC<{
  value: string;
  change: (value: string) => void;
  error: string;
  loading: boolean;
  onEnter: () => void;
}> = ({ value, change, error, loading, onEnter }) => {
  const t = useT();
  const user = useUser();
  const { data: organizations } = useOrganizations();
  const workspace = organizations?.find?.((org: any) => org?.id === user?.orgId);
  // Whoever created the workspace owns it; an invited teammate joined one
  const joined = !!user?.role && user.role !== 'SUPERADMIN';

  return (
    <>
      <span className="tdw-ob-mark" aria-hidden="true">
        <Logo />
      </span>
      <StepHead
        title={t('tdw_ob_welcome_title', 'Welcome to Tadween')}
        lead={t(
          'tdw_ob_welcome_lead',
          'A few quick choices and your workspace is ready. It takes about a minute.'
        )}
      />
      <form
        className="tdw-ob-form"
        onSubmit={(e) => {
          e.preventDefault();
          onEnter();
        }}
      >
        {loading ? (
          <Skeleton height={68} radius={10} />
        ) : (
          <Input
            label={t('tdw_ob_name_label', 'What should we call you?')}
            placeholder={t('tdw_ob_name_placeholder', 'Your full name')}
            autoComplete="name"
            autoFocus
            value={value}
            error={error || undefined}
            hint={
              error
                ? undefined
                : t('tdw_ob_name_hint', 'Your teammates see it, and Today greets you by it.')
            }
            onChange={(e) => change(e.target.value)}
          />
        )}
      </form>
      {workspace ? (
        <div className="tdw-ob-workspace">
          <span className="tdw-ob-workspace-mark" aria-hidden="true">
            {(workspace.name || '?').trim().slice(0, 1).toUpperCase()}
          </span>
          <span className="tdw-ob-workspace-text">
            <span className="caption pz-muted">
              {joined
                ? t('tdw_ob_workspace_joined', 'You joined this workspace')
                : t('tdw_ob_workspace_yours', 'Your workspace')}
            </span>
            <span className="headline">{workspace.name}</span>
          </span>
          {joined ? null : (
            <span className="caption pz-muted tdw-ob-workspace-note">
              {t('tdw_ob_workspace_note', 'Invite your team from Settings when you’re ready.')}
            </span>
          )}
        </div>
      ) : null}
    </>
  );
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

// "Cairo · GMT+3" for the device's time zone
const deviceTimeZone = (language: string) => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const city = zone.split('/').pop()?.replace(/_/g, ' ') || zone;
    const offset =
      new Intl.DateTimeFormat(language, { timeZoneName: 'shortOffset' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value || '';
    return { zone, label: [city, offset].filter(Boolean).join(' · ') };
  } catch (e) {
    return { zone: '', label: '' };
  }
};

/* Step 2: language (applied at once, like Settings → Preferences → Language)
   and time format. Both are saved in this browser. */
const LanguageStep: FC = () => {
  const t = useT();
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || fallbackLng;
  const [, setCookie] = useCookie(cookieName, current);
  const [timeFormat, setTimeFormat] = useState<'US' | 'GLOBAL'>();
  useEffect(() => {
    setTimeFormat(isUSCitizen() ? 'US' : 'GLOBAL');
  }, []);
  const zone = useMemo(() => deviceTimeZone(current), [current]);

  const changeLanguage = (language: string) => {
    setCookie(language);
    i18next.changeLanguage(language);
    document.documentElement.setAttribute('dir', i18next.dir(language));
    document.documentElement.setAttribute('lang', language);
  };
  const changeTimeFormat = (value: 'US' | 'GLOBAL') => {
    setTimeFormat(value);
    try {
      localStorage.setItem('isUS', value);
    } catch (e) {
      // the calendar falls back to the browser's locale
    }
  };

  const main = ['en', 'ar'].filter((l) => languages.includes(l));
  const others = languages.filter((l) => !main.includes(l));
  const sample = new Date(2026, 0, 1, 9, 30);

  return (
    <>
      <StepHead
        title={t('tdw_ob_language_title', 'Language and time')}
        lead={t(
          'tdw_ob_language_lead',
          'Tadween works in English and Arabic. Arabic switches the whole app to right-to-left.'
        )}
      />
      <div className="tdw-ob-fields">
        <div className="pz-field">
          <span className="pz-label" aria-hidden="true">
            {t('tdw_pref_language', 'Language')}
          </span>
          <RadioGroup
            label={t('tdw_pref_language', 'Language')}
            columns={2}
            value={main.includes(current) ? current : ''}
            onChange={changeLanguage}
            options={main.map((code) => ({
              value: code,
              label: languageName(code),
              description:
                code === 'ar'
                  ? t('tdw_ob_rtl', 'Right to left')
                  : t('tdw_ob_ltr', 'Left to right'),
            }))}
          />
          {others.length ? (
            <Select
              size="sm"
              aria-label={t('tdw_ob_more_languages', 'More languages')}
              placeholder={t('tdw_ob_more_languages', 'More languages')}
              value={others.includes(current) ? current : undefined}
              onChange={changeLanguage}
              options={others.map((code) => ({ value: code, label: languageName(code) }))}
              className="tdw-ob-more"
            />
          ) : null}
        </div>
        <div className="pz-field">
          <span className="pz-label">{t('tdw_pref_time_format', 'Time format')}</span>
          {timeFormat ? (
            <div className="tdw-ob-row">
              <SegmentedControl
                label={t('tdw_pref_time_format', 'Time format')}
                value={timeFormat}
                onChange={changeTimeFormat}
                options={[
                  { value: 'US', label: t('tdw_pref_12h', '12-hour') },
                  { value: 'GLOBAL', label: t('tdw_pref_24h', '24-hour') },
                ]}
              />
              <span className="time pz-muted">
                {new Intl.DateTimeFormat(current.replace('_', '-'), {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: timeFormat === 'US',
                }).format(sample)}
              </span>
            </div>
          ) : (
            <Skeleton height={36} width={220} radius={10} />
          )}
        </div>
        {zone.label ? (
          <div className="tdw-ob-note">
            <Icon name="globe" size={16} />
            <span>
              {t('tdw_ob_timezone', 'Times show in this device’s time zone: {{zone}}', {
                zone: zone.label,
                interpolation: { escapeValue: false },
              })}
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
};

/* Shown for a moment while the layout swaps in the paywall */
const PlanPending: FC = () => (
  <div className="tdw-ob-fields" aria-busy="true">
    <Skeleton height={36} width="60%" radius={8} />
    <Skeleton height={16} width="80%" />
    <Skeleton height={160} radius={14} />
  </div>
);

/* Step 3: one card per network customers can add, in the order the server
   sends (GET /integrations: the focus networks first, as equals, then the
   rest). The cards press Postiz's own provider tile, so each provider's connect
   flow (OAuth, custom fields, web3, extension) is unchanged. */
const ChannelsStep: FC<{ connected: Integration[] }> = ({ connected }) => {
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
      {!data ? (
        <div className="pz-ob-cards">
          <Skeleton height={72} radius={14} />
          <Skeleton height={72} radius={14} />
        </div>
      ) : (
        <div className="pz-ob-cards">
          {social.map((item) => {
            const done = connected.filter((c) => c.identifier === item.identifier);
            return (
              <div key={item.identifier} className={cx('pz-ob-card', done.length && 'is-done')}>
                <img
                  src={`/icons/platforms/${item.identifier}.png`}
                  alt=""
                  width={40}
                  height={40}
                />
                <div className="pz-ob-card-text">
                  <div className="headline">{item.name.replace(/\s*\n\s*/g, ' ')}</div>
                  {done.length || item.toolTip ? (
                    <div className="caption pz-muted">
                      {done.length
                        ? done.map((d) => d.name).join(', ')
                        : item.toolTip}
                    </div>
                  ) : null}
                </div>
                {done.length ? (
                  <>
                    <span className="pz-ob-ok">
                      <Icon name="circle-check" size={18} />
                      {t('tdw_ob_connected', 'Connected')}
                    </span>
                    <Button size="sm" variant="ghost" icon="plus" onClick={() => connect(item.identifier)}>
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
          <AddProviderComponent invite={false} social={social as any} article={[]} onboarding={true} />
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

      {article.length > 0 && (
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

/* Step 4: what's set up, then Today */
const DoneStep: FC<{ connected: Integration[]; name: string }> = ({ connected, name }) => {
  const t = useT();
  const { i18n } = useTranslation();
  const { tutorialVideoUrl } = useBrandLinks();
  const active = connected.filter((c) => !c.disabled);
  const rows = [
    {
      done: !!name,
      label: name
        ? t('tdw_ob_sum_name', 'Hi, {{name}}', { name, interpolation: { escapeValue: false } })
        : t('tdw_ob_sum_no_name', 'Add your name any time in Settings → Profile'),
    },
    {
      done: true,
      label: t('tdw_ob_sum_language', 'Tadween in {{language}}', {
        language: languageName(i18n.resolvedLanguage || fallbackLng),
        interpolation: { escapeValue: false },
      }),
    },
    {
      done: active.length > 0,
      label: active.length
        ? t('tdw_ob_sum_channels', 'Channels connected: {{count}}', { count: active.length })
        : t('tdw_ob_sum_no_channels', 'Connect a channel any time from the sidebar'),
    },
  ];
  return (
    <div className="pz-ob-done">
      <span className="pz-ob-done-mark">
        <Icon name="check" size={28} />
      </span>
      <StepHead
        center
        title={
          name
            ? t('tdw_ob_done_title_name', 'You’re all set, {{name}}', {
                name,
                interpolation: { escapeValue: false },
              })
            : t('tdw_ob_done_title', 'You’re all set')
        }
        lead={t(
          'tdw_ob_done_lead2',
          'Today shows what’s next. Write your first post and schedule it when you’re ready.'
        )}
      />
      <ul className="tdw-ob-summary">
        {rows.map((row) => (
          <li key={row.label} className={cx(row.done && 'is-done')}>
            <Icon name={row.done ? 'circle-check' : 'clock'} size={18} />
            <span>{row.label}</span>
          </li>
        ))}
      </ul>
      {tutorialVideoUrl ? (
        <a className="tdw-ob-link" href={tutorialVideoUrl} target="_blank" rel="noreferrer">
          <Icon name="play" size={14} />
          {t('tdw_ob_watch_tour', 'Watch a short tour')}
        </a>
      ) : null}
    </div>
  );
};
