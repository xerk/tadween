# Super-admin console

`/admin` is the instance owner's console (`User.isSuperAdmin`). This page covers its layout, the DataTable every list uses, the Subscribers page, provider keys and the endpoints. What the console configures (registration, features, plans, branding) is in [super-admin.md](super-admin.md).

## Access

- Routes live in `apps/frontend/src/app/(app)/(admin)/admin/*`, outside the customer `(site)` group, so none of the customer chrome (workspace sidebar, top bar, billing gate, CopilotKit) loads.
- `admin/layout.tsx` (server) asks `/user/self` and redirects anyone who isn't a super admin to `/launches`. That only hides the UI: every API route below is behind `AuthMiddleware` + `PlatformAdminGuard` and answers 403 (Postiz's own `/admin/errors` and `/admin/stats` answer 400).
- While impersonating, the console keeps working for the real super admin (the guard reads the flag the auth middleware keeps for the real login).

## Layout

`components/tadween/admin/admin.layout.tsx` provides what the pages need (signed-in user context, Mantine modals for Postiz's language/log-out dialogs, toaster, tooltips) and renders `AdminShell` (`admin.shell.tsx`). Styles: `apps/frontend/src/app/tadween/admin.scss` (`@use` in `global.scss`).

```
┌──────────────┬──────────────────────────────────────────────────────────┐
│ Logo  Admin ‹│ Admin › Customers › Subscribers   [Search /] Env  ← App   │  top bar (sticky)
│ HOME         ├──────────────────────────────────────────────────────────┤
│  Overview    │ Title                                         [actions]   │
│ CUSTOMERS    │ description                                               │
│  Subscribers │                                                           │
│  Users       │ DataTable / sections, full width                          │
│ PRODUCT      │                                                           │
│  Channels    │                                                           │
│  Plans       │                                                           │
│  Features    │                                                           │
│ BRAND        │                                                           │
│  Branding    │                                                           │
│ SYSTEM       │                                                           │
│  Post errors │                                                           │
│  Usage stats │                                                           │
│  API         │                                                           │
│ ← Back to app│                                                           │
│ (account)    │                                                           │
└──────────────┴──────────────────────────────────────────────────────────┘
```

- **Sidebar** (`ADMIN_NAV`): grouped Home · Customers · Product · Brand · System. The ‹ button or ⌘\ / Ctrl+\ collapses it to a 72 px icon rail; the choice is kept in the `tdw-admin-side` cookie. Below 1026 px it is a slide-in drawer opened from the menu button, with a scrim; it closes on navigation.
- **Foot**: "Back to app" and the same `AccountMenu` as the customer app (settings, appearance, language, log out).
- **Top bar**: breadcrumbs (Admin › group › page), global search, an environment badge (`useVariables().environment`: red for production, amber otherwise) and "Back to app". On phones only the menu button and search stay.
- **Global search** (`admin.search.tsx`): `/` focuses it. It queries the Subscribers and Users list endpoints with `pageSize=5` and opens the picked row with `?open=<id>` on its page. Enter opens the first result.
- **Page body**: `AdminPage({ title, description, action, children })`, full width, `grid-template-columns: minmax(0, 1fr)` so wide tables scroll inside their own box instead of the page.
- **Theme and language**: colours are `--tdw-*` tokens, so light/dark follow `body.light/.dark`. Everything uses logical properties; in Arabic the sidebar sits on the right, drawers come from the left and arrows flip. New chrome strings use `useT` with `tdw_admin_*` / `tdw_dt_*` keys (en + ar). Copy inside the older pages (Features, Plans, Branding…) is still English only.

## DataTable

`components/tadween/ui/data.table.tsx`, exported from the UI kit. One component for every admin list.

### Modes

| Mode | When | Who does search / filter / sort / paging |
| --- | --- | --- |
| server | `query` + `onQueryChange` from `useTableQuery` | The API. State is in the URL. |
| client | `mode="client"` or no `onQueryChange` | The table, over the `rows` it was given. For short registries (channel types, plans, endpoint list), not database tables. |

### Props

| Prop | Type | Notes |
| --- | --- | --- |
| `id` | string | Remembers hidden columns and density in localStorage (`tdw-dt:<id>:*`), and names the CSV file. |
| `columns` | `DataColumn<R>[]` | `key`, `label`, `title` (plain name for the Columns menu and CSV), `render`, `width`, `align`, `sortable` (server: `key` is the API sort key; client: compares `sortValue`), `hideable` (default true), `defaultHidden`, `csv` (value written to the CSV; columns without it are not exported). |
| `rows`, `rowKey` | | The current page (server) or every row (client). |
| `total` | number | Server mode: total rows for the query. |
| `query`, `onQueryChange` | `TableQuery`, `(patch) => void` | `{ page (0-based), pageSize, sort, order, search, filters }`. |
| `loading`, `error`, `onRetry` | | First load shows skeleton rows; a refresh dims the current rows; an error shows the message and a Try again button. |
| `searchable`, `searchPlaceholder`, `searchText` | | Search box (debounced 300 ms). `searchText` is the client-mode haystack. |
| `filters` | `DataFilter<R>[]` | `{ key, label, options, match? }`, one Select each ("Label: All" clears). `match` is client mode only. "Clear" resets search and filters. |
| `toolbar` | ReactNode | Extra buttons before the Columns / density / export icons. |
| `onRowClick`, `activeKey` | | Clickable rows (Enter too); `activeKey` highlights the open one. |
| `selectable`, `bulkActions(selected, clear)` | | Checkbox column (page-level select all) and a sticky bulk bar. Selection clears when the query changes. |
| `empty` | ReactNode | Shown when there are no rows and nothing is filtered ("Nothing matches these filters." otherwise). |
| `exportAll` | `() => Promise<R[]>` | Server mode CSV of the whole current query. `useExportAll()` (admin.api.tsx) walks the list endpoint at `pageSize=100`, at most 50 pages (5,000 rows). Client mode exports the filtered rows. The file has a UTF-8 BOM so Excel opens Arabic correctly. |
| `paginate` | boolean | false = no footer (short lists). |

### URL state (`useTableQuery({ filters, pageSize })`)

`?page` (1-based), `size` (20/50/100), `sort`, `order`, `q`, and one param per filter key. Defaults are left out of the URL. Typing in search replaces the history entry; every other change pushes one, so Back walks through views. Unrelated params are kept. `tableQueryString(query)` turns it into the API query (`page` 0-based, `pageSize`, `sort`, `order`, `search`, filters). `useOpenRow()` reads/writes `?open=<id>` for the row whose drawer is open, so a drawer survives reload and can be linked.

### Drawer

`components/tadween/ui/drawer.tsx`: `Drawer({ open, onClose, title, description, footer, size: 'md' | 'lg' })`. Slides in from the inline end (left in Arabic), scrim and Escape close it, full width on phones.

## Pages

| Page | List | Row opens |
| --- | --- | --- |
| Overview | stat tiles, subscriptions per tier | links to Subscribers, Channels, Errors |
| Subscribers `/admin/organizations` | server DataTable, filters Plan / Status, sort by workspace, plan, cancel date, channels, members, created; bulk copy owner emails / ids; CSV | workspace drawer |
| Users | server DataTable, filters Status / Role, sort by name, email, last seen, joined; bulk activate / deactivate; CSV | user drawer (workspaces, change plan, impersonate, activate) |
| Channels | client DataTable (order matters, 30-odd rows), filters Status / In Add channel; order arrows are disabled while filtered | keys drawer |
| Plans | client DataTable | plan dialog |
| Features, Branding | forms (unchanged) | |
| Post errors | server DataTable over Postiz's `GET /admin/errors` (search = user email, filters Platform / unknown first) | error drawer with the provider response and "Copy debug code" |
| Usage stats | Postiz's stats screen inside the frame | |
| API | backend URL, Swagger, MCP, public API / webhooks switches, client DataTable of console endpoints | |

### Subscribers

Each row: workspace, owner email, plan (Tadween plan name for the tier, else the tier), status, billing period and provider, cancel date, channels used / limit, members used / limit, created, Stripe customer and subscription ids (hidden column).

Status is derived from what Postiz stores, first match wins: no live `Subscription` row → **none**; `isLifetime` → **lifetime**; `cancelAt` set → **cancelled**; `Organization.isTrailing` → **trialing**; otherwise **active**. Limits: channels = `Subscription.totalChannels` (what Postiz enforces), members = `Plan.teamMembers` for the tier (−1 unlimited).

The drawer shows the subscription (ids copyable), usage (channels, members, published this month / all time, scheduled, failed in 30 days), members (owner first, each with Impersonate) and channels (name, network, connected / needs reconnecting / disabled; never tokens). Actions: **Impersonate owner** (Postiz's `POST /user/impersonate` with the membership id) and **Change plan** (`PUT /admin/console/organizations/:id/tier`, which refuses Stripe-paying and lifetime workspaces). Refunds, coupons and cancelling stay in the app's Admin menu while impersonating, because they act on the current workspace through Stripe. Nothing on this page calls Stripe.

Not stored, so not shown: the current period end (Stripe only) and subscription history.

## Provider keys

"Keys" are the app credentials each provider needs (LinkedIn client id/secret, X API key/secret…), listed per provider in `PROVIDER_CREDENTIALS` (`tadween.defaults.ts`). They used to be env-only.

- **Storage**: `ProviderCredential { name (env var name) @id, value, updatedAt, updatedBy }`. `value` is encrypted with `AuthService.fixedEncryption` (AES-256-CBC keyed from `JWT_SECRET`, the helper Postiz uses for organization API keys and third-party keys).
- **Resolution** (`ProviderCredentialsService`, registered in `DatabaseModule`): console value first, then the deployment's env var. Upstream provider code reads `process.env.<NAME>` in 28 files when it builds an auth URL, refreshes a token or publishes; instead of rewriting those reads (which would conflict with every upstream sync), the service is the one place that resolves the value and publishes it on `process.env` for exactly the names in `PROVIDER_CREDENTIALS`. It runs at start-up and every 60 s in every process that loads `DatabaseModule`: the backend and the orchestrator's Temporal worker. No workflow or activity changed. Removing a console value restores the env var captured at start-up.
- **Write-only**: `PUT /admin/console/providers/:identifier/credentials { values: { NAME: "value" | null } }`. Only names that provider declares are accepted; `null` or `""` removes the console value. Responses and `GET /admin/console/providers` carry `{ name, set, source: console | env | null, last4, updatedAt, editable, envOnlyReason, usedBy }` and never a value. `last4` is only given for names that don't look secret (no SECRET/TOKEN/KEY/MNEMONIC/PASSWORD).
- **Env-only names**: `TELEGRAM_TOKEN` (the Telegram bot is created when the module is imported) and `NEYNAR_CLIENT_ID` (the web app reads it too).
- **Caveats**: a key shared by two channel types (LinkedIn profile and page, Facebook and Instagram) changes both, which the drawer says. Google sign-in reads `YOUTUBE_CLIENT_ID/SECRET` at import, so a console value for YouTube does not change Google sign-in until the env var is set. If `JWT_SECRET` changes, stored values can't be decrypted; the service logs it and falls back to env.

## Endpoints

All under `PlatformAdminGuard` unless marked Postiz.

| Method | Path | Query / body | Returns |
| --- | --- | --- | --- |
| GET | `/admin/console/overview` | | counts |
| GET | `/admin/console/organizations` | `page` (0-based), `pageSize` (1–100, default 20), `sort` (`createdAt`, `name`, `tier`, `cancelAt`, `channels`, `members`), `order` (`asc`/`desc`), `search` (name, owner email, exact id or customer id, ≤120 chars), `tier` (`STANDARD`/`PRO`/`TEAM`/`ULTIMATE`/`NONE`), `status` (`active`/`trialing`/`cancelled`/`lifetime`/`none`) | `{ items, total, page, pageSize, pages }` |
| GET | `/admin/console/organizations/:id` | | workspace detail: subscription, members, channels (no tokens), usage, limits |
| PUT | `/admin/console/organizations/:id/tier` | `{ tier }` | unchanged |
| GET | `/admin/console/users` | `page`, `pageSize`, `sort` (`createdAt`, `lastOnline`, `email`, `name`), `order`, `search` (email, name, exact id, workspace name), `status` (`active`/`inactive`), `role` (`superadmin`/`member`) | `{ items, total, page, pageSize, pages }` (was `{ users, … }`) |
| PUT | `/admin/console/users/:id/activation` | `{ activated }` | unchanged |
| GET / PUT | `/admin/console/providers` | | now includes `credentials.fields` |
| PUT | `/admin/console/providers/:identifier/credentials` | `{ values }` | key status list |
| Postiz GET | `/admin/errors` | `page`, `limit`, `platform`, `email`, `unknownFirst` | `{ items, total, page, limit, hasMore }` |

Validation: `dtos/tadween/admin.list.dto.ts` (class-validator through the global `ValidationPipe({ transform: true })`). `sort` must be letters only; an unknown sort key falls back to the list's default order (newest first) with `id` as tie-breaker, so pages never overlap. Paging, sorting and filtering happen in Prisma (`AdminConsoleRepository`); every query selects explicit fields.
