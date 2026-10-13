'use client';

// Tadween: Postiz's onboarding modal (Connect Channels → Connect Agents →
// Watch Tutorial), same steps, fields and copy, in the design system's
// components and tokens. Full screen (onboarding.tsx), a full-screen sheet on
// phones, mirrored in Arabic. The tutorial is the video from Branding; the
// step is left out when there is none.
import React, { FC, Fragment, useCallback, useMemo, useState } from 'react';
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
import {
  Button,
  cx,
  IconButton,
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

export const OnboardingModal: FC<OnboardingModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const modals = useModals();
  const t = useT();
  const { i18n } = useTranslation();
  const { tutorialVideoUrl } = useBrandLinks();
  const video = tutorialVideoUrl ? embedUrl(tutorialVideoUrl) : null;

  const steps = useMemo(
    () => [
      t('connect_channels', 'Connect Channels'),
      t('connect_agents', 'Connect Agents'),
      ...(video ? [t('watch_tutorial', 'Watch Tutorial')] : []),
    ],
    [t, video]
  );

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
          <ol className="tdw-obm-steps">
            {steps.map((label, index) => (
              <Fragment key={label}>
                {index > 0 && (
                  <li className="tdw-obm-line" aria-hidden="true" />
                )}
                <li
                  className={cx(
                    'tdw-obm-step',
                    step === index + 1 && 'is-current',
                    step > index + 1 && 'is-done'
                  )}
                  aria-current={step === index + 1 ? 'step' : undefined}
                >
                  <span className="tdw-obm-num">{index + 1}</span>
                  <span className="tdw-obm-label">{label}</span>
                </li>
              </Fragment>
            ))}
          </ol>

          {/* Step content */}
          {step === 1 && (
            <OnboardingStep1
              onNext={() => setStep(2)}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <OnboardingStep2
              onBack={() => setStep(1)}
              onNext={video ? () => setStep(3) : onClose}
              last={!video}
            />
          )}
          {step === 3 && video && (
            <OnboardingStep3
              video={video}
              onBack={() => setStep(2)}
              onFinish={onClose}
            />
          )}
        </div>
      </div>
    </TadweenScope>
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
                {integration.name}
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
  // no tutorial video: this step finishes onboarding
  last: boolean;
}> = ({ onBack, onNext, last }) => {
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
      : getMcpConfig(agent, auth, mcpBase, apiKey);

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
            'chat_onboarding_description',
            'No MCP or CLI settings needed. Paste this into the chat, the agent installs the {{name}} CLI and asks you for your API key.',
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
        <h3 className="headline">{t('cli', 'CLI')}</h3>
        <p>
          {t(
            'cli_onboarding_description',
            'Install the {{name}} CLI and the skill that teaches your agent how to use it',
            { name: brand.name }
          )}
        </p>
      </header>
      <div className="pz-ob-panel-body">
        <pre className="pz-ob-code">{cliCommands.join('\n')}</pre>
        <div className="pz-ob-actions">
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
          icon={last ? 'circle-check' : undefined}
          iconEnd={last ? undefined : arrows.next}
          onClick={onNext}
        >
          {last
            ? t('get_started', 'Get Started')
            : t('continue_skip', 'Continue / Skip')}
        </Button>
      </div>
    </div>
  );
};

const OnboardingStep3: FC<{
  video: string;
  onBack: () => void;
  onFinish: () => void;
}> = ({ video, onBack, onFinish }) => {
  const t = useT();
  const arrows = useArrows();
  const brand = useBrandLinks();

  return (
    <div className="tdw-obm-content">
      <StepTitle
        title={t('watch_tutorial_title', 'Learn How to Use {{name}}', {
          name: brand.name,
        })}
        description={t(
          'watch_tutorial_description',
          'Watch this short video to learn how to get the most out of {{name}}',
          { name: brand.name }
        )}
      />

      {/* The tutorial video from Branding */}
      <div className="pz-ob-video tdw-obm-video">
        <iframe
          src={video}
          title={t('tdw_ob_tutorial_video', 'Tadween tutorial')}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Action buttons */}
      <div className="tdw-obm-actions">
        <Button size="lg" icon={arrows.back} onClick={onBack}>
          {t('back', 'Back')}
        </Button>
        <Button
          variant="primary"
          size="lg"
          icon="circle-check"
          onClick={onFinish}
        >
          {t('get_started', 'Get Started')}
        </Button>
      </div>
    </div>
  );
};
