# AI client pages: study notes and client decisions

Study date: 2026-10-10. Patterns and information architecture only. No copy, images, illustrations, logos or brand assets from Postiz or any vendor are reused.

Method: Firecrawl scrape (markdown and raw HTML for head tags and JSON-LD) of the Postiz pages below, and of each vendor's current documentation. The vendor docs that back a step are linked from that client's page.

---

## 1. How Postiz does it

### The set

`postiz.com/sitemap.xml` lists 23 top-level AI pages. Every one is linked from both the header mega-menu and the footer.

- **Hubs:** `/agent`, `/mcp`
- **Chat and connector apps:** `/chatgpt`, `/claude`, `/dots`, `/muse`, `/manus`, `/cue`
- **Desktop:** `/claude-cowork`
- **Terminal and IDE:** `/claude-code`, `/codex`, `/cursor`, `/gemini`, `/grok-build`, `/kimi`, `/deepseek`
- **Always-on or self-hosted agents:** `/grok-bot`, `/perplexity-computer`, `/hermes-agent`, `/hermes`, `/openclaw`, `/nanoclaw`, `/paperclip`

Nine of these clients also get 25 per-channel subpages each (`/claude-code/linkedin` and so on), about 225 programmatic pages in all. The nine are claude-code, claude-cowork, codex, grok-bot, perplexity-computer, hermes-agent, openclaw, nanoclaw and paperclip.

### Head and SEO

- **Title formula:** "Schedule Social Media Posts with {Client}", then a suffix that names the integration surface: ": Postiz Connector + MCP", "| Postiz MCP", ": Postiz Plugin", ": Postiz Extension". The suffix targets searches like "{client} MCP" and "{client} plugin".
- **Title exceptions:**
  - /claude uses a how-to form ("How to Post to Social Media from Claude").
  - /cursor uses "from" instead of "with".
  - /openclaw puts the keyword first.
- **Description (about 150–160 characters):** connect or install Postiz in {Client} by {method}, schedule to X, LinkedIn, Instagram and 30+ platforms by asking, then one differentiator ("OAuth, no API key", "headless mode for CI", "Start for $0").
- **H1:** "Schedule Social Media Posts with {Client}". It is shorter than the title. /gemini drops "CLI" from the H1 to target the broader keyword.
- **Other head tags:** the canonical is the page itself, and `og:image` is generated from the title. There is no hreflang (English only).
- **JSON-LD:** WebPage, BreadcrumbList, SoftwareApplication ("Postiz for {Client}", often with a $0 Offer) and FAQPage. The FAQ is mirrored exactly in the page, with 9–11 questions. No page uses HowTo.

### Section order (almost every H2 is a question)

1. Hero:
   - An eyebrow with the client logo and "{Client} + Postiz", then the H1 and 3 check bullets.
   - Two CTAs: an install link or copyable command, plus "Start for $0".
   - A one-sentence definition, a human-in-the-loop disclaimer and "Last updated".
   - A static poster image with a strip of platform logos.
2. "How do I connect Postiz in {Client}?":
   - Two numbered cards: Connect (a copyable URL or command) and Ask (a chat mock-up with "Also try" chips).
   - 3–5 numbered steps.
   - A route-comparison table: official app vs custom MCP vs skill/CLI.
3. "One connector powers every channel": a 30-icon grid linking to `/channels/*`.
4. "What can {Client} do with Postiz?": 6 feature cards.
5. "What is the Postiz MCP?": a code block, or a Discover / Create / Manage block.
6. "What is {Client}?" and a disambiguation table: ChatGPT vs Codex; Claude vs Code vs Cowork; Grok vs Grok Bot vs Grok Build; Gemini CLI vs app.
7. Automation: headless/CI, routines, or "also works with {sibling}".
8. "What can you ask {Client}?": 4 example-prompt cards. Chat apps use business prompts; coding agents use repo prompts (README, CHANGELOG).
9. Platforms list.
10. Optional pricing, security and troubleshooting blocks.
11. An "Other AI agents" or "Related guides" grid.
12. FAQ (9–11 questions).
13. Closing CTA.

### Length and linking

- **Length:** about 2.2k–3.4k words. Chat-connector pages run about 2.2–2.5k, agent/CLI pages about 2.6–3.2k, and the hubs about 3.0–3.4k.
- **Hub links:** /agent and /mcp link to every client page, and every client page links back to both.
- **Other internal links:** the channel grids go to `/channels/*`, or to `/{client}/{channel}` on the 9 matrix clients. The disambiguation sections link to sibling clients.

### Per page (what stood out)

| Page | Connection Postiz shows | Distinct content |
|---|---|---|
| /chatgpt | Official ChatGPT app, or custom connector at the OAuth URL (developer mode) | Official vs custom table, "Is ChatGPT the same as Codex?", 10 FAQs |
| /claude | Custom connector (recommended), directory connector as an alternative | Capability table (the directory connector has no media tools), "Claude vs Code vs Cowork" |
| /claude-cowork | Custom connector in Cowork's connectors, OAuth, "no terminal" | Cowork vs Code vs claude.ai table, scheduled tasks; has channel matrix |
| /claude-code | `claude mcp add --transport http …`, OAuth | Headless (`claude -p`) CI example, repo prompts; has channel matrix |
| /cursor | Marketplace plugin `/add-plugin`, or mcp.json | Plugin vs skill vs MCP routes |
| /codex | Skill first; `codex mcp add … --url`, `codex mcp login` | `codex exec` automation, "Is Codex the same as ChatGPT?" |
| /gemini | Gemini CLI extension; Gemini web app as a secondary route | CLI vs app comparison |
| /dots | Official ChatGPT plugin inside OpenAI's dots | Approval-rule ("custom rules") framing |
| /grok-bot | Official plugin installed in the bot, API key as a secret | "Grok vs Grok Bot vs Grok Build" |
| /perplexity-computer | Settings → Connectors → Custom connector → Remote, OAuth | Longest page (about 3.2k words) |
| /mcp | Hub | Capability matrix, a 14-row install table by client |
| /agent | Hub | A 20-row "which agents can post" table |

Caveat: the Postiz hubs disagree with some of their own detail pages. For example, /agent lists Cowork and Perplexity as skill-only, while those pages recommend the MCP connector.

---

## 2. What Tadween can honestly support

What Tadween serves:
- An MCP server over streamable HTTP, at two endpoints:
  - `{api}/mcp-oauth-dynamic`: OAuth with dynamic client registration (DCR). There is no CIMD, so on Claude the right choice is "Register automatically".
  - `{api}/mcp` with `Authorization: Bearer <key>`.
- The public API at `/public/v1`.

Tadween has no listed app in any vendor's store. So a client gets a page only if its vendor documents adding **your own** remote MCP server.

### Built (9 clients, English and Arabic)

| Page | Methods on the page | Vendor docs (checked 2026-10-10) |
|---|---|---|
| `/chatgpt` | OAuth only (ChatGPT does not accept API keys for custom MCP) | https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt, https://developers.openai.com/plugins/deploy/connect-chatgpt |
| `/claude` | OAuth (custom connector) | https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp |
| `/claude-cowork` | OAuth (same connector; "available on Claude, Cowork, and Claude Desktop") | same as Claude |
| `/perplexity` | OAuth (custom remote connector, Streamable HTTP) | https://www.perplexity.ai/help-center/en/articles/13915507-adding-custom-remote-connectors |
| `/claude-code` | OAuth or key (`--header`) | https://code.claude.com/docs/en/mcp |
| `/codex` | OAuth (`codex mcp add --url`, `codex mcp login`) or key (`bearer_token_env_var`) | https://learn.chatgpt.com/docs/extend/mcp |
| `/cursor` | OAuth or key (`headers` in mcp.json) | https://cursor.com/docs/context/mcp |
| `/vscode` | OAuth or key (`inputs` + `headers`, kept in secret storage) | https://code.visualstudio.com/docs/copilot/reference/mcp-configuration, https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-mcp-usage/configure-mcp-server-access |
| `/grok-build` | OAuth (browser flow on first use) or key (`--header` with `${VAR}`) | https://docs.x.ai/build/features/mcp-servers |

**Plan caveats shown on the pages:**
- **ChatGPT:** OpenAI's help center (updated 2026-10-08) says full MCP support, including write actions, is a beta on Business, Enterprise and Edu. On Pro, custom MCP apps are read/fetch only, so ChatGPT can't schedule there. Custom MCP apps are web only.
- **Claude:** custom connectors are on Free (one connector), Pro, Max, Team and Enterprise. On Team and Enterprise, an owner adds the connector.
- **Perplexity:** on Enterprise, member-added connectors are off by default.
- **VS Code:** on Copilot Business and Enterprise, the "MCP servers in Copilot" policy is off by default.

### Skipped, and why

| Client | Why not now | Source |
|---|---|---|
| OpenAI dots | A dot uses the plugins connected in ChatGPT. Whether a custom (unlisted) MCP plugin works inside a dot isn't documented. | https://help.openai.com/en/articles/20001530-getting-started-with-your-dot |
| Gemini CLI | Stopped serving individual tiers on 2026-06-18 (enterprise licences only). | https://developers.googleblog.com/en/an-important-update-transitioning-gemini-cli-to-antigravity-cli/ |
| Antigravity CLI (Gemini CLI's replacement) | Google's guide shows only a pre-registered OAuth client (`clientId`/`clientSecret`, no DCR). Header auth is documented only by third parties. | https://developers.google.com/workspace/docs/api/guides/configure-mcp-server |
| Gemini app | Custom apps are limited to Gemini Spark. The audience is narrow and the requirements are unclear. | https://support.google.com/gemini/answer/13695044 |
| Gemini Enterprise, AI Studio | Admin-only, or no user-facing custom remote MCP. | https://support.google.com/g/answer/17106276 |
| n8n | The official MCP Client Tool page documents only an "SSE Endpoint". Tadween serves streamable HTTP, and the HTTP Streamable option is described only by third parties. | https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/ |
| Windsurf | Renamed to Devin Desktop, with a new config path (`~/.config/devin/mcp_config.json`). The steps in Settings → API & MCP (PR #38) still use the old Windsurf path, so a page would contradict the app. | https://docs.devin.ai/desktop/cascade/mcp |
| Grok app (grok.com) | Custom connectors exist, but the docs don't say which auth methods work. | https://docs.x.ai/grok/connectors |
| Grok Bot | No xAI documentation for adding a custom MCP server. | none |
| Perplexity API-key method | Perplexity offers "API Key" auth but doesn't document which header it sends, so only OAuth is shown. | Perplexity help article above |
| Manus | Custom MCP servers are documented, but the credential field format isn't exact enough to write steps. | https://manus.im/docs/integrations/custom-mcp |
| Kimi Code, OpenClaw, Mistral Le Chat | Documented support. They are candidates for a follow-up page, left out to keep this first set reviewable. Le Chat's own help article returned 404. | https://moonshotai.github.io/kimi-cli/en/customization/mcp.html, https://docs.openclaw.ai/gateway/config-extensions, https://docs.mistral.ai/vibe/work/connectors/mcp-connectors |
| DeepSeek, Kimi app | No consumer surface for a custom MCP server. | https://github.com/deepseek-ai/deepseek-harness |

### Differences from PR #38 (Settings → API & MCP) to fix there

The pages follow the vendors' current docs where the in-app guide is out of date:

- **ChatGPT:**
  - The menu is now **Settings → Apps** (not "Apps & Connectors"), and the user clicks **Scan Tools** before **Create**.
  - Full MCP with write actions is limited to Business, Enterprise and Edu, so the guide should say so.
- **Claude:**
  - Individual plans now start at **Customize → Connectors → + Add → Add custom connector**.
  - The OAuth client choice should be **Register automatically** (Tadween has DCR, not CIMD).
  - Connectors are turned on in a chat from **+ → Connectors**.
- **Windsurf:** now Devin Desktop, with a new config path (see above).
- **n8n:** the official node docs only list an SSE endpoint.
- **Backend:** ChatGPT asks MCP servers to advertise `offline_access` and issue refresh tokens. `/mcp-oauth-dynamic` advertises only `mcp:read` and `mcp:write`, so ChatGPT users may need to sign in again when the token expires. This is worth checking separately; it is not part of this PR.

---

## 3. What the Tadween pages do

- **Routes:** each client lives at the top level, like Postiz: `/chatgpt` and `/ar/chatgpt`. The pages come from one `[client]` route per language with `generateStaticParams` and `dynamicParams = false`, so an unknown slug returns 404.
- **Slug guard:** a slug that matches a reserved route (`RESERVED_SEGMENTS` in `lib/routes.ts`) or any top-level folder or file in `src/app` or `public` fails the build. A copy file whose step count doesn't match the snippets in `lib/aiClients.ts` also fails the build.
- **Data:**
  - `lib/aiClients.ts` holds the facts: methods, snippets with `{api}`, vendor docs and related clients.
  - `content/aiClients.en.ts` and `content/aiClients.ar.ts` hold the words.
  - The API address comes from `NEXT_PUBLIC_API_URL`, or a placeholder. The key is always `<your-api-key>`, in a header or an environment variable, never in a URL.
- **Page sections:**
  1. Hero: a breadcrumb (Home › AI agent › Client), then the H1 "Schedule LinkedIn and social posts with {Client}", and a drawn client window. The window shows the client's name as text and a neutral glyph; command-line clients get a terminal. No logos or screenshots of the client.
  2. "Connect {Client} in N steps", with copyable snippets and a recommended method.
  3. Plan notes and the vendor doc links.
  4. "What you can ask": 4 English and 2 Egyptian Arabic prompts, or the reverse on the Arabic page.
  5. What it can do: the agent page's list, which matches the backend `toolList`.
  6. The channel grid, linking to `/channels/*`.
  7. Security: OAuth approval, keys kept out of URLs, revoke under Settings → Approved apps, rotate under Settings → API & MCP.
  8. FAQ: 4 shared questions and 3 per client, in FAQPage JSON-LD.
  9. Related clients, then the CTA.
- **Linking and metadata:**
  - The AI agent page's "Works with" section is now a grid of links to every client page (`/ai-agent#clients`).
  - The Resources mega-menu and the phone sheet list every client.
  - The sitemap lists both languages with hreflang and x-default.
  - Each client has its own Open Graph card (`/og/client-<slug>.png`).
- **Not copied from Postiz:**
  - No "official app" claims and no $0 offer in the JSON-LD.
  - No per-channel matrix pages, since they would be thin and near-duplicate for us.
  - No "Last updated" stamp.
