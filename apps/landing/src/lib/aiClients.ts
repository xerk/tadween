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
  /** The first method is the one the page leads with ("Connect in N steps"). */
  methods: ClientMethod[];
  /** The vendor's documentation for adding a remote MCP server. */
  docs: { label: string; url: string }[];
  related: string[];
}

const OAUTH_URL = '{api}/mcp-oauth-dynamic';
const MCP_URL = '{api}/mcp';
const KEY = '<your-api-key>';

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
    related: ['claude', 'cursor'],
  },
  {
    slug: 'claude',
    name: 'Claude',
    kind: 'assistant',
    methods: [{ auth: 'oauth', steps: [null, { label: 'Remote MCP server URL', code: OAUTH_URL }, null, null, null] }],
    docs: CLAUDE_DOCS,
    related: ['chatgpt', 'cursor'],
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
    related: ['claude', 'chatgpt'],
  },
];

/** Clients that also connect (any remote MCP client does) but have no page of their own:
    the AI agent page names them under "Also works with", and their old pages redirect there
    (lib/redirects.ts). */
export const MORE_AI_CLIENTS: { slug: string; name: string; kind: ClientKind }[] = [
  { slug: 'claude-cowork', name: 'Claude Cowork', kind: 'assistant' },
  { slug: 'perplexity', name: 'Perplexity', kind: 'assistant' },
  { slug: 'claude-code', name: 'Claude Code', kind: 'coding' },
  { slug: 'codex', name: 'Codex', kind: 'coding' },
  { slug: 'vscode', name: 'VS Code', kind: 'coding' },
  { slug: 'grok-build', name: 'Grok Build', kind: 'coding' },
];

export const clientBySlug = (slug: string) => AI_CLIENTS.find((c) => c.slug === slug);
