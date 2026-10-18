'use client';

// Tadween: Postiz's onboarding modal (Connect Channels → Connect Agents →
// Watch Tutorial), same steps, fields and copy, in the design system's
// components and tokens. Tadween asks "About you" first, once per user
// (OnboardingQuestions below). Full screen (onboarding.tsx), a full-screen sheet on
// phones, mirrored in Arabic. The tutorial is the video from Branding; the
// step is left out when there is none.
import React, {
  FC,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { orderBy } from 'lodash';
import { useTranslation } from 'react-i18next';
import { AddProviderComponent } from '@gitroom/frontend/components/launches/add.provider.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import {
  AnyMcpClient,
  CopyButton,
  getMcpConfig,
  isChatOnlyMcpClient,
  isSelfHosted,
  fillCliSteps,
  McpAuth,
  McpClient,
  mcpClients,
  mcpConnectorUrls,
} from '@gitroom/frontend/components/public-api/public.component';
import { McpClientIcon } from '@gitroom/frontend/components/public-api/mcp.client.icons';
import { useBrandLinks } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { useOrganizations } from '@gitroom/frontend/components/tadween/shell/sidebar';
import {
  Button,
  cx,
  IconButton,
  Input,
  Spinner,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

// A YouTube or Vimeo page link as its embeddable player; null if unknown
export const embedUrl = (url: string) => {
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

// Back / next arrows point along the reading direction
const useArrows = () => {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  return {
    back: rtl ? 'arrow-right' : 'arrow-left',
    next: rtl ? 'arrow-left' : 'arrow-right',
  };
};

const StepTitle: FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="tdw-obm-title">
    <h2>{title}</h2>
    <p>{description}</p>
  </div>
);

interface OnboardingModalProps {
  onClose: () => void;
}

type OnboardingStepKey = 'about' | 'channels' | 'agents';

// Skip saves nothing, but connecting a channel reloads the modal through the
// network's sign-in: don't ask again in this tab
const ABOUT_SKIPPED = 'tdw-onboarding-about-skipped';
const aboutSkipped = () => {
  try {
    return sessionStorage.getItem(ABOUT_SKIPPED) === '1';
  } catch (e) {
    return false;
  }
};
const skipAbout = () => {
  try {
    sessionStorage.setItem(ABOUT_SKIPPED, '1');
  } catch (e) {
    // private mode: they may be asked once more
  }
};

export const OnboardingModal: FC<OnboardingModalProps> = ({ onClose }) => {
  const [step, setStep] = useState<OnboardingStepKey>('channels');
  const modals = useModals();
  const t = useT();
  const { i18n } = useTranslation();
  const { data: answers, error: answersError } = useOnboardingAnswered();
  // Decided once, so saving the answers doesn't renumber the steps
  const [askAbout, setAskAbout] = useState<boolean>();

  useEffect(() => {
    if (askAbout !== undefined || (!answers && !answersError)) {
      return;
    }
    const ask = !!answers && !answers.answered && !aboutSkipped();
    setAskAbout(ask);
    if (ask) {
      setStep('about');
    }
  }, [answers, answersError, askAbout]);

  const steps = useMemo(
    () => [
      ...(askAbout
        ? [{ key: 'about' as const, label: t('tdw_about_you', 'About you') }]
        : []),
      {
        key: 'channels' as const,
        label: t('connect_channels', 'Connect Channels'),
      },
      { key: 'agents' as const, label: t('connect_agents', 'Connect Agents') },
    ],
    [t, askAbout]
  );
  const current = steps.findIndex((s) => s.key === step) + 1;

  return (
    <TadweenScope
      className={cx('tdw-obm', i18n.resolvedLanguage === 'ar' && 'is-ar')}
    >
      <style>{`#support-discord {display: none}`}</style>
      <div className="tdw-obm-card">
        <IconButton
          icon="x"
          label={t('close', 'Close')}
          className="tdw-obm-close"
          onClick={modals.closeAll}
        />
        <div className="tdw-obm-body">
          {/* Step indicators */}
          {askAbout === undefined ? (
            <div className="tdw-obm-content items-center justify-center">
              <Spinner label={t('loading', 'Loading')} />
            </div>
          ) : (
            <>
              <ol className="tdw-obm-steps">
                {steps.map(({ key, label }, index) => (
                  <Fragment key={key}>
                    {index > 0 && (
                      <li className="tdw-obm-line" aria-hidden="true" />
                    )}
                    <li
                      className={cx(
                        'tdw-obm-step',
                        current === index + 1 && 'is-current',
                        current > index + 1 && 'is-done'
                      )}
                      aria-current={current === index + 1 ? 'step' : undefined}
                    >
                      <span className="tdw-obm-num">{index + 1}</span>
                      <span className="tdw-obm-label">{label}</span>
                    </li>
                  </Fragment>
                ))}
              </ol>

              {/* Step content */}
              {step === 'about' && (
                <OnboardingQuestions
                  onDone={() => setStep('channels')}
                  onSkip={() => {
                    skipAbout();
                    setStep('channels');
                  }}
                />
              )}
              {step === 'channels' && (
                <OnboardingStep1
                  onNext={() => setStep('agents')}
                  onSkip={() => setStep('agents')}
                />
              )}
              {step === 'agents' && (
                <OnboardingStep2
                  onBack={() => setStep('channels')}
                  onNext={onClose}
                />
              )}
            </>
          )}
        </div>
      </div>
    </TadweenScope>
  );
};

// Tadween: whether this user answered the "About you" questions
export const useOnboardingAnswered = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`${res.status}`);
    }
    return (await res.json()) as { answered: boolean };
  }, []);
  return useSWR('/user/onboarding-answers', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};

// The values the server accepts (OnboardingAnswersDto)
const ONBOARDING_QUESTIONS = {
  source: [
    'tiktok',
    'instagram',
    'youtube',
    'linkedin',
    'x',
    'facebook',
    'google',
    'ai_assistant',
    'friend',
    'other',
  ],
  role: [
    'creator',
    'freelancer',
    'agency',
    'small_business',
    'company_team',
    'other',
  ],
  goal: [
    'grow_audience',
    'save_time',
    'manage_clients',
    'grow_business',
    'other',
  ],
} as const;

type OnboardingQuestion = keyof typeof ONBOARDING_QUESTIONS;
const BUSINESS_ROLES: string[] = ['agency', 'company_team'];

// Tadween: "About you", three tap-to-pick questions on one screen. Continue
// saves them once; Skip saves nothing. Exported for any other screen that
// asks them (it only needs a TadweenScope around it). Sign-up no longer asks
// for a workspace name, so an owner or admin can rename the workspace here
// (prefilled with the name it got at sign-up); Skip keeps that name.
export const OnboardingQuestions: FC<{
  onDone: () => void;
  onSkip: () => void;
}> = ({ onDone, onSkip }) => {
  const fetch = useFetch();
  const t = useT();
  const arrows = useArrows();
  const { mutate } = useOnboardingAnswered();
  const user = useUser();
  const { data: organizations, mutate: mutateOrganizations } =
    useOrganizations();
  const workspace = Array.isArray(organizations)
    ? organizations.find((org: { id: string }) => org.id === user?.orgId)
    : undefined;
  const canRename = !!user?.role && user.role !== 'USER';
  // null until typed in, so the name shows as soon as it loads
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const nextName = (workspaceName ?? workspace?.name ?? '').trim();
  const nameTooShort = workspaceName !== null && nextName.length < 3;
  const [picked, setPicked] = useState<
    Partial<Record<OnboardingQuestion, string>>
  >({});
  const [other, setOther] = useState<Record<OnboardingQuestion, string>>({
    source: '',
    role: '',
    goal: '',
  });
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  const labels: Record<OnboardingQuestion, Record<string, string>> = {
    source: {
      tiktok: t('tdw_ob_source_tiktok', 'TikTok'),
      instagram: t('tdw_ob_source_instagram', 'Instagram'),
      youtube: t('tdw_ob_source_youtube', 'YouTube'),
      linkedin: t('tdw_ob_source_linkedin', 'LinkedIn'),
      x: t('tdw_ob_source_x', 'X'),
      facebook: t('tdw_ob_source_facebook', 'Facebook'),
      google: t('tdw_ob_source_google', 'Google search'),
      ai_assistant: t('tdw_ob_source_ai', 'AI assistant (ChatGPT, Claude…)'),
      friend: t('tdw_ob_source_friend', 'A friend or colleague'),
      other: t('tdw_ob_other', 'Other'),
    },
    role: {
      creator: t('tdw_ob_role_creator', 'Creator'),
      freelancer: t('tdw_ob_role_freelancer', 'Freelancer'),
      agency: t('tdw_ob_role_agency', 'Agency'),
      small_business: t('tdw_ob_role_small_business', 'Small business'),
      company_team: t(
        'tdw_ob_role_company_team',
        'Marketing team at a company'
      ),
      other: t('tdw_ob_other', 'Other'),
    },
    goal: {
      grow_audience: t('tdw_ob_goal_grow_audience', 'Grow an audience'),
      save_time: t('tdw_ob_goal_save_time', 'Save time'),
      manage_clients: t('tdw_ob_goal_manage_clients', 'Manage clients'),
      grow_business: t('tdw_ob_goal_grow_business', 'Grow a business'),
      other: t('tdw_ob_other', 'Other'),
    },
  };

  const questions: Record<OnboardingQuestion, string> = {
    source: t('tdw_ob_source_question', 'How did you hear about us?'),
    role: t('tdw_ob_role_question', 'What describes you best?'),
    goal: t('tdw_ob_goal_question', 'What is your main goal?'),
  };

  const complete = !!(picked.source && picked.role && picked.goal);
  const business = BUSINESS_ROLES.includes(picked.role || '');
  // a free-text answer only goes with "other"
  const otherText = (question: OnboardingQuestion) =>
    picked[question] === 'other' ? other[question].trim() : '';

  const save = async () => {
    setSaving(true);
    if (canRename && workspace && nextName !== workspace.name) {
      try {
        const res = await fetch('/settings/name', {
          method: 'PUT',
          body: JSON.stringify({ name: nextName }),
        });
        if (res.ok) {
          mutateOrganizations();
        }
      } catch (e) {
        // the name can still be changed in settings
      }
    }
    const extra = {
      sourceOther: otherText('source'),
      roleOther: otherText('role'),
      goalOther: otherText('goal'),
      company: business ? company.trim() : '',
      website: business ? website.trim() : '',
    };
    try {
      const res = await fetch('/user/onboarding-answers', {
        method: 'POST',
        body: JSON.stringify({
          source: picked.source,
          role: picked.role,
          goal: picked.goal,
          ...Object.fromEntries(
            Object.entries(extra).filter(([, value]) => value)
          ),
        }),
      });
      if (res.ok) {
        mutate({ answered: true }, { revalidate: false });
      }
    } catch (e) {
      // the answers are a nice-to-have: they never hold onboarding up
    }
    onDone();
  };

  return (
    <div className="tdw-obm-content">
      <StepTitle
        title={t('tdw_ob_about_title', 'Tell us about you')}
        description={t(
          'tdw_ob_about_description',
          'Three quick questions so we can fit the app to how you work'
        )}
      />

      <div className="tdw-obm-about">
        {canRename && workspace && (
          <Input
            label={t('tdw_ob_workspace_name', 'Workspace name')}
            hint={t(
              'tdw_ob_workspace_name_hint',
              'Your posts, channels and team live here. You can change it later in settings.'
            )}
            error={
              nameTooShort
                ? t('tdw_ob_workspace_name_short', 'Use at least 3 characters.')
                : undefined
            }
            maxLength={128}
            autoComplete="organization"
            value={workspaceName ?? workspace.name ?? ''}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
        )}
        {(Object.keys(ONBOARDING_QUESTIONS) as OnboardingQuestion[]).map(
          (question) => (
            <div
              key={question}
              className="tdw-obm-section"
              role="group"
              aria-labelledby={`tdw-ob-${question}`}
            >
              <div id={`tdw-ob-${question}`} className="tdw-obm-label-row">
                {questions[question]}
              </div>
              <div className="pz-ob-chips is-start">
                {ONBOARDING_QUESTIONS[question].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="pz-ob-agent"
                    aria-pressed={picked[question] === value}
                    onClick={() =>
                      setPicked((p) => ({ ...p, [question]: value }))
                    }
                  >
                    {labels[question][value]}
                  </button>
                ))}
              </div>
              {picked[question] === 'other' && (
                <Input
                  aria-label={questions[question]}
                  placeholder={t(
                    'tdw_ob_other_placeholder',
                    'Tell us more (optional)'
                  )}
                  maxLength={120}
                  value={other[question]}
                  onChange={(e) =>
                    setOther((o) => ({ ...o, [question]: e.target.value }))
                  }
                />
              )}
              {question === 'role' && business && (
                <div className="tdw-obm-about-pair">
                  <Input
                    label={t('tdw_ob_company', 'Company name (optional)')}
                    maxLength={120}
                    autoComplete="organization"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                  <Input
                    label={t('tdw_ob_website', 'Website (optional)')}
                    maxLength={120}
                    inputMode="url"
                    autoComplete="url"
                    dir="ltr"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Action buttons */}
      <div className="tdw-obm-actions">
        <Button variant="ghost" size="lg" onClick={onSkip} disabled={saving}>
          {t('tdw_ob_skip', 'Skip')}
        </Button>
        <Button
          variant="primary"
          size="lg"
          iconEnd={arrows.next}
          disabled={!complete || nameTooShort}
          loading={saving}
          onClick={save}
        >
          {t('continue', 'Continue')}
        </Button>
      </div>
    </div>
  );
};

const OnboardingStep1: FC<{ onNext: () => void; onSkip: () => void }> = ({
  onNext,
}) => {
  const fetch = useFetch();
  const t = useT();
  const arrows = useArrows();

  const getIntegrations = useCallback(async () => {
    return (await fetch('/integrations')).json();
  }, []);

  const load = useCallback(async (path: string) => {
    const list = (await (await fetch(path)).json()).integrations;
    return list;
  }, []);

  const { data: integrations } = useSWR('/integrations/list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });

  const sortedIntegrations = useMemo(() => {
    return orderBy(
      integrations,
      ['type', 'disabled', 'identifier'],
      ['desc', 'asc', 'asc']
    );
  }, [integrations]);

  const { data } = useSWR('get-all-integrations-onboarding', getIntegrations);

  return (
    <div className="tdw-obm-content">
      <StepTitle
        title={t('connect_your_channels', 'Connect Your Channels')}
        description={t(
          'connect_social_media_to_start',
          'Connect your social media accounts to start scheduling posts'
        )}
      />

      {/* Connected channels */}
      {sortedIntegrations.length > 0 && (
        <div className="tdw-obm-connected">
          <div className="tdw-obm-label-row">
            {t('connected_channels', 'Connected Channels')} (
            {sortedIntegrations.length})
          </div>
          <div className="pz-ob-connected">
            {sortedIntegrations.map((integration: any) => (
              <span key={integration.id} className="pz-ob-chip">
                <span className="pz-ob-chip-av">
                  <img
                    src={integration.picture || '/no-picture.jpg'}
                    alt=""
                  />
                  <img
                    src={`/icons/platforms/${integration.identifier}.png`}
                    alt=""
                  />
                </span>
                <bdi>{integration.name}</bdi>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Available platforms - using AddProviderComponent */}
      <div className="tdw-obm-section">
        <div className="tdw-obm-label-row">
          {t('click_channel_to_add', 'Click a channel to add it')}
        </div>
        {data && (
          <div className="pz-ob-providers">
            <AddProviderComponent
              invite={false}
              social={data.social || []}
              article={data.article || []}
              onboarding={true}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="tdw-obm-actions is-end">
        <Button
          variant={sortedIntegrations.length > 0 ? 'primary' : 'secondary'}
          size="lg"
          iconEnd={arrows.next}
          onClick={onNext}
        >
          {sortedIntegrations.length > 0
            ? t('continue', 'Continue')
            : t('continue_without_channels', 'Continue without channels')}
        </Button>
      </div>
    </div>
  );
};

const onboardingAgents = [
  'Claude',
  'ChatGPT',
  'Claude Code',
  'Cursor',
  'Codex',
  'Grok Bot',
] as const;

type OnboardingAgent = (typeof onboardingAgents)[number];

// Every other MCP client, grouped under one tab with its own picker
const otherTab = 'Other agents' as const;
const otherAgents = mcpClients.filter(
  (client) => !(onboardingAgents as readonly string[]).includes(client)
);

// Not an agent, a tab showing the raw API key for people integrating by hand
const apiTab = 'API' as const;
type OnboardingTab = OnboardingAgent | typeof otherTab | typeof apiTab;

const OnboardingStep2: FC<{
  onBack: () => void;
  onNext: () => void;
}> = ({ onBack, onNext }) => {
  const t = useT();
  const user = useUser();
  const arrows = useArrows();
  const { backendUrl, mcpUrl, mcpOfficialConnectors } = useVariables();
  const brand = useBrandLinks();
  const [tab, setTab] = useState<OnboardingTab>('Claude');
  const [otherAgent, setOtherAgent] = useState<McpClient>(otherAgents[0]);
  // The client the cards describe: the tab itself, or the pick inside "Other agents"
  const agent: AnyMcpClient | typeof apiTab =
    tab === otherTab ? otherAgent : tab;
  const [auth, setAuth] = useState<McpAuth>('oauth');
  const [revealed, setRevealed] = useState(false);
  const mcpBase = mcpUrl || backendUrl;
  const apiKey = user?.publicApi || '';
  const available = !!apiKey && !!user?.tier?.public_api;
  // Tadween: directory connectors sign in through Postiz's cloud, opt-in only
  const officialConnectors = !!mcpOfficialConnectors;
  const cliCommands = fillCliSteps(backendUrl, apiKey).map((step) => step.code);

  const { config, hint } =
    agent === apiTab
      ? { config: '', hint: '' }
      : // the server is listed under the brand's name, and the chat
        // instructions point at this backend's public API
        getMcpConfig(agent, auth, mcpBase, apiKey, backendUrl, brand.slug);

  const maskedConfig =
    revealed || auth === 'oauth' || !apiKey
      ? config
      : config.replace(
          new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          '*'.repeat(apiKey.length)
        );

  const connector =
    agent === 'Claude' && officialConnectors
      ? {
          href: mcpConnectorUrls.Claude,
          label: t('add_to_claude', 'Add to Claude'),
        }
      : agent === 'ChatGPT' && officialConnectors
      ? {
          href: mcpConnectorUrls.ChatGPT,
          label: t('add_to_chatgpt', 'Add to ChatGPT'),
        }
      : agent === 'Cursor' && officialConnectors
      ? {
          href: mcpConnectorUrls.Cursor,
          label: t('add_to_cursor', 'Add to Cursor'),
        }
      : agent === 'Grok Bot' && officialConnectors
      ? {
          href: mcpConnectorUrls['Grok Bot'],
          label: t('add_to_grok_bot', 'Add to Grok Bot'),
        }
      : null;

  const maskedApiKey = revealed ? apiKey : '*'.repeat(apiKey.length);
  // the key stays hidden in the terminal lines too until Reveal
  const shownCliCommands = cliCommands.map((line) =>
    revealed || !apiKey ? line : line.split(apiKey).join(maskedApiKey)
  );

  const revealButton = (
    <Button
      size="sm"
      icon={revealed ? 'eye-off' : 'eye'}
      onClick={() => setRevealed(!revealed)}
    >
      {revealed ? t('hide', 'Hide') : t('reveal', 'Reveal')}
    </Button>
  );

  const chatSection = (
    <section className="pz-ob-panel">
      <header className="pz-ob-panel-head">
        <h3 className="headline">{t('chat', 'Chat')}</h3>
        <p>
          {t(
            'tdw_chat_onboarding_api',
            'No MCP settings needed. Paste this into the chat: the agent asks you for your API key and calls the {{name}} API.',
            { name: brand.name }
          )}
        </p>
      </header>
      <div className="pz-ob-panel-body">
        <pre className="pz-ob-code">{config}</pre>
        <div className="pz-ob-actions">
          <CopyButton text={config} label={t('copy', 'Copy')} />
        </div>
        <div className="pz-ob-hint">{t('api_key', 'API Key')}</div>
        <pre className="pz-ob-code">{maskedApiKey}</pre>
        <div className="pz-ob-actions">
          {revealButton}
          <CopyButton text={apiKey} label={t('copy', 'Copy')} />
        </div>
      </div>
    </section>
  );

  const apiSection = (
    <>
      <section className="pz-ob-panel is-row">
        <header className="pz-ob-panel-head">
          <h3 className="headline">{t('documentation', 'Documentation')}</h3>
          <p>
            {t(
              'api_onboarding_description',
              'Use the {{name}} API from your own code, n8n or any other automation',
              { name: brand.name }
            )}
          </p>
        </header>
        {brand.docs('/public-api/introduction') ? (
          <a
            className="pz-btn pz-btn-primary pz-btn-md no-underline"
            href={brand.docs('/public-api/introduction')}
            target="_blank"
            rel="noreferrer"
          >
            <McpClientIcon client={apiTab} size={18} />
            {t('read_the_api_docs', 'Read the API docs')}
          </a>
        ) : null}
      </section>
      <section className="pz-ob-panel">
        <header className="pz-ob-panel-head">
          <h3 className="headline">{t('api_key', 'API Key')}</h3>
          <p>
            {t(
              'api_key_onboarding_description',
              'Send it as the Authorization header on every request'
            )}
          </p>
        </header>
        <div className="pz-ob-panel-body">
          <pre className="pz-ob-code">{maskedApiKey}</pre>
          <div className="pz-ob-actions">
            {revealButton}
            <CopyButton text={apiKey} label={t('copy', 'Copy')} />
          </div>
        </div>
      </section>
    </>
  );

  const connectorSection = connector && (
    <section className="pz-ob-panel is-row">
      <header className="pz-ob-panel-head">
        <h3 className="headline">{t('connector', 'Connector')}</h3>
        <p>
          {isSelfHosted
            ? t(
                'connector_self_hosted_description',
                'The official connector works with self-hosted {{name}} too. When asked to sign in, choose "Use self-hosted" and enter {{url}} with your API key.',
                {
                  url: mcpBase,
                  name: brand.name,
                  interpolation: { escapeValue: false },
                }
              )
            : t(
                'connector_onboarding_description',
                'The fastest way: add {{name}} with one click, you will be asked to sign in',
                { name: brand.name }
              )}
        </p>
      </header>
      <a
        className="pz-btn pz-btn-primary pz-btn-md no-underline"
        href={connector.href}
        target="_blank"
        rel="noreferrer"
      >
        <McpClientIcon client={agent} size={18} />
        {connector.label}
      </a>
    </section>
  );

  const mcpSection = (
    <section className="pz-ob-panel">
      <header className="pz-ob-panel-head">
        <h3 className="headline">{t('mcp', 'MCP')}</h3>
        <p>
          {t(
            'mcp_onboarding_description',
            'Give your agent {{name}} tools to create, schedule and manage posts',
            { name: brand.name }
          )}
        </p>
      </header>
      <div className="pz-ob-panel-body">
        <div className="pz-ob-hint">{t('auth_method', 'Authentication')}</div>
        <div className="pz-ob-chips is-start">
          {(['oauth', 'apikey'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="pz-ob-agent"
              aria-pressed={auth === m}
              onClick={() => setAuth(m)}
            >
              {m === 'oauth'
                ? t('sign_in_no_api_key', 'Sign in with {{name}} (no API key)', {
                    name: brand.name,
                  })
                : t('api_key', 'API Key')}
            </button>
          ))}
        </div>
        <div className="pz-ob-hint">
          {hint}
          {auth === 'oauth' &&
            ` ${t(
              'oauth_sign_in_hint',
              'Your agent will open a browser window to sign in to {{name}}.',
              { name: brand.name }
            )}`}
        </div>
        <pre className="pz-ob-code">{maskedConfig}</pre>
        <div className="pz-ob-actions">
          {auth === 'apikey' && revealButton}
          <CopyButton text={config} label={t('copy', 'Copy')} />
        </div>
      </div>
    </section>
  );

  const cliSection = (
    <section className="pz-ob-panel">
      <header className="pz-ob-panel-head">
        <h3 className="headline">{t('tdw_terminal', 'Terminal')}</h3>
        <p>
          {t(
            'tdw_cli_onboarding_api',
            'Call the {{name}} API from a terminal or a script with your API key',
            { name: brand.name }
          )}
        </p>
      </header>
      <div className="pz-ob-panel-body">
        <pre className="pz-ob-code">{shownCliCommands.join('\n')}</pre>
        <div className="pz-ob-actions">
          {revealButton}
          <CopyButton
            text={cliCommands.join(' && ')}
            label={t('copy', 'Copy')}
          />
        </div>
      </div>
    </section>
  );

  return (
    <div className="tdw-obm-content">
      <StepTitle
        title={t('connect_your_ai_agent', 'Connect Your AI Agent')}
        description={t(
          'connect_agent_description',
          'Pick the agent you use and let it create and schedule posts for you'
        )}
      />

      {available ? (
        <div className="pz-ob-agents tdw-obm-agents">
          <div className="pz-ob-chips">
            {[...onboardingAgents, otherTab, apiTab].map((item) => (
              <button
                key={item}
                type="button"
                className="pz-ob-agent"
                aria-pressed={tab === item}
                onClick={() => setTab(item)}
              >
                <McpClientIcon client={item} />
                {item === otherTab
                  ? t('other_agents', 'Other agents')
                  : item === apiTab
                  ? t('api', 'API')
                  : item}
              </button>
            ))}
          </div>
          {tab === otherTab && (
            <div className="pz-ob-chips">
              {otherAgents.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="pz-ob-agent is-sm"
                  aria-pressed={otherAgent === item}
                  onClick={() => setOtherAgent(item)}
                >
                  <McpClientIcon client={item} size={14} />
                  {item}
                </button>
              ))}
            </div>
          )}

          {agent === apiTab ? (
            apiSection
          ) : isChatOnlyMcpClient(agent) ? (
            <>
              {connectorSection}
              {chatSection}
            </>
          ) : (
            <>
              {connectorSection}
              <div className="pz-ob-panels">
                {mcpSection}
                {cliSection}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="tdw-obm-note">
          {t(
            'agent_access_unavailable',
            'Agent access is not available for your current plan or role. You can set it up later under Settings > Developers.'
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="tdw-obm-actions">
        <Button size="lg" icon={arrows.back} onClick={onBack}>
          {t('back', 'Back')}
        </Button>
        <div className="tdw-obm-actions-note">
          {t(
            'agent_settings_later',
            'More agents and full instructions are available under Settings > Developers'
          )}
        </div>
        <Button
          variant="primary"
          size="lg"
          icon="circle-check"
          onClick={onNext}
        >
          {t('get_started', 'Get Started')}
        </Button>
      </div>
    </div>
  );
};
