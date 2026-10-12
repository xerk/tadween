# AI agent connectors: plan

Status: proposal, nothing built. The marketing site's `/ai-agent` page shows these connectors as "coming soon", with the same list as section 4.

The goal is to let Tadween's agent (and any MCP client) read from the tools a team already uses (drives, docs, design tools, CRMs, blogs) and publish from them, without hard-coding any of those tools into the generic publishing code.

## 1. What exists today

| Piece | Where | What it gives us |
| --- | --- | --- |
| MCP server | `libraries/nestjs-libraries/src/chat/start.mcp.ts` (`startMcp`, called from `apps/backend/src/main.ts`) | Streamable HTTP on `/mcp` (Bearer API key or `pos_` OAuth token) and `/mcp/:apiKey`, plus SSE. OAuth variants `/mcp-oauth-dynamic`, `/mcp-oauth-claude` and `/mcp-oauth-chatgpt`, with `.well-known` metadata and scopes `mcp:read` and `mcp:write` (`chat/oauth-middleware.ts`). |
| Agent tools | `chat/tools/tool.list.ts`, loaded by `LoadToolsService.loadTools()` (`chat/load.tools.service.ts`) | Mastra `createTool` classes that implement `AgentToolInterface`, with MCP annotations (`readOnlyHint`, `destructiveHint` and so on): `integrationList`, `groupList`, `integrationSchema`, `triggerTool`, `integrationSchedulePostTool`, `postsListTool`, `postSettingsTool`, `uploadFromUrlTool`, `generateImageTool`, the video and clipping tools, and the `mcpOnly` upload widgets. The same list serves the in-app agent and MCP. There is no delete tool. |
| In-app agent | `apps/frontend/src/components/agents/*` (CopilotKit UI) → `apps/backend/src/api/routes/copilot.controller.ts` → Mastra agent `postiz` (`chat/load.tools.service.ts`, memory in `chat/mastra.store.ts`) | Chat UI, thread memory, and the same tools. |
| Public API | `apps/backend/src/public-api/routes/v1/public.integrations.controller.ts` (`/public/v1`) | Posts (CRUD, find-slot), integrations, upload and upload-from-URL, analytics, groups. Auth is the raw API key or a `pos_` token (`apps/backend/src/services/auth/public.auth.middleware.ts`). |
| Third-party registry | `libraries/nestjs-libraries/src/3rdparties/thirdparty.interface.ts` (`@ThirdParty`, `ThirdPartyAbstract`), `thirdparty.manager.ts`, `heygen/`, `reelfarm/` | A decorator registry of API-key integrations with `position: 'media' \| 'media-library' \| 'webhook'`. Keys are encrypted with `AuthService.fixedEncryption` (`database/prisma/third-party/third-party.repository.ts`), stored per organization in the `ThirdParty` model, with UI in `apps/frontend/src/components/third-parties/`. **This is the closest thing to a connector framework, and the plan builds on it.** |
| Plugs | `@Plug` in providers (for example `x.provider.ts`, `linkedin.page.provider.ts`), `Plugs` model, run inside the orchestrator post workflows | Per-channel automations (auto-repost, auto-plug). They show how per-integration, user-configured behaviour plugs into publishing. |
| Webhooks | `Webhooks` and `IntegrationsWebhooks` models, `apps/backend/src/api/routes/webhooks.controller.ts`, `sendWebhooks` in `apps/orchestrator/src/activities/post.activity.ts` | One event (post published), the post JSON as the body, **no signature**, best effort. |
| RSS auto-post | `AutoPost` model, `database/prisma/autopost/autopost.service.ts`, `apps/orchestrator/src/workflows/autopost.workflow.ts` | Polls a feed and turns items into posts through a LangGraph flow. This is effectively the first "content source" connector. |
| Media import | `MediaService.uploadFromUrl` (used by `uploadFromUrlTool` and `POST /public/v1/upload-from-url`) | A single, already SSRF-aware path for bringing remote files into the library. Every media connector should end here. |
| Provenance | `Post.creationMethod` (`WEB`, `MCP`, `API`, `AUTOPOST`, `CLI`) | The seed of an audit trail. There is no audit-log model. |
| Rate limits | `ThrottlerModule` in `apps/backend/src/app.module.ts`, `ThrottlerBehindProxyGuard` (`libraries/nestjs-libraries/src/throttler/throttler.provider.ts`) | `API_LIMIT` (default 90) an hour, only on `POST /public/v1/posts` and public comments. Everything else is unthrottled. |
| Feature switches | `FEATURE_KEYS` in `database/prisma/tadween/tadween.defaults.ts` (`agent`, `publicApi`, `thirdParty`, `webhooks`, `autopost`…) | An instance-level on/off we can extend with `connectors`. |

## 2. Proposed architecture

### 2.1 A connector is a provider

We follow the repository rule that generic code never names a specific tool. We add a `ConnectorProvider` interface next to `ThirdPartyAbstract`, register implementations with a decorator, and keep all vendor logic inside each implementation:

```ts
// libraries/nestjs-libraries/src/connectors/connector.interface.ts (proposed)
export interface ConnectorProvider {
  identifier: string;                 // 'google-drive', 'notion', …
  kind: Array<'media-source' | 'content-source' | 'notify' | 'crm' | 'export'>;
  auth: 'oauth2' | 'api-key';
  scopes: string[];                   // vendor scopes requested at connect time
  generateAuthUrl?(): Promise<{ url: string; codeVerifier: string; state: string }>;
  authenticate(params: { code?: string; apiKey?: string; codeVerifier?: string }): Promise<ConnectorTokens>;
  refreshToken?(refreshToken: string): Promise<ConnectorTokens>;
  // Tools this connector exposes to the agent. Each is a Mastra tool factory,
  // the same shape as chat/tools/*.tool.ts.
  tools(): ConnectorTool[];
  // Optional event sink for notify connectors (Slack, Teams).
  onEvent?(event: TadweenEvent, tokens: ConnectorTokens, settings: unknown): Promise<void>;
}
```

`ConnectorManager` mirrors `IntegrationManager` and `ThirdPartyManager`. It holds the list, looks implementations up by identifier, and never branches on vendor names.

We considered extending `ThirdPartyAbstract` directly. It only models a single API key and a `sendData` call, so OAuth refresh, scopes and tool exposure don't fit without breaking existing HeyGen and Reelfarm rows. A new interface is cleaner. Third parties can be migrated later behind the same UI.

### 2.2 Storage (Prisma, additive migration only)

- `Connector`: `id`, `organizationId`, `identifier`, `name`, `internalId` (vendor account id), `accessToken` and `refreshToken` (encrypted like `ThirdParty.apiKey`), `tokenExpiresAt`, `scopes` (granted), `settings` (JSON), `enabled`, `createdById`, timestamps and `deletedAt`. Unique on `[organizationId, identifier, internalId]`.
- `ConnectorEvent` (audit): `id`, `organizationId`, `connectorId`, `actor` (`userId` or `apiKey`/OAuth app id), `source` (`WEB` | `MCP` | `API` | `AGENT`), `tool`, `status`, `summary` (no content, no tokens), `createdAt`. Indexed by org and date, with 90-day retention by default.
- The repository `select` must never return token columns to controllers (CLAUDE.md rule for credential models). Writes go through `select: { id: true }`.

Layers follow the house rule: DTO → Controller (`apps/backend/src/api/routes/connectors.controller.ts`) → Service → Repository in `libraries/nestjs-libraries/src/database/prisma/connectors/`.

### 2.3 Auth per connector

- **OAuth2 with PKCE** for Google Drive, Google Docs, Dropbox, Notion, Canva, HubSpot, Slack and Microsoft Teams. Reuse the provider connect flow pattern (`generateAuthUrl` → callback → `authenticate`) and the refresh logic Postiz already uses for social providers. Request the narrowest scopes: Drive `drive.file` or the picker over `drive.readonly`, Notion read content, Slack `chat:write` plus `incoming-webhook`.
- **API key** for the long tail and self-hosted tools (n8n, custom webhooks).
- Tokens are encrypted at rest, refreshed by the orchestrator before expiry, and revoked on disconnect where the vendor supports it.

### 2.4 Per-workspace enablement and permissions

- An instance switch: a new `connectors` feature key in `FEATURE_KEYS`, plus a per-connector allowlist like `HIDDEN_PROVIDERS` (for example `TADWEEN_DISABLED_CONNECTORS`).
- Plan gating: a `connectors` limit per tier in `pricing.ts`, overlaid by Tadween plans like channels.
- Per workspace: only admins connect or disconnect; members can use what is connected.
- Per tool: each `ConnectorTool` declares `access: 'read' | 'write'` and maps to MCP `readOnlyHint` and `destructiveHint`. OAuth MCP clients with only `mcp:read` get read tools only. A write connector tool (for example "post to Slack") needs `mcp:write`.

### 2.5 How the agent discovers and calls connector tools

1. `LoadToolsService.loadTools()` keeps the static `toolList`, then adds, **per request**, the tools of the connectors enabled for the caller's organization (`ConnectorManager.toolsFor(orgId)`). Names are namespaced (`drive_searchFiles`, `notion_getPage`) so they never collide with core tools.
2. One generic meta tool, `connectorList`, returns the enabled connectors and their tool names, so a client that cached an old tool list can still find them.
3. Every connector tool runs through a wrapper that resolves the org from `requestContext` (as `checkAuth` does today), loads and refreshes tokens, enforces rate limits, writes a `ConnectorEvent`, and returns either data or `{ error }` (the same graceful shape as `uploadFromUrlTool`).
4. Media never flows through the agent as bytes. Media-source tools return a vendor file reference. A generic `importFromConnector` tool fetches it server-side and hands it to `MediaService` (the same validation path as `uploadFromUrl`), then returns `{ id, path }` for `integrationSchedulePostTool`.
5. The Mastra MCP server is built per mount today. Exposing org-specific tools means building the tool set in the per-request context, which `startMcp` already resolves through `resolveAuth`. This is the main engineering risk, so phase 0 includes a spike.

### 2.6 Events out (notify and automation connectors)

- Generalize `sendWebhooks` into a `TadweenEvent` bus with `post.published`, `post.failed`, `post.scheduled` and `post.deleted`. This is a **new** activity and a **new** workflow version: per CLAUDE.md, the existing workflows and activity parameters must not change.
- Add HMAC signatures (`X-Tadween-Signature`, a shared secret per webhook) and retries with backoff. Existing webhooks keep working, unsigned, until their owner opts in.
- Slack and Teams connectors subscribe to the bus through `onEvent`. Zapier, Make and n8n consume the same signed webhooks, plus the public API.

### 2.7 Rate limits and cost

- A per-connector token bucket keyed `org:connector`, stored in Redis next to the throttler storage. Defaults: 60 calls a minute and 1,000 a day per org. Each connector can also declare its vendor quota.
- Extend `ThrottlerBehindProxyGuard` to cover `/public/v1/connectors/*` and MCP tool calls, not only `POST /posts`.
- Connector calls don't spend AI credits. Generation still does, as it does today.

## 3. Security and data exposure

- **Least privilege.** Use the narrowest vendor scopes, picker-style file access where the vendor has one (Google Picker, Dropbox Chooser), and per-tool read or write.
- **No new external exposure without a decision.** Connector tools return only what the user asked for. We never mirror whole drives or CRMs into Tadween. Content imported into a post is stored like any post. Exposing any stored connector field through the public API, MCP or webhooks is an explicit, reviewed decision (CLAUDE.md).
- **Credentials.** Tokens are encrypted, never returned by any endpoint or tool, and never logged. Disconnect deletes them.
- **SSRF.** All remote fetches go through the `MediaService` path that already guards uploads from URLs. Vendor download URLs are resolved server-side.
- **Prompt injection.** Text pulled from docs, RSS or the CRM is untrusted. The agent treats it as content, never as instructions. Write tools (publishing, posting to Slack) keep requiring the user's request, and the no-delete rule stays.
- **Audit.** `ConnectorEvent` for every tool call, and `Post.creationMethod` extended with `CONNECTOR`. Admins see the log in Settings.
- **Tenancy.** Every query is scoped by `organizationId`. Customer groups are respected: a connector can be limited to one customer.
- **Payments rule.** No connector code runs inside billing webhooks.

## 4. First connectors (in order)

| # | Connector | Kind | Auth | Agent tools (namespaced) | Why first |
| --- | --- | --- | --- | --- | --- |
| 1 | Signed webhooks and event bus (Zapier, Make, n8n) | export / notify | secret | (none; events) | Unlocks every automation tool at once and fixes today's unsigned webhook. |
| 2 | Slack and Microsoft Teams notifications | notify | OAuth | `slack_listChannels` | Most-asked team feature: "tell us when it posts or fails". |
| 3 | Google Drive and Dropbox | media-source | OAuth | `drive_searchFiles`, `drive_import`, `dropbox_*` | Media lives there. It reuses `MediaService`. |
| 4 | Notion and Google Docs | content-source | OAuth | `notion_search`, `notion_getPage`, `gdocs_getDocument` | "Turn this doc into LinkedIn posts" is the main agent use case. |
| 5 | Blogs and RSS v2 | content-source | none | `rss_preview`, `blog_latest` | Builds on `AutoPost`: drafts for review instead of auto-publishing, and better Arabic summaries. |
| 6 | Canva | media-source | OAuth (Connect API) | `canva_listDesigns`, `canva_export` | Design import without download and upload. Needs Canva partner approval. |
| 7 | HubSpot | crm / export | OAuth | `hubspot_listCampaigns`, `hubspot_logPost` | Agency and B2B demand. Reports post results back to campaigns. |
| 8 | Analytics export (Google Sheets, CSV) | export | OAuth | `sheets_appendAnalytics` | Client-ready reports for the Agency plan. |

## 5. Phased roadmap and effort

Estimates are for one full-stack engineer familiar with the codebase. QA and review are included, vendor app approvals are not.

| Phase | Scope | Effort |
| --- | --- | --- |
| 0. Foundations | `ConnectorProvider`, `ConnectorManager`, Prisma models and migration, controller/service/repository, encrypted tokens, Settings → Connectors UI (list, connect, disconnect), `connectors` feature key and plan limit, a spike on per-org MCP tools in `startMcp`/`LoadToolsService` | 2–3 weeks |
| 1. Events out | `TadweenEvent` bus (new activity and new workflow version), HMAC-signed webhooks with retries, Slack and Teams notify connectors, docs for Zapier, Make and n8n recipes | 2 weeks |
| 2. Media sources | Drive and Dropbox (picker and import), the generic `importFromConnector` tool, rate limits, `ConnectorEvent` audit and its Settings view | 2–3 weeks |
| 3. Content sources | Notion, Google Docs, RSS v2 drafts; agent prompts tuned for "doc → per-channel posts" in Arabic and English | 2–3 weeks |
| 4. Partners | Canva (after approval), HubSpot, Sheets export | 3–4 weeks |
| 5. Hardening | Per-connector quotas in billing, admin analytics, marketplace-style directory page, public docs | 1–2 weeks |

Total: about 12–17 engineer-weeks. Phases 0 and 1 alone (4–5 weeks) already make the "coming soon" section partly true, through Slack, Teams and the Zapier, Make and n8n route.

## 6. Open questions for the owner

1. **Which three connectors matter most to your first customers?** The order above assumes agencies in Egypt and the Gulf (Slack/Teams, Drive, Notion/Docs).
2. **Plans.** Should connectors be on every plan, or counted per plan like channels (for example Creator 1, Pro 3, Team 10, Agency unlimited)?
3. **Hosted vendor apps.** Tadween needs its own OAuth apps with Google, Dropbox, Notion, Slack, Microsoft, Canva and HubSpot, under the company's legal entity, plus Google's OAuth verification for Drive scopes. Who owns those accounts?
4. **Data residency.** Are there customers (government or banking in the Gulf) who need connector data to stay in-region? That affects where tokens and imported media live.
5. **Agent autonomy.** May the agent publish straight from a connector (for example new blog post → LinkedIn), or must connector-sourced content always land as a draft first?
6. **Webhook signing.** Is it acceptable to ask existing webhook users to opt in to signatures, or should we sign everything from day one, leaving receivers to ignore the header?
7. **Upstream.** Postiz may ship its own connectors. Do we build ours in `libraries/` in a way we could offer upstream, or keep them Tadween-only to protect the upstream-sync path?
8. **Legal.** Connectors read customer data from third parties. The Terms and Privacy Policy need to cover that, and today the app's sign-up page still links to Postiz's own Terms and Privacy pages (`apps/frontend/src/components/auth/register.tsx`).
