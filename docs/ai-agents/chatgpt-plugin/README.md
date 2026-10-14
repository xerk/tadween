# Tadween plugin for ChatGPT and Codex

`tadween/` is the package OpenAI's plugin directory takes (Agent Plugins format: `plugin.json`, `mcp.json`, `skills/`, `assets/`). `tadween-chatgpt-plugin.zip` is the same folder zipped, ready to upload. Checked against https://developers.openai.com/plugins/deploy/submission on 2026-10-13.

MCP server: `https://studio.tadween.app/mcp-oauth-dynamic` (OAuth with dynamic client registration, scopes `mcp:read` and `mcp:write`).

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
The portal scan flagged `integrationSchema`, `triggerTool`, `generateVideoOptions` and `videoFunctionTool`: "appears to execute operations that are not individually exposed" (generic discover-and-call helpers).
Decision: no backend change. The plugin keeps `https://studio.tadween.app/mcp-oauth-dynamic` (the same endpoint the other clients use, the full toolset, as Postiz's own ChatGPT app has) and each finding is appealed in the portal (MCPs, tool, Appeal).
A directory-only endpoint that hides these tools was written and dropped; it is in git history if the appeals are rejected.
