# Settings layout

The `/settings` screen is a full-width, two-pane layout in the style of Apple's
System Settings. It is built from a few pieces in
`apps/frontend/src/components/tadween/settings/settings.nav.tsx`; the styles
live in `apps/frontend/src/app/tadween/settings.scss`.

## Screen

| Piece | What it is |
|---|---|
| `SettingsPopup` (`components/layout/settings.component.tsx`) | Builds the list of pages for this person (plan, role and super-admin feature switches decide what shows) and renders the shell. |
| `SettingsNav` | The side nav: a search field, then the groups **Account**, **Workspace**, **Developers**, **Billing** and **Danger zone**. Items look like the app sidebar's: muted until hovered, and the current page is a raised card with its icon in the brand colour. On phones (`asList`) it is the whole screen, laid out as iOS-style inset lists with an icon tile, a one-line description and a chevron. |
| `SettingsPageHeader` | The page title and one-line description. On desktop it stays at the top while the page scrolls (blurred background, hairline below). On phones it shows a back button to the list. |
| `SettingsSection` | A card: title, optional description, optional action on the end side (for example **Add a webhook**). |
| `SettingsRow` | One setting: label and help text on the start side, the control on the end side, an optional `status` before the control. Rows are separated by hairlines. |
| `SettingsListRow` | A saved item (webhook, feed, signature, set): icon tile, title, badges, a meta line, and quick actions. Clicking the row opens the editor. |
| `useSaveState` + `SaveState` | Inline save feedback next to a control: a spinner, then **Saved ✓** for a moment, or **Couldn't save** until the next try. The job passed to `run` returns `false` (or throws) on failure. |

The Tadween pieces render inside `TadweenScope` (`.tdw-ui`), so they use the UI
kit (`Button`, `Input`, `Textarea`, `Select`, `Switch`, `SegmentedControl`,
`Pill`, `Avatar`, `EmptyState`, `Skeleton`).

## Pages

| Group | Page (`?tab=`) | Component | Data |
|---|---|---|---|
| Account | Profile (`profile`) | `ProfileSettings` | `GET/POST /user/personal` (name, bio, photo from the media library); sign-in email and method |
| Account | Language and time (`preferences`) | `PreferencesSettings` | Language picker (Postiz's `ChangeLanguageComponent`), 12/24-hour time (`isUS` in localStorage) |
| Account | Notifications (`notifications`) | `NotificationSettings` | `GET/POST /user/email-notifications` |
| Workspace | General (`general`) | `GeneralSettings` | Workspace name and your role; short links (`GET/POST /settings/shortlink`) |
| Workspace | Team (`teams`) | `TeamSettings` | `GET/POST/DELETE /settings/team` |
| Workspace | Signatures (`signatures`) | `SignaturesSettings` | `/signatures`, Postiz's signature editor |
| Workspace | Sets (`sets`) | `SetsSettings` | `/sets`, the composer with **Save as set** |
| Workspace | Auto post (`autopost`) | `AutopostSettings` | `/autopost`, Postiz's feed editor, the active switch |
| Workspace | Webhooks (`webhooks`) | `WebhooksSettings` | `/webhooks`, Postiz's webhook editor (with **Send test**) |
| Developers | API & MCP (`api`) | `ApiSettings` | API key (`/user/self`, `POST /user/api-key/rotate`), MCP, CLI, public API; see below |
| Developers | Approved apps (`approved_apps`) | `ApprovedAppsSettings` | `GET/DELETE /user/approved-apps` (OAuth apps and assistants you allowed) |
| Billing | Billing | link to `/billing` | Same rule as the account menu's Billing link |
| Danger zone | Delete account (`danger`) | `DangerSettings` | Postiz's delete flow (confirm dialog, progress overlay) |

The old `?tab=global_settings` opens **Language and time**. A tab the person
can't see, or an unknown one, opens the first page (on phones, the list).

## Behaviour

- **URL per page.** Choosing a page pushes `?tab=<page>` with
  `window.history.pushState`, so back, refresh and shared links work.
- **Full height on desktop.** The shell measures where it starts (below the top
  bar and any admin or announcement bar) into `--tdw-set-top` and fills the
  window from there. The nav and the page scroll separately.
- **Phones** (`max-width: 1025px`, the same breakpoint as `usePhoneLayout`):
  `/settings` is the list screen. A page slides in from the inline end with a
  back button. If the page was opened from the list, back pops the history
  entry; after a deep link it replaces the URL with the list.
- **Search** matches page titles, descriptions and the labels of the rows on
  each page (`keywords`). Enter opens the first match, Escape clears.
- **Lists** show a skeleton while loading, an empty state whose button is the
  next step, and **Add** in the card header once there is something in the list.
  Delete asks first (`deleteDialog`).
- **RTL.** Logical properties throughout; chevrons flip; URLs and emails use
  `.tdw-set-ltr` (global.scss turns `[dir='ltr']` into RTL, so it is a class).
- **Motion.** Pages fade up, phone pages slide in on the spring curve, saved
  states fade in. All of it is off under `prefers-reduced-motion`.

## API & MCP page

`apps/frontend/src/components/tadween/settings/api.settings.tsx` (styles:
`.tdw-api-*` in `settings.scss`). It replaces Postiz's `PublicComponent` on
`?tab=api` and `ApprovedAppsComponent` on `?tab=approved_apps`; both Postiz files
are unchanged (the onboarding modals still import from `public.component.tsx`).
The tab is still hidden when the super admin turns off `publicApi`.

Sections, top to bottom: **Overview** (what you can do, status chips, the two
MCP addresses), **API key** (masked, reveal, copy, rotate with a confirm that
lists what breaks), **Connect an AI assistant** (one tile per client, each
opens a guide), **Public API** (base URL, auth header, curl examples, rate
limit, request builder, docs link from Branding `docsUrl` when set) and
**OAuth apps** (opens Postiz's `DeveloperComponent`).

### Addresses (all built from this instance's URLs)

| What | Address | Auth |
|---|---|---|
| MCP, API key | `<MCP_URL or backend>/mcp` | `Authorization: Bearer <key>` |
| MCP, sign in | `<MCP_URL or backend>/mcp-oauth-dynamic` | OAuth 2.1 + PKCE; the client registers itself (`/oauth/register`) |
| Public API | `<backend>/public/v1/*` | `Authorization: <key>` (raw key, **no** `Bearer`) |
| CLI | `POSTIZ_API_URL=<backend>`, `POSTIZ_API_KEY=<key>` | API key |

The key never goes into a URL: the `/mcp/<key>` and `/sse/<key>` routes still
exist on the backend but the page does not offer them. Clients that cannot send
headers (claude.ai, ChatGPT) use the OAuth address. `/mcp-oauth-chatgpt` is
left out: it has no registration endpoint and only serves the official ChatGPT
app's pre-registered client.

### Clients

| Tile | Ways | Notes |
|---|---|---|
| Claude | Connector (OAuth URL); Desktop config (API key, `mcp-remote` bridge, macOS/Windows paths) | `--allow-http` is added only when the instance runs on `http://` |
| Claude Code | `claude mcp add --transport http …` with a Bearer header, or the OAuth URL + `/mcp` → Authenticate | |
| ChatGPT | Developer mode → Create, OAuth URL | |
| Cursor, VS Code, Windsurf | JSON config with a Bearer header, or the OAuth URL (Cursor, VS Code) | VS Code uses an `inputs` prompt so the key is not written in the file |
| n8n | MCP Client Tool (HTTP Streamable, Bearer Auth), or the `n8n-nodes-postiz` community node (Host = backend) | |
| Make & Zapier | HTTP request to `POST /public/v1/posts`; Settings → Webhooks for events | |
| Terminal (CLI) | `npm install -g postiz` + env vars (macOS/Linux and PowerShell tabs) | |
| Grok | Chat instructions (CLI pointed at this instance) | |
| Other MCP clients | Streamable HTTP + header, or the OAuth URL | |

### Pieces

| Piece | What it is |
|---|---|
| `useConnectContext` | Instance name and slug (server name in configs), MCP/OAuth/API addresses, the key or `YOUR_API_KEY` for Members (the backend blanks the key for the `USER` role). |
| `useClientGuides` | The client list. Each guide has methods (`auth: 'key' \| 'oauth' \| 'none'`), optional OS tabs, numbered steps (text + snippet), a test prompt and troubleshooting tips. Add a client here. |
| `GuideBody` | Method and OS switches, **Show key**, the steps, the test hint, troubleshooting. A Dialog on desktop, a `TadweenSheet` on phones. |
| `CodeBlock` | A snippet: monospace, always left to right, the key masked until **Show key**; the copy button copies the real text. |
| `CopyField` | One-line value with a copy button (addresses, the auth header). |
