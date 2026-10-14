# Tadween plugin: review notes (paste into the portal)

## 1. Tool scan findings: explanation for the review team
Tools flagged: integrationSchema, triggerTool, generateVideoOptions, videoFunctionTool
("operations not individually exposed").

> These four tools are helper tools inherited from the open-source Postiz MCP server, which
> already has an approved listing in the ChatGPT directory with the same tools. In Tadween they
> are bounded, not generic:
>
> - **triggerTool** runs only a method that the target channel's provider has declared in a fixed
>   allowlist, and rejects any other method name server-side ("Method not found for this
>   integration"). The allowlist is part of the provider code; the model cannot add operations.
> - **integrationSchema** only returns the posting rules, length limit and settings of a channel
>   plus that provider's allowlist. It is read-only (readOnlyHint true).
> - **For LinkedIn, the channel Tadween is built for, the allowlist is empty**: LinkedIn profiles
>   and pages declare no helper methods, so triggerTool has nothing to run. The helpers exist for
>   other channels (for example Pinterest boards or Reddit flairs) that need an id before posting.
> - **generateVideoOptions** and **videoFunctionTool** are read-only helpers (readOnlyHint true)
>   for the optional AI video feature; they are not needed for any of the five test cases.
>
> - **Evidence from the live directory:** the published Postiz app in ChatGPT (the open-source server Tadween
>   is built on) lists the same tools with the same descriptions: integrationSchema, triggerTool,
>   generateVideoOptions and videoFunctionTool, among its 10 read and 10 write tools.
>
> The write actions that publish or change content are separate, individually exposed tools
> (integrationSchedulePostTool, postSettingsTool, uploadFromUrlTool, generateImageTool), and
> ChatGPT asks the user before it runs them. If the helpers are a blocker we can hide them from the
> directory endpoint; please tell us and we will publish a filtered toolset.

Honest note for us: triggerTool is annotated readOnlyHint false, destructiveHint true,
openWorldHint true in the code (it can refresh a token and disconnect a channel whose token
expired). Do not describe it as read-only.

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
2. "Which LinkedIn pages do I have connected in Tadween?" (integrationList)
3. Draft with two images (uploadFromUrlTool, integrationSchedulePostTool, type draft).
4. "What are the posting rules for my LinkedIn page?" (integrationSchema)
5. Update a draft's settings (postsListTool, postSettingsTool).
6. Generate an image (generateImageTool).
7. Three negative prompts: calendar move, copy-only, email: no Tadween tool is called.
Share as an unlisted link, then add it as demo_recording_url in plugin.json (bump the version).

## 4. Annotation justifications (portal, per tool)
Read-only, closed-world: integrationList, groupList, integrationSchema, postsListTool,
generateVideoOptions, videoFunctionTool, videoStatusTool.
Write, additive: integrationSchedulePostTool, postSettingsTool, uploadFromUrlTool,
generateImageTool, generateVideoTool, upload widget tools.
triggerTool: write, destructive true, open-world true (token refresh and disconnect on expiry).
