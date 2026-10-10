import type { IconName } from '@/components/icons';

// The AI clients that can connect to Tadween's MCP server, as facts that don't change with
// the language: how each one connects, the exact snippets, and the vendor's own docs that
// back every step. Steps follow the vendor's current docs (checked 2026-10-10) and the same
// snippets as Settings → API & MCP in the app; where the app's wording is older, the notes
// file lists the differences. The words for each step live in content/aiClients.en.ts and
// content/aiClients.ar.ts, in the same order.
//
// A client is listed only when its vendor documents adding your own remote MCP server
// (OAuth sign-in or a URL with a header). Tadween has no app in any vendor's directory, so
// clients that only take listed apps are left out. docs/tadween/ai-client-pages-notes.md
// has the doc checks and the clients that were skipped, with the reasons.
//
// In code, {api} is the MCP base (NEXT_PUBLIC_MCP_URL or NEXT_PUBLIC_API_URL, else a placeholder) and the key is
// always a placeholder in a header or an environment variable, never in a URL.

export type ClientKind = 'assistant' | 'coding';
export type ClientAuth = 'oauth' | 'key';

/** A snippet a step shows under its text, with the label on its window. */
export interface ClientCode {
  label: string;
  code: string;
}

export interface ClientMethod {
  auth: ClientAuth;
  /** One entry per step: the snippet that step shows, or null when it is text only. */
  steps: (ClientCode | null)[];
}

export interface AiClientFacts {
  slug: string;
  /** The product's own name, always shown as text in its own spelling. */
  name: string;
  kind: ClientKind;
  /** The hero draws a terminal for command-line clients, a chat window for the rest. */
  terminal?: boolean;
  /** The first method is the one the page leads with ("Connect in N steps"). */
  methods: ClientMethod[];
  /** The vendor's documentation for adding a remote MCP server. */
  docs: { label: string; url: string }[];
  related: string[];
}

const OAUTH_URL = '{api}/mcp-oauth-dynamic';
const MCP_URL = '{api}/mcp';
const KEY = '<your-api-key>';
const BEARER = `Bearer ${KEY}`;

const json = (value: object) => JSON.stringify(value, null, 2);
/** Puts the key in an environment variable, in the shell profile, for clients that read it. */
const EXPORT_KEY = { label: 'Terminal', code: `export TADWEEN_API_KEY="${KEY}"` };

/** A neutral glyph per kind of client; product logos are never drawn. */
export const KIND_ICON: Record<ClientKind, IconName> = { assistant: 'message-circle', coding: 'terminal' };

const CLAUDE_DOCS = [
  { label: 'Claude Help Center: custom connectors using remote MCP', url: 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp' },
];

export const AI_CLIENTS: AiClientFacts[] = [
  {
    slug: 'chatgpt',
    name: 'ChatGPT',
    kind: 'assistant',
    methods: [{ auth: 'oauth', steps: [null, { label: 'MCP server URL', code: OAUTH_URL }, null, null] }],
    docs: [
      { label: 'OpenAI Help Center: developer mode and MCP apps', url: 'https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt' },
      { label: 'OpenAI: connect an MCP server to ChatGPT', url: 'https://developers.openai.com/plugins/deploy/connect-chatgpt' },
    ],
    related: ['claude', 'codex', 'perplexity'],
  },
  {
    slug: 'claude',
    name: 'Claude',
    kind: 'assistant',
    methods: [{ auth: 'oauth', steps: [null, { label: 'Remote MCP server URL', code: OAUTH_URL }, null, null, null] }],
    docs: CLAUDE_DOCS,
    related: ['claude-cowork', 'claude-code', 'chatgpt'],
  },
  {
    slug: 'claude-cowork',
    name: 'Claude Cowork',
    kind: 'assistant',
    methods: [{ auth: 'oauth', steps: [null, { label: 'Remote MCP server URL', code: OAUTH_URL }, null, null, null] }],
    docs: CLAUDE_DOCS,
    related: ['claude', 'claude-code', 'chatgpt'],
  },
  {
    slug: 'perplexity',
    name: 'Perplexity',
    kind: 'assistant',
    methods: [{ auth: 'oauth', steps: [null, { label: 'MCP Server URL', code: OAUTH_URL }, null, null] }],
    docs: [{ label: 'Perplexity Help Center: adding custom remote connectors', url: 'https://www.perplexity.ai/help-center/en/articles/13915507-adding-custom-remote-connectors' }],
    related: ['chatgpt', 'claude', 'claude-cowork'],
  },
  {
    slug: 'claude-code',
    name: 'Claude Code',
    kind: 'coding',
    terminal: true,
    methods: [
      { auth: 'oauth', steps: [{ label: 'Terminal', code: `claude mcp add --transport http tadween ${OAUTH_URL}` }, null] },
      {
        auth: 'key',
        steps: [
          { label: 'Terminal', code: `claude mcp add --transport http tadween ${MCP_URL} --header "Authorization: ${BEARER}"` },
          { label: 'Terminal', code: 'claude mcp list' },
        ],
      },
    ],
    docs: [{ label: 'Claude Code docs: connect to tools via MCP', url: 'https://code.claude.com/docs/en/mcp' }],
    related: ['codex', 'cursor', 'claude'],
  },
  {
    slug: 'codex',
    name: 'Codex',
    kind: 'coding',
    terminal: true,
    methods: [
      {
        auth: 'oauth',
        steps: [
          { label: 'Terminal', code: `codex mcp add tadween --url ${OAUTH_URL}` },
          { label: 'Terminal', code: 'codex mcp login tadween' },
        ],
      },
      {
        auth: 'key',
        steps: [
          EXPORT_KEY,
          { label: '~/.codex/config.toml', code: `[mcp_servers.tadween]\nurl = "${MCP_URL}"\nbearer_token_env_var = "TADWEEN_API_KEY"` },
          { label: 'Terminal', code: 'codex mcp list' },
        ],
      },
    ],
    docs: [{ label: 'OpenAI: Model Context Protocol in Codex', url: 'https://learn.chatgpt.com/docs/extend/mcp' }],
    related: ['claude-code', 'chatgpt', 'cursor'],
  },
  {
    slug: 'cursor',
    name: 'Cursor',
    kind: 'coding',
    methods: [
      { auth: 'oauth', steps: [{ label: '~/.cursor/mcp.json', code: json({ mcpServers: { tadween: { url: OAUTH_URL } } }) }, null] },
      {
        auth: 'key',
        steps: [EXPORT_KEY, { label: '~/.cursor/mcp.json', code: json({ mcpServers: { tadween: { url: MCP_URL, headers: { Authorization: 'Bearer ${env:TADWEEN_API_KEY}' } } } }) }, null],
      },
    ],
    docs: [{ label: 'Cursor docs: Model Context Protocol', url: 'https://cursor.com/docs/mcp' }],
    related: ['vscode', 'claude-code', 'codex'],
  },
  {
    slug: 'vscode',
    name: 'VS Code',
    kind: 'coding',
    methods: [
      { auth: 'oauth', steps: [{ label: '.vscode/mcp.json', code: json({ servers: { tadween: { type: 'http', url: OAUTH_URL } } }) }, null] },
      {
        auth: 'key',
        steps: [
          null,
          {
            label: '.vscode/mcp.json',
            code: json({
              inputs: [{ type: 'promptString', id: 'tadween-api-key', description: 'Tadween API key', password: true }],
              servers: { tadween: { type: 'http', url: MCP_URL, headers: { Authorization: 'Bearer ${input:tadween-api-key}' } } },
            }),
          },
          null,
          null,
        ],
      },
    ],
    docs: [
      { label: 'VS Code docs: MCP configuration reference', url: 'https://code.visualstudio.com/docs/copilot/reference/mcp-configuration' },
      { label: 'GitHub docs: MCP server access in Copilot', url: 'https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-mcp-usage/configure-mcp-server-access' },
    ],
    related: ['cursor', 'claude-code', 'codex'],
  },
  {
    slug: 'grok-build',
    name: 'Grok Build',
    kind: 'coding',
    terminal: true,
    methods: [
      { auth: 'oauth', steps: [{ label: 'Terminal', code: `grok mcp add --transport http tadween ${OAUTH_URL}` }, null] },
      {
        auth: 'key',
        steps: [
          EXPORT_KEY,
          // Single quotes: the shell must not expand the variable, Grok Build does when it connects
          { label: 'Terminal', code: `grok mcp add --transport http tadween ${MCP_URL} --header 'Authorization: Bearer \${TADWEEN_API_KEY}'` },
        ],
      },
    ],
    docs: [{ label: 'xAI docs: MCP servers in Grok Build', url: 'https://docs.x.ai/build/features/mcp-servers' }],
    related: ['claude-code', 'codex', 'cursor'],
  },
];

export const clientBySlug = (slug: string) => AI_CLIENTS.find((c) => c.slug === slug);
