'use client';

import React, { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import copy from 'copy-to-clipboard';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useInstanceSettings } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { McpClientIcon } from '@gitroom/frontend/components/public-api/mcp.client.icons';
import { getMcpOauthUrl } from '@gitroom/frontend/components/public-api/public.component';
import { DeveloperComponent } from '@gitroom/frontend/components/developer/developer.component';
import {
  TadweenSheet,
  usePhoneLayout,
} from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';
import {
  Banner,
  Button,
  Dialog,
  EmptyState,
  Icon,
  IconButton,
  Pill,
  SegmentedControl,
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import {
  SettingsListRow,
  SettingsRow,
  SettingsSection,
} from '@gitroom/frontend/components/tadween/settings/settings.nav';

// Tadween settings, Developers group: API & MCP and Approved apps. Same
// endpoints as Postiz's PublicComponent and ApprovedAppsComponent (the key
// comes from /user/self, rotation is POST /user/api-key/rotate, approved apps
// are /user/approved-apps), laid out as one page that explains each way in:
// the MCP server (API key or OAuth sign-in), the CLI, and the public API.
//
// Every address below is built from this instance's URLs and matches what the
// backend serves (libraries/nestjs-libraries/src/chat/start.mcp.ts and
// apps/backend/src/public-api): `/mcp` takes `Authorization: Bearer <key>`,
// `/mcp-oauth-dynamic` signs in with OAuth (the client registers itself), and
// `/public/v1/*` takes the raw key with no "Bearer". The key never goes into a
// URL: clients that can't send headers use OAuth instead.

const KEY_PLACEHOLDER = 'YOUR_API_KEY';

// What the key looks like until revealed: only the last 4 characters stay,
// so people can tell two keys apart without any of the start being shown
const maskKey = (key: string) =>
  key.length > 8 ? `${'•'.repeat(16)}${key.slice(-4)}` : '•'.repeat(16);

const useCopy = () => {
  const t = useT();
  const toaster = useToaster();
  return useCallback(
    (text: string) => {
      copy(text);
      toaster.show(t('tdw_api_copied', 'Copied'), 'success');
    },
    [t, toaster]
  );
};

// A config or command to paste. The key shows masked unless `revealed`; the
// copy button always copies the real text.
const CodeBlock: FC<{
  code: string;
  secret?: string;
  revealed?: boolean;
  label?: string;
}> = ({ code, secret, revealed, label }) => {
  const t = useT();
  const copyText = useCopy();
  const shown =
    secret && !revealed ? code.split(secret).join(maskKey(secret)) : code;
  return (
    <div className="tdw-api-code">
      {label ? <span className="tdw-api-code-label">{label}</span> : null}
      <pre className="tdw-set-ltr">
        <code>{shown}</code>
      </pre>
      <IconButton
        className="tdw-api-code-copy"
        icon="copy"
        size="sm"
        label={t('tdw_api_copy', 'Copy')}
        onClick={() => copyText(code)}
      />
    </div>
  );
};

// A value on one line (an address, a header) with a copy button
const CopyField: FC<{ value: string; shown?: string; label: string }> = ({
  value,
  shown,
  label,
}) => {
  const copyText = useCopy();
  return (
    <span className="tdw-api-field">
      <code className="tdw-set-ltr">{shown ?? value}</code>
      <IconButton
        icon="copy"
        size="sm"
        label={label}
        onClick={() => copyText(value)}
      />
    </span>
  );
};

// The addresses and names every guide is built from
interface ConnectContext {
  name: string;
  slug: string;
  mcp: string;
  oauth: string;
  backend: string;
  api: string;
  key: string;
  hasKey: boolean;
}

const useConnectContext = (): ConnectContext => {
  const user = useUser();
  const { backendUrl, mcpUrl } = useVariables();
  const { data: instance } = useInstanceSettings();
  return useMemo(() => {
    const name = instance?.branding?.instanceName || 'Tadween';
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'tadween';
    const backend = (backendUrl || '').replace(/\/+$/, '');
    const mcpBase = (mcpUrl || backend).replace(/\/+$/, '');
    return {
      name,
      slug,
      mcp: `${mcpBase}/mcp`,
      oauth: getMcpOauthUrl(mcpBase),
      backend,
      api: `${backend}/public/v1`,
      key: user?.publicApi || KEY_PLACEHOLDER,
      hasKey: !!user?.publicApi,
    };
  }, [instance, backendUrl, mcpUrl, user?.publicApi]);
};

const json = (value: object) => JSON.stringify(value, null, 2);

// ── Guides ──────────────────────────────────────────────────────────────────
interface GuideStep {
  text: ReactNode;
  code?: string;
  label?: string;
}

interface GuideMethod {
  value: string;
  label: string;
  // what the method needs: the API key (masked in snippets), a sign-in, or
  // neither (a webhook this server calls)
  auth: 'oauth' | 'key' | 'none';
  os?: { value: string; label: string }[];
  steps: (os: string) => GuideStep[];
  note?: string;
}

interface ClientGuide {
  id: string;
  name: string;
  icon: ReactNode;
  summary: string;
  methods: GuideMethod[];
  test?: string;
  tips: string[];
}

const clientIcon = (client: string) => (
  <McpClientIcon client={client} size={20} />
);

const useClientGuides = (c: ConnectContext): ClientGuide[] => {
  const t = useT();
  return useMemo(() => {
    const bearer = `Bearer ${c.key}`;
    const vars = { name: c.name, interpolation: { escapeValue: false } };
    const testPrompt = t(
      'tdw_api_test_prompt',
      'List my {{name}} channels',
      vars
    );
    const reachable = t(
      'tdw_api_reachable_note',
      'The assistant connects from its own servers, so {{url}} must be reachable from the internet over HTTPS. It works on your live server, not on localhost.',
      { url: c.oauth, interpolation: { escapeValue: false } }
    );
    const tipKey = t(
      'tdw_api_tip_401',
      '"Invalid API Key" or 401: the key was rotated or pasted with a space. Copy it again from this page.'
    );
    const tipRestart = t(
      'tdw_api_tip_restart',
      'The tools don’t show up: restart the app or reload its MCP servers after saving the config.'
    );
    const tipWorkspace = t(
      'tdw_api_tip_workspace',
      'Wrong channels: the key belongs to the workspace that is open now. Switch workspace to copy another workspace’s key.'
    );
    const tipSignIn = t(
      'tdw_api_tip_signin',
      'The sign-in window says the app is unknown or closes: remove the connector and add it again, then approve it while you are signed in to {{name}}.',
      vars
    );
    const tipRevoke = t(
      'tdw_api_tip_revoke',
      'To disconnect an assistant that signed in, revoke it under Approved apps.'
    );
    const os = [
      { value: 'mac', label: 'macOS' },
      { value: 'windows', label: 'Windows' },
    ];
    const osLinux = [
      { value: 'mac', label: 'macOS / Linux' },
      { value: 'windows', label: 'Windows' },
    ];

    // Claude Desktop runs local (stdio) servers from its config file, so the
    // HTTP endpoint goes through the mcp-remote bridge; the key stays in env
    const desktopArgs = [
      '-y',
      'mcp-remote',
      c.mcp,
      '--header',
      'Authorization:${AUTH_HEADER}',
      // mcp-remote refuses plain http unless told (local installs)
      ...(c.mcp.startsWith('http://') ? ['--allow-http'] : []),
    ];

    return [
      {
        id: 'claude',
        name: 'Claude',
        icon: clientIcon('Claude'),
        summary: t('tdw_api_claude_summary', 'claude.ai and Claude Desktop'),
        methods: [
          {
            value: 'connector',
            label: t('tdw_api_method_connector', 'Connector (sign in)'),
            auth: 'oauth',
            note: reachable,
            steps: () => [
              {
                text: t(
                  'tdw_api_claude_s1',
                  'In Claude (web or desktop), open Settings → Connectors. On Team and Enterprise plans an owner adds it under Organization settings → Connectors.'
                ),
              },
              {
                text: t(
                  'tdw_api_claude_s2',
                  'Click Add custom connector, name it {{name}} and paste this URL:',
                  vars
                ),
                code: c.oauth,
              },
              {
                text: t(
                  'tdw_api_claude_s3',
                  'Click Add, then Connect. A {{name}} window opens: sign in and approve access to this workspace.',
                  vars
                ),
              },
              {
                text: t(
                  'tdw_api_claude_s4',
                  'In a chat, open the Search and tools menu and make sure {{name}} is on.',
                  vars
                ),
              },
            ],
          },
          {
            value: 'desktop',
            label: t('tdw_api_method_desktop', 'Desktop config (API key)'),
            auth: 'key',
            os,
            steps: (system) => [
              {
                text: t(
                  'tdw_api_desktop_s1',
                  'Install Node.js 18 or newer. Claude Desktop starts the connection with npx.'
                ),
              },
              {
                text: t(
                  'tdw_api_desktop_s2',
                  'In Claude Desktop open Settings → Developer → Edit Config. It opens this file:'
                ),
                code:
                  system === 'windows'
                    ? '%APPDATA%\\Claude\\claude_desktop_config.json'
                    : '~/Library/Application Support/Claude/claude_desktop_config.json',
              },
              {
                text: t(
                  'tdw_api_desktop_s3',
                  'Add the server (keep any servers already in mcpServers) and save:'
                ),
                code: json({
                  mcpServers: {
                    [c.slug]: {
                      command: 'npx',
                      args: desktopArgs,
                      env: { AUTH_HEADER: bearer },
                    },
                  },
                }),
              },
              {
                text: t(
                  'tdw_api_desktop_s4',
                  'Quit Claude Desktop completely and open it again. {{name}} appears in the tools menu.',
                  vars
                ),
              },
            ],
          },
        ],
        test: testPrompt,
        tips: [reachable, tipSignIn, tipRevoke],
      },
      {
        id: 'claude-code',
        name: 'Claude Code',
        icon: clientIcon('Claude Code'),
        summary: t('tdw_api_cli_summary', 'One command in the terminal'),
        methods: [
          {
            value: 'key',
            label: t('tdw_api_method_key', 'API key'),
            auth: 'key',
            steps: () => [
              {
                text: t(
                  'tdw_api_cc_s1',
                  'Run this in your terminal. Add --scope user to use it in every project.'
                ),
                code: `claude mcp add --transport http ${c.slug} ${c.mcp} --header "Authorization: ${bearer}"`,
              },
              {
                text: t(
                  'tdw_api_cc_s2',
                  'Check it: {{name}} should say Connected.',
                  vars
                ),
                code: 'claude mcp list',
              },
            ],
          },
          {
            value: 'oauth',
            label: t('tdw_api_method_signin', 'Sign in (no key)'),
            auth: 'oauth',
            steps: () => [
              {
                text: t('tdw_api_cc_o1', 'Run this in your terminal:'),
                code: `claude mcp add --transport http ${c.slug} ${c.oauth}`,
              },
              {
                text: t(
                  'tdw_api_cc_o2',
                  'Start Claude Code, type /mcp, pick {{slug}} and choose Authenticate. Sign in to {{name}} in the browser and approve.',
                  { ...vars, slug: c.slug }
                ),
              },
            ],
          },
        ],
        test: testPrompt,
        tips: [tipKey, tipWorkspace, tipRevoke],
      },
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        icon: clientIcon('ChatGPT'),
        summary: t('tdw_api_chatgpt_summary', 'Custom connector, sign in'),
        methods: [
          {
            value: 'connector',
            label: t('tdw_api_method_connector', 'Connector (sign in)'),
            auth: 'oauth',
            note: reachable,
            steps: () => [
              {
                text: t(
                  'tdw_api_gpt_s1',
                  'In ChatGPT open Settings → Apps & Connectors → Advanced settings and turn on Developer mode. It needs a plan that allows custom connectors.'
                ),
              },
              {
                text: t(
                  'tdw_api_gpt_s2',
                  'Back in Apps & Connectors click Create. Name it {{name}}, choose OAuth for authentication and paste this MCP server URL:',
                  vars
                ),
                code: c.oauth,
              },
              {
                text: t(
                  'tdw_api_gpt_s3',
                  'Confirm you trust it and click Create. Sign in to {{name}} in the window that opens and approve.',
                  vars
                ),
              },
              {
                text: t(
                  'tdw_api_gpt_s4',
                  'In a new chat, open the + menu and add {{name}} to the conversation.',
                  vars
                ),
              },
            ],
          },
        ],
        test: testPrompt,
        tips: [reachable, tipSignIn, tipRevoke],
      },
      {
        id: 'cursor',
        name: 'Cursor',
        icon: clientIcon('Cursor'),
        summary: t('tdw_api_json_summary', 'Paste a JSON config'),
        methods: [
          {
            value: 'key',
            label: t('tdw_api_method_key', 'API key'),
            auth: 'key',
            steps: () => [
              {
                text: t(
                  'tdw_api_cursor_s1',
                  'Open Cursor Settings → MCP and click New MCP server. It opens ~/.cursor/mcp.json (for one project only, use .cursor/mcp.json in that project).'
                ),
              },
              {
                text: t('tdw_api_paste_save', 'Paste this and save:'),
                code: json({
                  mcpServers: {
                    [c.slug]: { url: c.mcp, headers: { Authorization: bearer } },
                  },
                }),
              },
              {
                text: t(
                  'tdw_api_cursor_s3',
                  'Back in Settings → MCP, {{name}} turns green with its tools listed.',
                  vars
                ),
              },
            ],
          },
          {
            value: 'oauth',
            label: t('tdw_api_method_signin', 'Sign in (no key)'),
            auth: 'oauth',
            steps: () => [
              {
                text: t(
                  'tdw_api_cursor_o1',
                  'Open Cursor Settings → MCP, click New MCP server, paste this and save:'
                ),
                code: json({ mcpServers: { [c.slug]: { url: c.oauth } } }),
              },
              {
                text: t(
                  'tdw_api_cursor_o2',
                  'Click Login next to {{name}}, sign in in the browser and approve.',
                  vars
                ),
              },
            ],
          },
        ],
        test: testPrompt,
        tips: [tipKey, tipRestart, tipWorkspace],
      },
      {
        id: 'vscode',
        name: 'VS Code',
        icon: clientIcon('VS Code / Copilot'),
        summary: t('tdw_api_vscode_summary', 'GitHub Copilot agent mode'),
        methods: [
          {
            value: 'key',
            label: t('tdw_api_method_key', 'API key'),
            auth: 'key',
            steps: () => [
              {
                text: t(
                  'tdw_api_vscode_s1',
                  'Create .vscode/mcp.json in your project, or run MCP: Open User Configuration from the Command Palette to use it everywhere.'
                ),
              },
              {
                text: t(
                  'tdw_api_vscode_s2',
                  'Paste this and save. The key is not written in the file: VS Code asks for it once and keeps it in its secret storage.'
                ),
                code: json({
                  inputs: [
                    {
                      type: 'promptString',
                      id: `${c.slug}-api-key`,
                      description: `${c.name} API key`,
                      password: true,
                    },
                  ],
                  servers: {
                    [c.slug]: {
                      type: 'http',
                      url: c.mcp,
                      headers: {
                        Authorization: `Bearer \${input:${c.slug}-api-key}`,
                      },
                    },
                  },
                }),
              },
              {
                text: t(
                  'tdw_api_vscode_s3',
                  'Click Start above the server and paste your API key when asked:'
                ),
                code: c.key,
              },
              {
                text: t(
                  'tdw_api_vscode_s4',
                  'Open Copilot Chat, switch to Agent mode and check that {{name}} is ticked in the tools picker.',
                  vars
                ),
              },
            ],
          },
          {
            value: 'oauth',
            label: t('tdw_api_method_signin', 'Sign in (no key)'),
            auth: 'oauth',
            steps: () => [
              {
                text: t(
                  'tdw_api_vscode_o1',
                  'Add this to .vscode/mcp.json (or your user configuration) and save:'
                ),
                code: json({
                  servers: { [c.slug]: { type: 'http', url: c.oauth } },
                }),
              },
              {
                text: t(
                  'tdw_api_vscode_o2',
                  'Click Start. VS Code asks to sign in: allow it, sign in to {{name}} and approve.',
                  vars
                ),
              },
            ],
          },
        ],
        test: testPrompt,
        tips: [tipKey, tipRestart, tipWorkspace],
      },
      {
        id: 'windsurf',
        name: 'Windsurf',
        icon: clientIcon('Windsurf'),
        summary: t('tdw_api_json_summary', 'Paste a JSON config'),
        methods: [
          {
            value: 'key',
            label: t('tdw_api_method_key', 'API key'),
            auth: 'key',
            os: osLinux,
            steps: (system) => [
              {
                text: t(
                  'tdw_api_windsurf_s1',
                  'In Windsurf open Settings → Cascade → MCP servers and choose View raw config. It opens this file:'
                ),
                code:
                  system === 'windows'
                    ? '%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json'
                    : '~/.codeium/windsurf/mcp_config.json',
              },
              {
                text: t('tdw_api_paste_save', 'Paste this and save:'),
                code: json({
                  mcpServers: {
                    [c.slug]: {
                      serverUrl: c.mcp,
                      headers: { Authorization: bearer },
                    },
                  },
                }),
              },
              {
                text: t(
                  'tdw_api_windsurf_s3',
                  'Click Refresh in the MCP servers panel. {{name}} shows its tools.',
                  vars
                ),
              },
            ],
          },
        ],
        test: testPrompt,
        tips: [tipKey, tipRestart, tipWorkspace],
      },
      {
        id: 'n8n',
        name: 'n8n',
        icon: <Icon name="workflow" size={20} />,
        summary: t('tdw_api_n8n_summary', 'AI agent tool or a node'),
        methods: [
          {
            value: 'mcp',
            label: t('tdw_api_method_n8n_mcp', 'AI Agent (MCP)'),
            auth: 'key',
            steps: () => [
              {
                text: t(
                  'tdw_api_n8n_s1',
                  'In an AI Agent node, add a tool and choose MCP Client Tool.'
                ),
              },
              {
                text: t(
                  'tdw_api_n8n_s2',
                  'Endpoint: paste this URL, and set Server Transport to HTTP Streamable.'
                ),
                code: c.mcp,
              },
              {
                text: t(
                  'tdw_api_n8n_s3',
                  'Authentication: Bearer Auth. Create a credential and paste your API key as the token:'
                ),
                code: c.key,
              },
              {
                text: t(
                  'tdw_api_n8n_s4',
                  'Leave Tools to Include on All and run the workflow.'
                ),
              },
            ],
          },
          {
            value: 'node',
            label: t('tdw_api_method_n8n_node', 'Community node (API)'),
            auth: 'key',
            steps: () => [
              {
                text: t(
                  'tdw_api_n8n_n1',
                  'In n8n open Settings → Community nodes → Install and enter:'
                ),
                code: 'n8n-nodes-postiz',
              },
              {
                text: t(
                  'tdw_api_n8n_n2',
                  'Create its credential. Host is this server, without /public/v1:'
                ),
                code: c.backend,
              },
              {
                text: t(
                  'tdw_api_n8n_n3',
                  'API Key is your key as it is (no "Bearer"). Save: n8n tests the connection for you.'
                ),
                code: c.key,
              },
            ],
          },
        ],
        tips: [tipKey, tipWorkspace],
      },
      {
        id: 'automations',
        name: 'Make & Zapier',
        icon: <Icon name="zap" size={20} />,
        summary: t('tdw_api_make_summary', 'HTTP requests and webhooks'),
        methods: [
          {
            value: 'api',
            label: t('tdw_api_method_http', 'Send to {{name}}', vars),
            auth: 'key',
            steps: () => [
              {
                text: t(
                  'tdw_api_make_s1',
                  'Add an HTTP step: in Make, HTTP → Make a request; in Zapier, Webhooks by Zapier → Custom Request.'
                ),
              },
              {
                text: t(
                  'tdw_api_make_s2',
                  'Method POST, and this URL:'
                ),
                code: `${c.api}/posts`,
              },
              {
                text: t(
                  'tdw_api_make_s3',
                  'Add the header Authorization with your key as it is (no "Bearer"), and Content-Type: application/json.'
                ),
                code: `Authorization: ${c.key}`,
              },
              {
                text: t(
                  'tdw_api_make_s4',
                  'Body (JSON). Use a channel id from GET /integrations, and "schedule" instead of "draft" to publish at the date:'
                ),
                code: json({
                  type: 'draft',
                  date: '2026-12-01T09:00:00.000Z',
                  shortLink: false,
                  tags: [],
                  posts: [
                    {
                      integration: { id: 'CHANNEL_ID' },
                      value: [{ content: 'Hello from Make', image: [] }],
                      settings: {},
                    },
                  ],
                }),
              },
            ],
          },
          {
            value: 'webhook',
            label: t('tdw_api_method_webhook', 'React to {{name}}', vars),
            auth: 'none',
            steps: () => [
              {
                text: t(
                  'tdw_api_make_w1',
                  'Create a trigger that gives you a URL: in Make, Webhooks → Custom webhook; in Zapier, Webhooks by Zapier → Catch Hook.'
                ),
              },
              {
                text: t(
                  'tdw_api_make_w2',
                  'In {{name}} open Settings → Webhooks, add a webhook with that URL and pick the channels.',
                  vars
                ),
              },
              {
                text: t(
                  'tdw_api_make_w3',
                  'Each time a post is published, {{name}} sends the post to the URL. Use Send test to see the fields.',
                  vars
                ),
              },
            ],
          },
        ],
        tips: [tipKey, tipWorkspace],
      },
      {
        id: 'cli',
        name: t('tdw_api_cli_name', 'Terminal (CLI)'),
        icon: <Icon name="terminal" size={20} />,
        summary: t('tdw_api_cli_tile', 'Scripts, CI and coding agents'),
        methods: [
          {
            value: 'cli',
            label: t('tdw_api_method_key', 'API key'),
            auth: 'key',
            os: osLinux,
            steps: (system) => [
              {
                text: t('tdw_api_cli_s1', 'Install the CLI (needs Node.js 18 or newer):'),
                code: 'npm install -g postiz',
              },
              {
                text: t(
                  'tdw_api_cli_s2',
                  'Point it at this server and give it your key:'
                ),
                code:
                  system === 'windows'
                    ? `$env:POSTIZ_API_URL = "${c.backend}"\n$env:POSTIZ_API_KEY = "${c.key}"`
                    : `export POSTIZ_API_URL="${c.backend}"\nexport POSTIZ_API_KEY="${c.key}"`,
              },
              {
                text: t('tdw_api_cli_s3', 'Try it: this lists your channels.'),
                code: 'postiz integrations:list',
              },
              {
                text: t(
                  'tdw_api_cli_s4',
                  'Optional: teach your coding agent (Claude Code, Codex, Cursor…) to use the CLI:'
                ),
                code: 'npx skills add gitroomhq/postiz-agent',
              },
            ],
          },
        ],
        tips: [
          tipKey,
          t(
            'tdw_api_tip_cli_url',
            'Requests go to api.postiz.com: POSTIZ_API_URL is not set in this terminal. Set it again, or add both lines to your shell profile.'
          ),
        ],
      },
      {
        id: 'grok',
        name: 'Grok',
        icon: clientIcon('Grok Bot'),
        summary: t('tdw_api_grok_summary', 'Paste instructions in the chat'),
        methods: [
          {
            value: 'chat',
            label: t('tdw_api_method_chat', 'Chat instructions'),
            auth: 'key',
            steps: () => [
              {
                text: t(
                  'tdw_api_grok_s1',
                  'Paste this into Grok. It installs the CLI, points it at this server and asks you for the key:'
                ),
                code: `Install the CLI with \`npm install -g postiz\`, then install the skill with \`npx skills add gitroomhq/postiz-agent\`. Set the POSTIZ_API_URL environment variable to ${c.backend}, then ask me for my API key and set it as the POSTIZ_API_KEY environment variable before using the CLI.`,
              },
              {
                text: t(
                  'tdw_api_grok_s2',
                  'When Grok asks for the key, paste it in the chat:'
                ),
                code: c.key,
              },
            ],
          },
        ],
        test: testPrompt,
        tips: [
          tipKey,
          t(
            'tdw_api_tip_grok',
            'Rotate the key when you are done if you pasted it into a chat you share with others.'
          ),
        ],
      },
      {
        id: 'other',
        name: t('tdw_api_other_name', 'Other MCP clients'),
        icon: <Icon name="plug" size={20} />,
        summary: t('tdw_api_other_summary', 'Codex, Gemini CLI, Warp and more'),
        methods: [
          {
            value: 'key',
            label: t('tdw_api_method_key', 'API key'),
            auth: 'key',
            steps: () => [
              {
                text: t(
                  'tdw_api_other_s1',
                  'Add a remote server of type Streamable HTTP with this URL:'
                ),
                code: c.mcp,
              },
              {
                text: t('tdw_api_other_s2', 'Send this header with every request:'),
                code: `Authorization: ${bearer}`,
              },
            ],
          },
          {
            value: 'oauth',
            label: t('tdw_api_method_signin', 'Sign in (no key)'),
            auth: 'oauth',
            steps: () => [
              {
                text: t(
                  'tdw_api_other_o1',
                  'If the client supports OAuth for MCP servers, use this URL with no header. It registers itself and opens a sign-in window:'
                ),
                code: c.oauth,
              },
            ],
          },
        ],
        test: testPrompt,
        tips: [tipKey, tipRestart],
      },
    ];
  }, [c, t]);
};

// One guide: the method and OS switches, numbered steps with copyable
// snippets, how to test it and what to do when it doesn't work
const GuideBody: FC<{ guide: ClientGuide; context: ConnectContext }> = ({
  guide,
  context,
}) => {
  const t = useT();
  const [methodValue, setMethodValue] = useState(guide.methods[0].value);
  const method =
    guide.methods.find((m) => m.value === methodValue) || guide.methods[0];
  const [system, setSystem] = useState(method.os?.[0]?.value || '');
  const [revealed, setRevealed] = useState(false);
  const steps = method.steps(method.os ? system || method.os[0].value : '');
  const secret = method.auth === 'key' && context.hasKey ? context.key : undefined;

  return (
    <div className="tdw-api-guide">
      {guide.methods.length > 1 || method.os || secret ? (
        <div className="tdw-api-guide-bar">
          {guide.methods.length > 1 ? (
            <SegmentedControl
              size="sm"
              label={t('tdw_api_how', 'How to connect')}
              value={method.value}
              onChange={(value) => {
                setMethodValue(value);
                const next = guide.methods.find((m) => m.value === value);
                setSystem(next?.os?.[0]?.value || '');
              }}
              options={guide.methods.map((m) => ({
                value: m.value,
                label: m.label,
                icon: m.auth === 'key' ? 'key-round' : undefined,
              }))}
            />
          ) : null}
          {method.os ? (
            <SegmentedControl
              size="sm"
              label={t('tdw_api_os', 'Operating system')}
              value={system || method.os[0].value}
              onChange={setSystem}
              options={method.os}
            />
          ) : null}
          {secret ? (
            <Button
              variant="ghost"
              size="sm"
              icon={revealed ? 'eye-off' : 'eye'}
              onClick={() => setRevealed(!revealed)}
            >
              {revealed
                ? t('tdw_api_hide_key', 'Hide key')
                : t('tdw_api_show_key', 'Show key')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {method.auth === 'key' && !context.hasKey ? (
        <Banner
          tone="info"
          title={t('tdw_api_need_key', 'This way needs the API key.')}
        >
          {t(
            'tdw_api_need_key_body',
            'Only workspace admins can see it. Ask an admin, or pick a sign-in option.'
          )}
        </Banner>
      ) : null}

      <ol className="tdw-api-steps">
        {steps.map((step, index) => (
          <li key={index} className="tdw-api-step">
            <span className="tdw-api-step-n" aria-hidden="true">
              {index + 1}
            </span>
            <div className="tdw-api-step-body">
              <p>{step.text}</p>
              {step.code ? (
                <CodeBlock
                  code={step.code}
                  secret={secret}
                  revealed={revealed}
                  label={step.label}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {method.note ? (
        <p className="tdw-api-note">
          <Icon name="info" size={14} />
          <span>{method.note}</span>
        </p>
      ) : null}

      {guide.test ? (
        <div className="tdw-api-test">
          <Icon name="sparkles" size={16} />
          <div>
            <strong>{t('tdw_api_test_title', 'Test the connection')}</strong>
            <span>
              {t('tdw_api_test_body', 'Ask the assistant:')}{' '}
              <q>{guide.test}</q>
            </span>
          </div>
        </div>
      ) : null}

      {guide.tips.length ? (
        <details className="tdw-api-tips">
          <summary>
            <Icon name="circle-help" size={15} />
            {t('tdw_api_tips', 'Troubleshooting')}
          </summary>
          <ul>
            {guide.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
};

const ConnectGallery: FC<{ context: ConnectContext }> = ({ context }) => {
  const t = useT();
  const phone = usePhoneLayout();
  const guides = useClientGuides(context);
  const [open, setOpen] = useState<string | null>(null);
  // keeps the last guide on screen while the dialog or sheet closes
  const [last, setLast] = useState<string | null>(null);
  const guide = guides.find((g) => g.id === (open || last));
  const close = useCallback(() => setOpen(null), []);

  const title = guide ? (
    <span className="tdw-api-guide-title">
      <span className="tdw-api-tile-ico">{guide.icon}</span>
      {t('tdw_api_connect_to', 'Connect {{client}}', {
        client: guide.name,
        interpolation: { escapeValue: false },
      })}
    </span>
  ) : (
    ''
  );
  const body = guide ? (
    <GuideBody key={guide.id} guide={guide} context={context} />
  ) : null;

  return (
    <SettingsSection
      title={t('tdw_api_gallery_title', 'Connect an AI assistant')}
      description={t(
        'tdw_api_gallery_desc',
        'Pick the app you use. Each guide has the exact settings for this workspace, ready to copy.'
      )}
    >
      <ul className="tdw-api-tiles">
        {guides.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              className="tdw-api-tile"
              onClick={() => {
                setLast(g.id);
                setOpen(g.id);
              }}
            >
              <span className="tdw-api-tile-ico">{g.icon}</span>
              <span className="tdw-api-tile-text">
                <span className="tdw-api-tile-name">{g.name}</span>
                <span className="tdw-api-tile-sub">{g.summary}</span>
              </span>
              <span className="tdw-api-tile-chev tdw-flip" aria-hidden="true">
                <Icon name="chevron-right" size={16} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {phone ? (
        <TadweenSheet
          open={!!open}
          onClose={close}
          title={title}
          detent="large"
        >
          <div className="tdw-ui">{body}</div>
        </TadweenSheet>
      ) : (
        <Dialog open={!!open} onClose={close} title={title} size="lg">
          {body}
        </Dialog>
      )}
    </SettingsSection>
  );
};

// ── Overview, key, public API, OAuth app ────────────────────────────────────
const OverviewSection: FC<{ context: ConnectContext }> = ({ context }) => {
  const t = useT();
  const vars = { name: context.name, interpolation: { escapeValue: false } };
  return (
    <section className="tdw-set-sec tdw-api-hero">
      <div className="tdw-api-hero-head">
        <span className="tdw-api-hero-ico" aria-hidden="true">
          <Icon name="sparkles" size={20} />
        </span>
        <div>
          <h3>
            {t(
              'tdw_api_hero_title',
              'Use {{name}} from your AI assistant and your own tools',
              vars
            )}
          </h3>
          <p className="tdw-set-desc">
            {t(
              'tdw_api_hero_body',
              'Ask Claude, ChatGPT or Cursor to write and schedule posts for you, or automate {{name}} with the API, the CLI, n8n, Make and Zapier.',
              vars
            )}
          </p>
        </div>
      </div>
      <div className="tdw-api-chips">
        {context.hasKey ? (
          <Pill tone="ok" icon="key-round">
            {t('tdw_api_chip_key', 'API key ready')}
          </Pill>
        ) : (
          <Pill tone="neutral" icon="lock">
            {t('tdw_api_chip_no_key', 'API key: admins only')}
          </Pill>
        )}
        <Pill tone="brand" icon="plug">
          {t('tdw_api_chip_mcp', 'MCP server on')}
        </Pill>
        <Pill tone="neutral" icon="shield-check">
          {t('tdw_api_chip_oauth', 'OAuth sign-in')}
        </Pill>
      </div>
      <div className="tdw-set-sec-body">
        <SettingsRow
          label={t('tdw_api_mcp_url', 'MCP server')}
          description={t(
            'tdw_api_mcp_url_desc',
            'For apps that send your API key as a Bearer header.'
          )}
        >
          <CopyField
            value={context.mcp}
            label={t('tdw_api_copy_url', 'Copy URL')}
          />
        </SettingsRow>
        <SettingsRow
          label={t('tdw_api_oauth_url', 'MCP server with sign-in')}
          description={t(
            'tdw_api_oauth_url_desc',
            'For Claude, ChatGPT and apps that sign in with OAuth. No key needed.'
          )}
        >
          <CopyField
            value={context.oauth}
            label={t('tdw_api_copy_url', 'Copy URL')}
          />
        </SettingsRow>
      </div>
    </section>
  );
};

const ApiKeySection: FC<{ context: ConnectContext }> = ({
  context,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const copyText = useCopy();
  const { mutate } = useSWRConfig();
  const [revealed, setRevealed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [rotating, setRotating] = useState(false);

  const rotate = useCallback(async () => {
    setRotating(true);
    try {
      const response = await fetch('/user/api-key/rotate', { method: 'POST' });
      if (!response.ok) {
        toaster.show(
          t('tdw_api_rotate_failed', 'Couldn’t rotate the key. Try again.'),
          'warning'
        );
        return;
      }
      await mutate('/user/self');
      setRevealed(false);
      setConfirm(false);
      toaster.show(
        t('tdw_api_rotated', 'New key created. The old one no longer works.'),
        'success'
      );
    } finally {
      setRotating(false);
    }
  }, [fetch, mutate, t, toaster]);

  if (!context.hasKey) {
    return (
      <SettingsSection title={t('tdw_api_key', 'API key')}>
        <Banner
          tone="info"
          icon="lock"
          title={t('tdw_api_admins_only', 'Only workspace admins can see the API key.')}
        >
          {t(
            'tdw_api_admins_only_body',
            'You can still connect Claude, ChatGPT and other apps that sign in with OAuth.'
          )}
        </Banner>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title={t('tdw_api_key', 'API key')}
      description={t(
        'tdw_api_key_desc',
        'Full access to this workspace: its channels, posts and media. Keep it secret, like a password.'
      )}
    >
      <div className="tdw-api-key">
        <code className="tdw-set-ltr" aria-label={t('tdw_api_key', 'API key')}>
          {revealed ? context.key : maskKey(context.key)}
        </code>
        <div className="tdw-api-key-actions">
          <IconButton
            icon={revealed ? 'eye-off' : 'eye'}
            label={
              revealed
                ? t('tdw_api_hide_key', 'Hide key')
                : t('tdw_api_show_key', 'Show key')
            }
            onClick={() => setRevealed(!revealed)}
          />
          <Button
            variant="secondary"
            size="sm"
            icon="copy"
            onClick={() => copyText(context.key)}
          >
            {t('tdw_api_copy', 'Copy')}
          </Button>
        </div>
      </div>
      <div className="tdw-set-foot tdw-api-key-foot">
        <span className="tdw-set-desc">
          {t(
            'tdw_api_rotate_hint',
            'Leaked or shared by mistake? Rotate it: a new key replaces this one right away.'
          )}
        </span>
        <Button variant="secondary" icon="refresh-cw" onClick={() => setConfirm(true)}>
          {t('tdw_api_rotate', 'Rotate key')}
        </Button>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title={t('tdw_api_rotate_title', 'Rotate the API key?')}
        description={t(
          'tdw_api_rotate_desc',
          'The current key stops working the moment you rotate. Anything that uses it has to get the new key:'
        )}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('tdw_cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" loading={rotating} onClick={rotate}>
              {t('tdw_api_rotate_confirm', 'Rotate key')}
            </Button>
          </>
        }
      >
        <ul className="tdw-api-breaks">
          <li>
            {t(
              'tdw_api_breaks_mcp',
              'AI assistants set up with the key: Claude Code, Claude Desktop config, Cursor, VS Code, Windsurf, n8n.'
            )}
          </li>
          <li>
            {t(
              'tdw_api_breaks_cli',
              'The CLI, scripts and CI jobs that use POSTIZ_API_KEY.'
            )}
          </li>
          <li>
            {t(
              'tdw_api_breaks_auto',
              'Make, Zapier and anything else that calls the public API.'
            )}
          </li>
        </ul>
        <p className="tdw-api-breaks-ok">
          <Icon name="circle-check" size={14} />
          {t(
            'tdw_api_breaks_ok',
            'Apps that signed in with OAuth (Approved apps) keep working.'
          )}
        </p>
      </Dialog>
    </SettingsSection>
  );
};

const PublicApiSection: FC<{ context: ConnectContext }> = ({ context }) => {
  const t = useT();
  const { frontEndUrl } = useVariables();
  const { data: instance } = useInstanceSettings();
  const docsUrl = (instance?.branding?.docsUrl || '').replace(/\/+$/, '');
  const [example, setExample] = useState<'list' | 'create'>('list');
  const [revealed, setRevealed] = useState(false);
  const secret = context.hasKey ? context.key : undefined;

  const code =
    example === 'list'
      ? `curl ${context.api}/integrations \\\n  -H "Authorization: ${context.key}"`
      : `curl -X POST ${context.api}/posts \\\n  -H "Authorization: ${context.key}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(
          {
            type: 'draft',
            date: '2026-12-01T09:00:00.000Z',
            shortLink: false,
            tags: [],
            posts: [
              {
                integration: { id: 'CHANNEL_ID' },
                value: [{ content: 'Hello from the API', image: [] }],
                settings: {},
              },
            ],
          },
          null,
          2
        )}'`;

  return (
    <SettingsSection
      title={t('tdw_api_public_title', 'Public API')}
      description={t(
        'tdw_api_public_desc',
        'Schedule posts, upload media and list channels from your own code.'
      )}
      action={
        docsUrl ? (
          <a
            className="pz-btn pz-btn-ghost pz-btn-sm no-underline"
            href={`${docsUrl}/public-api`}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="external-link" />
            {t('tdw_api_docs', 'API docs')}
          </a>
        ) : undefined
      }
    >
      <SettingsRow
        label={t('tdw_api_base_url', 'Base URL')}
      >
        <CopyField value={context.api} label={t('tdw_api_copy_url', 'Copy URL')} />
      </SettingsRow>
      <SettingsRow
        label={t('tdw_api_auth', 'Authentication')}
        description={t(
          'tdw_api_auth_desc',
          'Send the key as it is in the Authorization header, with no "Bearer" (the MCP server is the one that takes Bearer).'
        )}
      >
        <CopyField
          value={`Authorization: ${context.key}`}
          shown={`Authorization: ${
            secret ? maskKey(secret) : KEY_PLACEHOLDER
          }`}
          label={t('tdw_api_copy', 'Copy')}
        />
      </SettingsRow>
      <SettingsRow
        label={t('tdw_api_limits', 'Rate limit')}
        description={t(
          'tdw_api_limits_desc',
          'Creating posts is limited to a number of requests per workspace each hour, set by your server. Reading is not limited. A 429 answer means wait and try again.'
        )}
      />
      <div className="tdw-api-examples">
        <div className="tdw-api-guide-bar">
          <SegmentedControl
            size="sm"
            label={t('tdw_api_example', 'Example')}
            value={example}
            onChange={setExample}
            options={[
              { value: 'list', label: t('tdw_api_ex_list', 'List channels') },
              { value: 'create', label: t('tdw_api_ex_create', 'Create a draft') },
            ]}
          />
          {secret ? (
            <Button
              variant="ghost"
              size="sm"
              icon={revealed ? 'eye-off' : 'eye'}
              onClick={() => setRevealed(!revealed)}
            >
              {revealed
                ? t('tdw_api_hide_key', 'Hide key')
                : t('tdw_api_show_key', 'Show key')}
            </Button>
          ) : null}
        </div>
        <CodeBlock code={code} secret={secret} revealed={revealed} />
        <div className="tdw-api-examples-foot">
          <span className="tdw-set-desc">
            {t(
              'tdw_api_wizard_hint',
              'Not sure what to send for a channel? Build the post in the editor and copy the request it makes.'
            )}
          </span>
          <Button
            variant="secondary"
            size="sm"
            icon="external-link"
            onClick={() => window.open(`${frontEndUrl}/modal/dark/all`, '_blank')}
          >
            {t('tdw_api_wizard', 'Open the request builder')}
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
};

// Its own settings tab (Developers → OAuth apps): building an app that other people
// approve with their accounts. Same editor and endpoints as before (/user/oauth-app).
export const OAuthAppsSettings: FC = () => {
  const t = useT();
  return (
    <TadweenScope className="tdw-set-page tdw-api">
      <SettingsSection title={t('tdw_api_oauth_apps', 'OAuth apps')}>
        <SettingsRow
          label={t('tdw_api_build_app', 'Building an app for other people?')}
          description={t(
            'tdw_api_build_app_desc',
            'Create an OAuth app. People approve it with their own account and you get a pos_ token that works with the API, MCP and CLI like a key.'
          )}
        />
        <div className="tdw-api-oauth-editor">
          <DeveloperComponent />
        </div>
      </SettingsSection>
    </TadweenScope>
  );
};

export const ApiSettings: FC = () => {
  const context = useConnectContext();
  return (
    <TadweenScope className="tdw-set-page tdw-api">
      <OverviewSection context={context} />
      <ApiKeySection context={context} />
      <ConnectGallery context={context} />
      <PublicApiSection context={context} />
    </TadweenScope>
  );
};

// ── Approved apps ───────────────────────────────────────────────────────────
// Same SWR key and endpoints as Postiz's ApprovedAppsComponent.
const useApprovedApps = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/user/approved-apps')).json();
  }, [fetch]);
  return useSWR('approved-apps', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
};

export const ApprovedAppsSettings: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, isLoading, mutate } = useApprovedApps();
  const apps: any[] = Array.isArray(data) ? data : [];

  const revoke = useCallback(
    (app: any) => async () => {
      const name = app.oauthApp?.name || '';
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_revoke_access',
            `Are you sure you want to revoke access for ${name}?`,
            { name }
          )
        ))
      ) {
        return;
      }
      try {
        const response = await fetch(`/user/approved-apps/${app.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('revoke failed');
        }
        toaster.show(t('access_revoked', 'Access revoked successfully'), 'success');
        mutate();
      } catch {
        toaster.show(t('failed_to_revoke', 'Failed to revoke access'), 'warning');
      }
    },
    [t, fetch, toaster, mutate]
  );

  return (
    <TadweenScope className="tdw-set-page">
      <SettingsSection
        title={t('tdw_apps_title', 'Apps with access')}
        description={t(
          'tdw_apps_desc',
          'Assistants and apps you signed in to with OAuth. Revoke one and it loses access right away.'
        )}
      >
        {isLoading ? (
          <div className="tdw-set-skeleton">
            <Skeleton height={44} />
            <Skeleton height={44} />
          </div>
        ) : !apps.length ? (
          <EmptyState
            size="sm"
            icon="shield-check"
            title={t('no_approved_apps', 'No approved apps yet.')}
            body={t(
              'tdw_apps_empty',
              'When you connect Claude, ChatGPT or another app by signing in, it shows up here.'
            )}
          />
        ) : (
          <ul className="tdw-set-list">
            {apps.map((app) => (
              <SettingsListRow
                key={app.id}
                icon="shield-check"
                title={app.oauthApp?.name || t('tdw_apps_unnamed', 'Unnamed app')}
                meta={
                  <>
                    {app.oauthApp?.description ? (
                      <span>{app.oauthApp.description}</span>
                    ) : null}
                    <span>
                      {t('authorized_on', 'Authorized on')}{' '}
                      {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </>
                }
                actions={
                  <Button variant="secondary" size="sm" onClick={revoke(app)}>
                    {t('revoke', 'Revoke')}
                  </Button>
                }
              />
            ))}
          </ul>
        )}
      </SettingsSection>
    </TadweenScope>
  );
};
