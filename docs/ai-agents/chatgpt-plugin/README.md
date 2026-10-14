# Tadween plugin for ChatGPT and Codex

`tadween/` is the package OpenAI's plugin directory takes (Agent Plugins format: `plugin.json`, `mcp.json`, `skills/`, `assets/`). `tadween-chatgpt-plugin.zip` is the same folder zipped, ready to upload. Checked against https://developers.openai.com/plugins/deploy/submission on 2026-10-13.

MCP server: `https://studio.tadween.app/mcp-oauth-openai` (OAuth with dynamic client registration through the `/mcp-oauth-dynamic` issuer, scopes `mcp:read` and `mcp:write`). It serves the explicit directory toolset below; every other client keeps `/mcp-oauth-dynamic` and its full toolset.

## Before uploading
1. **Verified identity.** OpenAI organization settings → complete business verification (Xerk LLC) so the directory shows the publisher name.
2. **Domain challenge.** The portal shows a token; serve it as plain text at `https://studio.tadween.app/.well-known/openai-apps-challenge` (an nginx `location` on the studio host, root of the host, not under `/api`).
3. **Reviewer account.** A dedicated Tadween login with a connected LinkedIn page and sample data, no MFA, no email codes. Entered in the portal under Review details, never in the ZIP.
4. **Demo video.** Add `demo_recording_url` under `extensions.com.openai.review` in `plugin.json` and rebuild the ZIP. The five positive cases must be run against the reviewer account first.

## Upload
Platform dashboard → Plugins → Upload new or existing plugin → choose the verified developer identity → upload the ZIP → fix findings → MCPs → Connect (domain challenge, OAuth) → wait for the tool scan → Review details → Submit for review. After approval, Publish plugin gives the public `chatgpt.com/plugins/...` link.

## Notes
- No `apps`/`.app.json` and no hooks, which the portal rejects.
- Tool descriptions are scanned from the live server, so rename leftovers ("Postiz") on the server before connecting.
- Not set: `countries` and `translations` (optional).

## Server routing (done 2026-10-13)
`/etc/nginx/sites-available/tadween.app` on mesej, studio host: `/.well-known/oauth-protected-resource/*`, `/.well-known/oauth-authorization-server/*`, `/mcp-oauth*` and `/mcp` are proxied to the API (`/api`). Without it the metadata advertised issuer and resource URLs (no `/api` prefix) hit the frontend and redirected to /auth. Backup of the previous file: `/tmp/tadween.app.bak-*` on mesej.
The published Agent Plugins `mcp.schema.json` 1.0.0 rejects `extensions` on a server entry, but OpenAI's submission docs put the auth block there, so it follows the docs.

## Portal findings (2026-10-13, v1.0.0 draft)
- Subtitle (`shortDescription`) must be 30 characters or fewer: now "Schedule LinkedIn posts" (v1.0.1).
- Domain challenge: served by nginx on mesej (`location = /.well-known/openai-apps-challenge`), verified in the portal.
- OAuth discovery from OpenAI worked end to end (401, protected-resource, authorization-server, dynamic client registration 201).
- Still needed: authorize in the Connect drawer (sign in to Tadween), reviewer credentials, `demo_recording_url`.

## Tool scan findings (2026-10-13)
The portal scan flagged `integrationSchema`, `triggerTool`, `generateVideoOptions` and `videoFunctionTool`: "appears to execute operations that are not individually exposed" (generic discover-and-call helpers). The appeal was not accepted: OpenAI rejected 1.0.10 with "Your plugin uses dynamic tools to execute operations that were not individually exposed for review. Please expose each model-callable operation upfront as a separate tool with a clear description, input schema, and annotations."

## What changed since rejection (1.1.0)
- New endpoint `https://studio.tadween.app/mcp-oauth-openai`, used only by this plugin. Same OAuth as before (dynamic client registration, `mcp:read` / `mcp:write`, RFC 9207 `iss`), so nothing changes for the reviewer account. Production nginx already proxies `/mcp-oauth*` and `/.well-known/oauth-*` (see Server routing), so the path needs no server change beyond deploying the backend.
- Removed from this endpoint: `integrationSchema`, `triggerTool`, `generateVideoOptions`, `videoFunctionTool`, `generateVideoTool`, `videoStatusTool`. No tool takes a function name or a free-form arguments object.
- `integrationSchedulePostTool` and `postSettingsTool` list every supported network's settings upfront: one schema variant per network (Facebook, Instagram, LinkedIn profile and page, Threads, TikTok, X, YouTube) with its rules, character limit, enums and required fields. Channels on other networks get a clear "schedule this one in the Tadween app" answer.
- The network searches a post can need are separate read-only tools with fixed names and typed output: `searchInstagramAudio`, `searchTikTokMusic`, `searchTikTokLocations`.
- Every tool has `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint` and `openWorldHint`, and every input object is closed (`additionalProperties: false`).

## Tool list (1.1.0, `/mcp-oauth-openai`)
| Tool | Title | Kind | readOnly | destructive | idempotent | openWorld |
| --- | --- | --- | --- | --- | --- | --- |
| `integrationList` | List Integrations | read | true | false | true | false |
| `groupList` | List Groups | read | true | false | true | false |
| `postsListTool` | List Posts | read | true | false | true | false |
| `mediaListTool` | List Media | read | true | false | true | false |
| `searchInstagramAudio` | Search Instagram Audio | read | true | false | true | true |
| `searchTikTokMusic` | Search TikTok Music | read | true | false | true | true |
| `searchTikTokLocations` | Search TikTok Locations | read | true | false | true | true |
| `uploadWidgetStatusTool` | Upload Widget Status | read | true | false | true | false |
| `integrationSchedulePostTool` | Schedule Social Media Post | write | false | true | false | true |
| `postSettingsTool` | Update Post Settings | write | false | true | false | false |
| `uploadFromUrlTool` | Upload Media From URL | write | false | false | false | true |
| `generateImageTool` | Generate Image | write | false | false | false | true |
| `uploadWidgetTool` | Upload Media From Device | write | false | false | false | false |
| `uploadWidgetTicketTool` | Upload Widget Ticket (called by the widget, `visibility: app`) | write | false | false | false | false |

The clipping tools (`clippingTool`, `clippingStatusTool`, `clippingWidgetTicketTool`) have fixed schemas and annotations and are listed too, only when clipping is configured on the server (`UploadFactory.clippingEnabled()`). Check the scan result: if they show up, they belong in the tool list above.

## Resubmission
1. Deploy the backend with `/mcp-oauth-openai` and check `https://studio.tadween.app/.well-known/oauth-protected-resource/mcp-oauth-openai` answers with `"resource": "https://studio.tadween.app/mcp-oauth-openai"`.
2. Platform dashboard → Plugins → Tadween → upload the new ZIP (1.1.0 here, 1.1.1 after step 5) as a new version.
3. MCPs → Connect: the URL is now `/mcp-oauth-openai`; sign in with the reviewer account and wait for the tool scan. Expect 14 tools and no "not individually exposed" finding.
4. Review details: paste the reviewer instructions and the annotation notes from REVIEW-NOTES.md (sections 2 and 4).
5. Required before submitting: re-record the demo (REVIEW-NOTES.md section 3). The current `demo_recording_url` shows `integrationSchema`, a tool this endpoint no longer has, which is the pattern the review rejected. Put the new link in `plugin.json`, bump to 1.1.1 and rebuild the ZIP (`cd tadween && zip -X -r ../tadween-chatgpt-plugin-1.1.1.zip assets skills mcp.json plugin.json`, then copy it to `tadween-chatgpt-plugin.zip`).
6. Submit for review with the reply in REVIEW-NOTES.md section 1.
