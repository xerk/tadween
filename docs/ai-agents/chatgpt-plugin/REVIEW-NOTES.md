# Tadween plugin: review notes (paste into the portal)

## 1. Reply to OpenAI (resubmission of 1.1.0)
> Thank you for the review. We rebuilt the Tadween MCP server for the directory instead of
> appealing. Version 1.1.0 connects to a dedicated endpoint,
> https://studio.tadween.app/mcp-oauth-openai, that only exposes explicit tools:
>
> - The generic helpers are gone from this endpoint: integrationSchema, triggerTool,
>   generateVideoOptions and videoFunctionTool (and the video generation tools that depended on
>   them). No tool takes a function name or a free-form arguments object.
> - Scheduling (integrationSchedulePostTool) and updating a post's settings (postSettingsTool)
>   declare every supported network's settings upfront in their input schema, one variant per
>   network (Facebook, Instagram, LinkedIn, Threads, TikTok, X, YouTube), with its rules,
>   character limit, enums and required fields.
> - The network lookups a post can need are their own read-only tools with fixed names and typed
>   output: searchInstagramAudio, searchTikTokMusic and searchTikTokLocations.
> - All 14 tools carry title, readOnlyHint, destructiveHint, idempotentHint and openWorldHint, and
>   every input object is closed (additionalProperties: false).
>
> OAuth is unchanged (dynamic client registration, mcp:read and mcp:write). The reviewer account
> and test cases are in Review details.

## 2. Reviewer sign-in instructions (portal: Review details)
- Sign-in method: Username and password
- Login URL: https://studio.tadween.app/auth/login
- Steps: 1) sign in with the demo account; 2) when ChatGPT asks to connect Tadween, approve the
  access screen (Authorize); 3) the workspace already has a connected LinkedIn page and sample
  posts; 4) run the five test cases; nothing is published unless the prompt says to schedule.
- Workspace: one connected **YouTube channel** (Tadween). LinkedIn is not connected yet (LinkedIn
  API approval pending), so the test cases are channel-neutral and the draft case is expected to
  report that YouTube needs a video; nothing is published.
- Demo account (to create, no Google sign-in, no 2FA): email + password you choose.
  Create it from the Tadween app: Settings, Team, invite a new member (signup is invite-only), open
  the invite link, register with email and password. Keep the password out of git and out of the ZIP.
- Paste into Review details, Instructions: "Sign in at https://studio.tadween.app/auth/login with
  the demo account. When ChatGPT asks to connect Tadween, approve the access screen. The workspace
  has one connected YouTube channel; run the five test cases and three negative cases."

## 3. Demo recording (about 3 minutes), one take
1. ChatGPT: add Tadween (Settings, connectors) and sign in.
2. "Which channels do I have connected in Tadween?" (integrationList)
3. Draft with two images (uploadFromUrlTool, integrationSchedulePostTool, type draft).
4. "What is in my media library?" (mediaListTool)
5. Update a draft's settings (postsListTool, postSettingsTool).
6. Generate an image (generateImageTool).
7. Three negative prompts: calendar move, copy-only, email: no Tadween tool is called.
Share as an unlisted link, then add it as demo_recording_url in plugin.json (bump the version).

## 4. Annotation justifications (portal, per tool)
Read-only, closed-world (Tadween data only): integrationList, groupList, postsListTool,
mediaListTool, uploadWidgetStatusTool.
Read-only, open-world (search the social network through the connected channel, change
nothing): searchInstagramAudio, searchTikTokMusic, searchTikTokLocations. When the provider asks
for it they refresh the channel's access token; a failed refresh is reported, the channel is not
changed.
Write, destructive, open-world: integrationSchedulePostTool (a "now" or "schedule" post is
published to the social network; ChatGPT confirms first).
Write, destructive, closed-world: postSettingsTool (overwrites settings of a post that is not
published yet).
Write, additive, open-world: uploadFromUrlTool (fetches a public URL), generateImageTool (AI
image, uses AI credits).
Write, additive, closed-world: uploadWidgetTool, uploadWidgetTicketTool (the upload widget).
