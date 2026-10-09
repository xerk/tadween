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
`Pill`, `Avatar`, `EmptyState`, `Skeleton`). Postiz panels that still render as
they are (API & MCP, Approved apps) stay outside the scope and are re-skinned
by selector in `settings.scss`.

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
| Developers | API & MCP (`api`) | Postiz `PublicComponent` | API key (reveal, copy, rotate), CLI, MCP |
| Developers | Approved apps (`approved_apps`) | Postiz `ApprovedAppsComponent` | OAuth apps you allowed |
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
