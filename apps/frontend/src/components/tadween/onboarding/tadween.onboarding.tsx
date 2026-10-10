'use client';

// Tadween onboarding: the design system's full-screen Onboarding frame (logo,
// spring progress bar, steps that slide in from the direction of travel and
// mirror in RTL) around Postiz's real steps: connect channels, connect agents,
// watch the tutorial. Connecting a channel still goes through Postiz's
// AddProviderComponent, so every provider flow (OAuth, custom fields, web3,
// browser extension) is unchanged. Replaces OnboardingModal's markup; the
// Postiz file is left as it was for upstream syncs.
import React, { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { orderBy } from 'lodash';
import copy from 'copy-to-clipboard';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { AddProviderComponent } from '@gitroom/frontend/components/launches/add.provider.component';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import {
  AnyMcpClient,
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
import {
  Button,
  cx,
  Icon,
  SegmentedControl,
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import {
  useBrandLinks,
  useFeatures,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';

const LINKEDIN = ['linkedin', 'linkedin-page'];

type Integration = {
  id: string;
  name: string;
  picture?: string;
  identifier: string;
  disabled?: boolean;
  type?: string;
};

const useDir = () => {
  const [rtl, setRtl] = useState(false);
  useEffect(() => {
    setRtl(document.documentElement.getAttribute('dir') === 'rtl');
  }, []);
  return rtl;
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

export const TadweenOnboarding: FC<{ onClose: () => void }> = ({ onClose }) => {
  const t = useT();
  const rtl = useDir();
  const isOn = useFeatures();
  const [step, setStep] = useState(0);
  const [travel, setTravel] = useState(1);
  const connected = useConnected();
  const go = (n: number) => {
    setTravel(n > step ? 1 : -1);
    setStep(n);
  };
  const steps = [
    t('tdw_ob_s_channels', 'Connect channels'),
    t('tdw_ob_s_agents', 'Connect agents'),
    t('tdw_ob_s_tutorial', 'Tutorial'),
  ];
  const back = rtl ? 'arrow-right' : 'arrow-left';
  const forward = rtl ? 'arrow-left' : 'arrow-right';
  const ar = typeof document !== 'undefined' && document.documentElement.lang === 'ar';

  return (
    <TadweenScope className={cx('h-full', ar && 'is-ar')}>
      <style>{`#support-discord {display: none}`}</style>
      <div className="pz-ob">
        <header className="pz-ob-head">
          <span className="pz-ob-logo">
            <Logo />
            <span className="pz-ob-logo-word">Tadween</span>
          </span>
          <ol
            className="pz-ob-progress"
            style={{ ['--steps' as string]: steps.length }}
            aria-label={t('tdw_ob_progress', 'Step {{n}} of {{total}}', {
              n: step + 1,
              total: steps.length,
            })}
          >
            {steps.map((s, i) => (
              <li
                key={s}
                className={cx(i < step && 'is-done', i === step && 'is-current')}
                aria-current={i === step ? 'step' : undefined}
              >
                <span className="pz-ob-bar">
                  <span />
                </span>
                <span className="caption">{s}</span>
              </li>
            ))}
          </ol>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('tdw_ob_skip', 'Skip setup')}
          </Button>
        </header>
        <div className="pz-ob-stage">
          <div
            key={step}
            className={cx('pz-ob-step', step > 0 && 'is-wide')}
            style={{ ['--travel' as string]: travel }}
          >
            {step === 0 ? (
              <ChannelsStep connected={connected} />
            ) : step === 1 ? (
              <AgentsStep />
            ) : (
              <TutorialStep />
            )}
          </div>
        </div>
        <footer className="pz-ob-foot">
          {step > 0 ? (
            <Button variant="ghost" icon={back} onClick={() => go(step - 1)}>
              {t('tdw_back', 'Back')}
            </Button>
          ) : null}
          <span className="pz-ob-foot-note caption">
            {step === 1 && isOn('publicApi')
              ? t(
                  'tdw_ob_agents_later',
                  'More agents and full instructions are in Settings → API & MCP.'
                )
              : null}
          </span>
          {step === 0 && !connected.length ? (
            <Button variant="ghost" onClick={() => go(1)}>
              {t('tdw_ob_without', 'Continue without channels')}
            </Button>
          ) : null}
          {step < 2 ? (
            <Button variant="primary" iconEnd={forward} onClick={() => go(step + 1)}>
              {step === 1 ? t('tdw_ob_continue_skip', 'Continue or skip') : t('tdw_continue', 'Continue')}
            </Button>
          ) : (
            <Button variant="primary" icon="calendar-days" onClick={onClose}>
              {t('tdw_ob_finish', 'Plan my first week')}
            </Button>
          )}
        </footer>
      </div>
    </TadweenScope>
  );
};

/* Step 1: LinkedIn profile and page first, then every other provider */
const ChannelsStep: FC<{ connected: Integration[] }> = ({ connected }) => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const hidden = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const getIntegrations = useCallback(async () => {
    return (await fetch('/integrations')).json();
  }, []);
  const { data } = useSWR('get-all-integrations-onboarding', getIntegrations);
  const social: { identifier: string; name: string }[] = data?.social || [];
  const linkedin = LINKEDIN.map((id) => social.find((s) => s.identifier === id)).filter(
    Boolean
  ) as typeof social;
  const rest = social.filter((s) => !LINKEDIN.includes(s.identifier));
  const article = data?.article || [];

  // The LinkedIn cards press Postiz's own provider tile, so the connect flow
  // (and whatever upstream changes in it) stays Postiz's
  const connect = (identifier: string) => {
    const tile = hidden.current?.querySelector<HTMLElement>(
      `[data-identifier="${identifier}"]`
    );
    if (!tile) return;
    setBusy(identifier);
    tile.click();
    setTimeout(() => setBusy(null), 4000);
  };

  const cardCopy: Record<string, [string, string]> = {
    linkedin: [
      t('tdw_ob_profile', 'LinkedIn profile'),
      user?.name
        ? t('tdw_ob_profile_desc_name', 'Posts as you, {{name}}', { name: user.name })
        : t('tdw_ob_profile_desc', 'Posts as you'),
    ],
    'linkedin-page': [
      t('tdw_ob_page', 'LinkedIn page'),
      t('tdw_ob_page_desc', 'Posts as a company page you admin'),
    ],
  };

  return (
    <>
      <h2 className="title-1">{t('tdw_ob_channels_title', 'Connect where you post')}</h2>
      <p className="pz-ob-lead">
        {t(
          'tdw_ob_channels_lead',
          'Tadween publishes to your LinkedIn profile and the company pages you manage. You can add more later.'
        )}
      </p>
      {!data ? (
        <div className="pz-ob-cards">
          <Skeleton height={72} radius={14} />
          <Skeleton height={72} radius={14} />
        </div>
      ) : (
        <div className="pz-ob-cards">
          {linkedin.map((item) => {
            const done = connected.filter((c) => c.identifier === item.identifier);
            const [title, desc] = cardCopy[item.identifier];
            return (
              <div key={item.identifier} className={cx('pz-ob-card', done.length && 'is-done')}>
                <img
                  src={`/icons/platforms/${item.identifier}.png`}
                  alt=""
                  width={40}
                  height={40}
                  className={item.identifier === 'linkedin-page' ? 'is-square' : ''}
                />
                <div className="pz-ob-card-text">
                  <div className="headline">{title}</div>
                  <div className="caption pz-muted">
                    {done.length ? done.map((d) => d.name).join(', ') : desc}
                  </div>
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
                    variant={item.identifier === 'linkedin' ? 'primary' : 'secondary'}
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
          <AddProviderComponent invite={false} social={linkedin as any} article={[]} onboarding={true} />
        )}
      </div>

      {connected.filter((c) => !LINKEDIN.includes(c.identifier)).length > 0 && (
        <div className="pz-ob-section">
          <h3 className="caption pz-ob-section-title">
            {t('tdw_ob_connected_channels', 'Connected channels')}
          </h3>
          <div className="pz-ob-connected">
            {connected
              .filter((c) => !LINKEDIN.includes(c.identifier))
              .map((c) => (
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

      {(rest.length > 0 || article.length > 0) && (
        <div className="pz-ob-section">
          <h3 className="caption pz-ob-section-title">
            {t('tdw_ob_other_networks', 'Other networks')}
          </h3>
          <div className="pz-ob-providers">
            <AddProviderComponent
              invite={false}
              social={rest as any}
              article={article}
              onboarding={true}
            />
          </div>
        </div>
      )}
    </>
  );
};

/* Step 2: agents — Postiz's MCP / API key / CLI / connectors, restyled */
const onboardingAgents = ['Claude', 'ChatGPT', 'Claude Code', 'Cursor', 'Codex', 'Grok Bot'] as const;
type OnboardingAgent = (typeof onboardingAgents)[number];
const otherTab = 'Other agents' as const;
const otherAgents = mcpClients.filter((c) => !(onboardingAgents as readonly string[]).includes(c));
const apiTab = 'API' as const;
type OnboardingTab = OnboardingAgent | typeof otherTab | typeof apiTab;

const CopyBtn: FC<{ text: string; label: string }> = ({ text, label }) => {
  const toaster = useToaster();
  const t = useT();
  return (
    <Button
      size="sm"
      icon="copy"
      onClick={() => {
        copy(text);
        toaster.show(t('tdw_copied', '{{label}} copied', { label }), 'success');
      }}
    >
      {t('tdw_copy', 'Copy')}
    </Button>
  );
};

const Panel: FC<{ title: ReactNode; desc?: ReactNode; children?: ReactNode; aside?: ReactNode }> = ({
  title,
  desc,
  children,
  aside,
}) => (
  <section className={cx('pz-ob-panel', aside && 'is-row')}>
    <header className="pz-ob-panel-head">
      <h3 className="headline">{title}</h3>
      {desc ? <p>{desc}</p> : null}
    </header>
    {aside}
    {children ? <div className="pz-ob-panel-body">{children}</div> : null}
  </section>
);

const AgentsStep: FC = () => {
  const t = useT();
  const user = useUser();
  const isOn = useFeatures();
  const { backendUrl, mcpUrl, mcpOfficialConnectors } = useVariables();
  const brand = useBrandLinks();
  const [tab, setTab] = useState<OnboardingTab>('Claude');
  const [otherAgent, setOtherAgent] = useState<McpClient>(otherAgents[0]);
  const agent: AnyMcpClient | typeof apiTab = tab === otherTab ? otherAgent : tab;
  const [auth, setAuth] = useState<McpAuth>('oauth');
  const [revealed, setRevealed] = useState(false);
  const mcpBase = mcpUrl || backendUrl;
  const apiKey = user?.publicApi || '';
  // Same conditions as Settings → API & MCP, including the admin's switch
  const apiOn = isOn('publicApi');
  const available = apiOn && !!apiKey && !!user?.tier?.public_api;
  // Directory connectors sign in through Postiz's cloud: opt-in only
  const officialConnectors = !!mcpOfficialConnectors;
  const cliCommands = fillCliSteps(backendUrl, revealed ? apiKey : '*'.repeat(apiKey.length)).map((s) => s.code);
  const cliCopy = fillCliSteps(backendUrl, apiKey).map((s) => s.code);

  const { config, hint } =
    agent === apiTab ? { config: '', hint: '' } : getMcpConfig(agent, auth, mcpBase, apiKey, backendUrl);
  const maskedConfig =
    revealed || auth === 'oauth' || !apiKey
      ? config
      : config.replace(
          new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          '*'.repeat(apiKey.length)
        );
  const maskedApiKey = revealed ? apiKey : '*'.repeat(apiKey.length);
  const connectorFor: Partial<Record<string, string>> = {
    Claude: t('add_to_claude', 'Add to Claude'),
    ChatGPT: t('add_to_chatgpt', 'Add to ChatGPT'),
    Cursor: t('add_to_cursor', 'Add to Cursor'),
    'Grok Bot': t('add_to_grok_bot', 'Add to Grok Bot'),
  };
  const connector =
    officialConnectors && agent in mcpConnectorUrls && connectorFor[agent]
      ? {
          href: mcpConnectorUrls[agent as keyof typeof mcpConnectorUrls],
          label: connectorFor[agent] as string,
        }
      : null;

  const reveal = (
    <Button size="sm" variant="ghost" icon="eye" onClick={() => setRevealed(!revealed)}>
      {revealed ? t('tdw_hide', 'Hide') : t('tdw_reveal', 'Reveal')}
    </Button>
  );
  const keyBlock = (
    <>
      <pre className="pz-ob-code">{maskedApiKey}</pre>
      <div className="pz-ob-actions">
        {reveal}
        <CopyBtn text={apiKey} label={t('tdw_api_key', 'API key')} />
      </div>
    </>
  );

  const connectorPanel = connector && (
    <Panel
      title={t('tdw_connector', 'Connector')}
      desc={
        isSelfHosted
          ? t(
              'connector_self_hosted_description',
              'The official connector works with self-hosted Postiz too. When asked to sign in, choose "Use self-hosted" and enter {{url}} with your API key.',
              { url: mcpBase, interpolation: { escapeValue: false } }
            )
          : t('tdw_connector_desc', 'The fastest way: add it with one click, then sign in.')
      }
      aside={
        <a className="pz-btn pz-btn-primary pz-btn-md no-underline shrink-0" href={connector.href} target="_blank" rel="noreferrer">
          <McpClientIcon client={agent} size={16} />
          {connector.label}
        </a>
      }
    />
  );

  let body: ReactNode;
  if (agent === apiTab) {
    body = (
      <>
        <Panel
          title={t('tdw_documentation', 'Documentation')}
          desc={t('tdw_api_desc', 'Use the API from your own code, n8n or any other automation.')}
          aside={
            brand.docs() ? (
              <a
                className="pz-btn pz-btn-primary pz-btn-md no-underline shrink-0"
                href={brand.docs('/public-api/introduction')}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="external-link" />
                {t('tdw_read_api_docs', 'Read the API docs')}
              </a>
            ) : undefined
          }
        />
        <Panel
          title={t('tdw_api_key', 'API key')}
          desc={t('tdw_api_key_desc', 'Send it as the Authorization header on every request.')}
        >
          {keyBlock}
        </Panel>
      </>
    );
  } else if (isChatOnlyMcpClient(agent)) {
    body = (
      <>
        {connectorPanel}
        <Panel
          title={t('tdw_chat', 'Chat')}
          desc={t(
            'tdw_chat_desc',
            'No MCP or CLI settings needed. Paste this into the chat; the agent installs the CLI and asks for your API key.'
          )}
        >
          <pre className="pz-ob-code">{config}</pre>
          <div className="pz-ob-actions">
            <CopyBtn text={config} label={t('tdw_instructions', 'Instructions')} />
          </div>
          <span className="pz-label">{t('tdw_api_key', 'API key')}</span>
          {keyBlock}
        </Panel>
      </>
    );
  } else {
    body = (
      <>
        {connectorPanel}
        <div className="pz-ob-panels">
          <Panel
            title={t('tdw_mcp', 'MCP')}
            desc={t('tdw_mcp_desc', 'Give your agent tools to create, schedule and manage posts.')}
          >
            <SegmentedControl<McpAuth>
              size="sm"
              label={t('tdw_auth_method', 'Authentication')}
              value={auth}
              onChange={setAuth}
              options={[
                { value: 'oauth', label: t('tdw_sign_in_no_key', 'Sign in (no API key)') },
                { value: 'apikey', label: t('tdw_api_key', 'API key') },
              ]}
            />
            <span className="pz-ob-hint">
              {hint}
              {auth === 'oauth' &&
                ` ${t('tdw_oauth_hint', 'Your agent opens a browser window for you to sign in.')}`}
            </span>
            <pre className="pz-ob-code">{maskedConfig}</pre>
            <div className="pz-ob-actions">
              {auth === 'apikey' && reveal}
              <CopyBtn text={config} label={t('tdw_config', 'Config')} />
            </div>
          </Panel>
          <Panel
            title={t('tdw_cli', 'CLI')}
            desc={t('tdw_cli_desc', 'Install the CLI and the skill that teaches your agent how to use it.')}
          >
            <pre className="pz-ob-code">{cliCommands.join('\n')}</pre>
            <div className="pz-ob-actions">
              {reveal}
              <CopyBtn text={cliCopy.join(' && ')} label={t('tdw_commands', 'Commands')} />
            </div>
          </Panel>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="text-center grid gap-[4px]">
        <h2 className="title-1">{t('tdw_ob_agents_title', 'Connect your AI agent')}</h2>
        <p className="pz-ob-lead">
          {t('tdw_ob_agents_lead', 'Pick the agent you use and let it draft and schedule posts for you.')}
        </p>
      </div>
      {available ? (
        <div className="pz-ob-agents">
          <div className="pz-ob-chips" role="group" aria-label={t('tdw_ob_agents_pick', 'Agent')}>
            {[...onboardingAgents, otherTab, apiTab].map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={tab === item}
                className="pz-ob-agent"
                onClick={() => setTab(item)}
              >
                <McpClientIcon client={item} />
                {item === otherTab ? t('tdw_other_agents', 'Other agents') : item}
              </button>
            ))}
          </div>
          {tab === otherTab && (
            <div className="pz-ob-chips">
              {otherAgents.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={otherAgent === item}
                  className="pz-ob-agent is-sm"
                  onClick={() => setOtherAgent(item)}
                >
                  <McpClientIcon client={item} size={14} />
                  {item}
                </button>
              ))}
            </div>
          )}
          <div key={agent} className="grid gap-[16px]">
            {body}
          </div>
        </div>
      ) : (
        <div className="pz-ob-panel">
          <div className="pz-ob-panel-body text-center">
            <p className="pz-muted m-0">
              {apiOn
                ? t(
                    'tdw_agent_unavailable',
                    'Agent access is not on your current plan or role. You can set it up later in Settings → API & MCP.'
                  )
                : t(
                    'tdw_agent_disabled',
                    'Agent access through the API and MCP is turned off.'
                  )}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

/* Step 3: the tutorial video */
const TutorialStep: FC = () => {
  const t = useT();
  // Tadween: our own video from /admin → Branding; without one, a short wrap-up
  const { tutorialVideoUrl } = useBrandLinks();
  if (!tutorialVideoUrl) {
    return (
      <div className="text-center grid gap-[4px]">
        <h2 className="title-1">{t('tdw_ob_done_title', 'You’re all set')}</h2>
        <p className="pz-ob-lead">
          {t('tdw_ob_done_lead', 'Head to your calendar and schedule your first post.')}
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="text-center grid gap-[4px]">
        <h2 className="title-1">{t('tdw_ob_tutorial_title', 'Watch the tutorial')}</h2>
        <p className="pz-ob-lead">
          {t('tdw_ob_tutorial_lead', 'A short video on getting the most out of scheduling.')}
        </p>
      </div>
      <div className="pz-ob-video mx-auto max-w-[880px]">
        <iframe
          src={tutorialVideoUrl}
          title={t('tdw_tutorial', 'Tutorial')}
          allow="autoplay"
          allowFullScreen
        />
      </div>
    </>
  );
};
