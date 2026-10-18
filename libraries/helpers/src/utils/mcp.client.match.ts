// Which known client an OAuth app is: the consent screen matches the request
// it is approving, Settings > Approved apps (OAuthService.getApprovedApps) the
// stored authorization. Only picks a logo and a display name; the redirect
// itself is validated server side. `client` is the key of McpClientIcon. A web callback must be on the client's own domain (anyone can register
// a client called "ChatGPT"); native callbacks (loopback, cursor://) can't be
// verified anyway, so those match by registered name or scheme, and only
// clients that have no web domain of their own.
const clientMatchers: {
  client: string;
  label: string;
  name: RegExp;
  domains?: string[];
  // a desktop app that also calls back natively (cursor://, vscode://)
  native?: boolean;
}[] = [
  { client: 'Claude Code', label: 'Claude Code', name: /claude[\s-]?code/i },
  {
    client: 'Claude',
    label: 'Claude',
    name: /claude|anthropic/i,
    domains: ['claude.ai', 'claude.com', 'anthropic.com'],
  },
  {
    client: 'ChatGPT',
    label: 'ChatGPT',
    name: /chatgpt|openai/i,
    domains: ['chatgpt.com', 'openai.com'],
  },
  { client: 'Codex', label: 'Codex', name: /codex/i },
  {
    client: 'Cursor',
    label: 'Cursor',
    name: /cursor/i,
    domains: ['cursor.com', 'cursor.sh'],
    native: true,
  },
  {
    client: 'VS Code / Copilot',
    label: 'VS Code',
    name: /vscode|vs code|visual studio code|copilot/i,
    domains: ['vscode.dev'],
    native: true,
  },
  {
    client: 'Windsurf',
    label: 'Windsurf',
    name: /windsurf|codeium/i,
    domains: ['windsurf.com', 'codeium.com'],
    native: true,
  },
  { client: 'Gemini CLI', label: 'Gemini', name: /gemini/i },
  {
    client: 'Grok Bot',
    label: 'Grok',
    name: /grok/i,
    domains: ['grok.com', 'x.ai'],
  },
  {
    client: 'Perplexity',
    label: 'Perplexity',
    name: /perplexity/i,
    domains: ['perplexity.ai'],
  },
  { client: 'n8n', label: 'n8n', name: /n8n/i, domains: ['n8n.io', 'n8n.cloud'] },
  {
    client: 'Make',
    label: 'Make',
    name: /integromat/i,
    domains: ['make.com', 'integromat.com'],
  },
  { client: 'Warp', label: 'Warp', name: /warp/i, domains: ['warp.dev'] },
  {
    client: 'Amp',
    label: 'Amp',
    name: /^amp\b|ampcode/i,
    domains: ['ampcode.com'],
  },
  { client: 'OpenClaw', label: 'OpenClaw', name: /openclaw/i },
  { client: 'NanoClaw', label: 'NanoClaw', name: /nanoclaw/i },
  { client: 'Hermes', label: 'Hermes', name: /hermes/i },
];

const onDomain = (host: string, domains: string[] = []) =>
  domains.some((domain) => host === domain || host.endsWith('.' + domain));

export const mcpClientFromRequest = (
  name?: string | null,
  redirectUri?: string | null
) => {
  let url: URL | undefined;
  try {
    url = new URL(redirectUri || '');
  } catch (e) {
    url = undefined;
  }
  const loopback =
    url?.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url && ['http:', 'https:'].includes(url.protocol) && !loopback) {
    const host = url.hostname.toLowerCase();
    return clientMatchers.find((m) => onDomain(host, m.domains)) || null;
  }
  const scheme = url?.protocol.replace(/:$/, '') || '';
  // a web-only client (ChatGPT, Claude…) is never recognised by name alone:
  // anyone can register a native client called "ChatGPT"
  const native = clientMatchers.filter((m) => !m.domains || m.native);
  return (
    native.find((m) => m.name.test(name || '')) ||
    native.find((m) => !!scheme && m.name.test(scheme)) ||
    null
  );
};
