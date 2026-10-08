# Super-admin console

The instance owner (any user with `User.isSuperAdmin = true`) configures Tadween from `/admin` instead of env vars and code. This document records what existed, what Phase A adds, and what is left.

## What already existed in Postiz

- `User.isSuperAdmin`. `AuthMiddleware` re-reads the user from the database on every request. While impersonating, the impersonated user is given `isSuperAdmin = true` only when the real login is a super admin.
- `/admin/errors` and `/admin/stats` pages (`components/admin/*`) backed by `AdminController` (`/admin/errors`, `/admin/stats`). These checks return 400, not 403.
- Impersonation: `GET/POST /user/impersonate`. The POST takes a **UserOrganization id** and sets the `impersonate` cookie. There is also the yellow admin bar (`components/layout/impersonate.tsx`) with "add free subscription", coupons and announcements.
- `pricing` (`libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing.ts`), a static map keyed by `SubscriptionTier` (FREE, STANDARD, TEAM, PRO, ULTIMATE). Stripe creates prices on the fly from `month_price` and `year_price` (`stripe.service.ts`), and permissions and subscriptions read limits from it.
- Providers: `socialIntegrationList` in `integration.manager.ts`, the `HIDDEN_PROVIDERS` env var, and credentials read from `process.env` inside each provider.
- Registration: `DISABLE_REGISTRATION` (closed, though the first account is still allowed). `INVITE_ONLY_REGISTRATION` exists only as a hot patch on post.xerk.io (`patches/auth.service.js`).
- Schema changes are applied with `prisma db push` (`pnpm run prisma-db-push`). The repo has no migrations folder.

## Data model (Phase A)

The new models sit in a marked `Tadween` block at the end of `schema.prisma`. When a row is missing, the app behaves exactly like Postiz.

| Model | Purpose |
| --- | --- |
| `PlatformSetting { key, value Json, updatedBy }` | `registration` → `{ mode }`, `features` → `{ [key]: boolean }`, `branding` → `{ instanceName, supportEmail, defaultLanguage, defaultTimezone }` |
| `ProviderSetting { identifier, enabled, position }` | Add-channel enablement and order. Holds no secrets. |
| `Plan` | Name, key, description, `tier` (a Postiz `SubscriptionTier`), USD and EGP prices (whole numbers), trial days, most popular, limits (channels, team members, posts/month, AI credits), feature bullets, optional provider price ids, active, position, soft delete. |

Apply the schema with `pnpm run prisma-db-push`. Every reader catches a missing table and falls back to Postiz defaults, so deploying the code before the push does not break anything.

### Defaults and seeding

- Features default to on, except the Postiz partner shortcut `ugc` (AgentMedia UGC videos), which starts off (and stays hidden while the settings load). `TADWEEN_DISABLED_FEATURES="plugs,agent"` turns features off and `TADWEEN_ENABLED_FEATURES="ugc"` turns the partner shortcut on, until the admin saves a value. Postiz's affiliate link was removed from the menu, so there is no `affiliate` switch; an old saved `affiliate` value is ignored.
- Registration falls back to `DISABLE_REGISTRATION` (closed), then `INVITE_ONLY_REGISTRATION` (invite), then open.
- Providers default to LinkedIn and LinkedIn Page first, followed by Postiz's own order, all enabled. `HIDDEN_PROVIDERS` still hides a provider whatever the setting says.
- Plans are seeded **on request**: Admin → Plans → "Add the Tadween plans" creates Creator, Pro, Team and Agency from the design system. Their prices are **placeholders**. Seeding is not automatic because it would change what an existing instance charges.
- The default plans' **limits are taken from Postiz's `pricing` map** for their tier (channels 5 / 10 / 30 / 100, team members on from TEAM up, AI credits 20 / 100 / 300 / 500), so loading them never lowers what a paying workspace has. See "Existing subscribers" below.

## Pricing: how plans reach billing

`PlansService.getPricing()` returns the static `pricing` map with each active plan overlaid on its tier. A plan sets `month_price` and `year_price` (USD), `channel`, `team_members` (teamMembers ≠ 0), `posts_per_month`, and `ai` / `image_generation_count` (aiCredits). The tier's other Postiz flags are unchanged. With no plans, the result is the static map.

These places read the overlay: Stripe checkout, prorate and embedded checkout (prices and channels), the subscription webhooks (channels), `PermissionsService`, `SubscriptionService.addSubscription` and `checkCredits`, `/instance/settings` (frontend `user.context`), and the billing pages (`first.billing`, `main.billing`), which show plan names and bullets in admin order.

- Stripe keeps working because it finds or creates a price by `unit_amount`, so a new USD price makes a new Stripe price. Existing subscribers keep what they pay.
- One active plan per tier, because checkout is keyed by tier. The default mapping is Creator→STANDARD, Pro→TEAM, Team→PRO and Agency→ULTIMATE, so inherited Postiz capabilities grow with the plan.
- Provider price ids are stored but **not read** yet.

### Existing subscribers

A plan's limits replace its tier's limits for **every workspace on that tier**: team members and AI at once (`PermissionsService`, `OrganizationService`), channels at the next Stripe subscription event (`Subscription.totalChannels`). So `PlansService` refuses (HTTP 400) any change that would make a tier's effective channels, team members, posts per month, AI or AI credits lower than today while a `Subscription` (not deleted, lifetime included) exists on that tier. That covers creating, editing, hiding, moving a plan to another tier, deleting it (the tier falls back to the static map) and loading the defaults. Raising limits is always allowed, and a tier nobody is subscribed to can be set to anything. To sell a smaller plan, put it on an empty tier.
- EGP is stored and shown in the admin preview. Checkout still charges USD.

## Environment variables

Each one is a fallback or an opt-in; what the admin saves in `/admin` wins. All are listed in `.env.example`.

| Variable | Effect |
| --- | --- |
| `DISABLE_REGISTRATION=true` | Registration mode falls back to **closed** (invites refused too; the first account on a fresh instance is still allowed) |
| `INVITE_ONLY_REGISTRATION=true` | Registration mode falls back to **invite only** |
| `TADWEEN_DISABLED_FEATURES` | Comma-separated feature keys that start off |
| `TADWEEN_ENABLED_FEATURES` | Comma-separated keys that start on although they default off (today only `ugc`) |
| `TADWEEN_INSTANCE_NAME` | Brand name in emails, MCP metadata and provider user agents (default `Tadween`) |
| `TADWEEN_WEBSITE_URL`, `TADWEEN_TERMS_URL`, `TADWEEN_PRIVACY_URL`, `TADWEEN_DOCS_URL`, `TADWEEN_SUPPORT_URL`, `TADWEEN_TUTORIAL_VIDEO_URL` | Branding links until saved in Admin → Branding. Empty hides the link (the tutorial video hides the onboarding video and the paywall's "See how it works") |
| `TADWEEN_PLACEHOLDER_EMAIL_DOMAIN` | Domain for generated addresses; defaults to the `FRONTEND_URL` host |
| `CHROME_EXTENSION_URL` | Store listing of your own browser extension; empty hides the extension button |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Plausible analytics; off when empty |
| `DATAFAST_WEBSITE_ID`, `DATAFAST_DOMAIN` | DataFast analytics; off without the id; domain defaults to the `FRONTEND_URL` host |
| `NEXT_PUBLIC_DUB_REFER_DOMAIN` | Dub partner referrals (only with Stripe). `DUB_TOKEN`, `DUB_API_ENDPOINT`, `DUB_SHORT_LINK_DOMAIN` configure Dub short links |
| `MCP_OFFICIAL_CONNECTORS=true` | Shows Postiz's one-click Claude / ChatGPT / Cursor / Grok directory connectors. They sign in through Postiz's cloud, so keep it off. Off still shows the MCP config, the CLI (`POSTIZ_API_URL` + API key) and the Grok Bot chat instructions for this instance. The CLI's `postiz auth:login` is not offered: it signs in at `cli-auth.postiz.com` |

## Endpoints

All `/admin/console/*` routes go through `AuthMiddleware` and then `PlatformAdminGuard`. They return **403** for non-super-admins and 401 without a session, and every body is validated with class-validator DTOs (`dtos/tadween/admin.console.dto.ts`).

| Method | Path | |
| --- | --- | --- |
| GET | `/admin/console/overview` | Counts: users (inactive), workspaces, channels (disabled, needing reconnect), scheduled, published and failed in the last 24 h, subscriptions per tier |
| GET | `/admin/console/settings` | Registration, features with their definitions, branding, env fallbacks (as booleans only) |
| PUT | `/admin/console/settings/registration` · `/features` · `/branding` | |
| GET/PUT | `/admin/console/providers` | Each provider's enabled state, position, `hiddenByEnv`, and credential status as env var **names** with set/unset. Values are never returned. |
| GET/POST | `/admin/console/plans` | List (plus Postiz's static pricing for reference) and create |
| POST | `/admin/console/plans/defaults` | Seed the four Tadween plans (only when there are none) |
| PUT/DELETE | `/admin/console/plans/:id` | Update and soft delete |
| GET | `/admin/console/users?search=&page=` | Users with workspaces, roles, subscription and channel count, selected without password or tokens |
| PUT | `/admin/console/users/:id/activation` | Activate or deactivate. Refuses self and other super admins. |
| PUT | `/admin/console/organizations/:id/tier` | Grant a tier the way Postiz's "add subscription" does. Refuses workspaces paying through Stripe (`cus_…`) and lifetime deals. |
| GET | `/instance/settings` (public) | Registration mode, features, branding, public plans (no provider ids) and merged pricing |

Changes to existing routes:

- `GET /integrations` filters and orders providers.
- `GET /integrations/social/:provider` refuses *new* connects of disabled providers. Reconnects still work.
- `GET /auth/can-register` also returns `mode`.

## Pages (`/admin`, guarded server-side in `admin/layout.tsx`, which redirects non-admins to `/launches`)

- **Overview**: stat tiles, subscriptions per tier, instance summary, and links to Post errors and Usage stats (the existing Postiz pages, now inside the console frame).
- **Channels**: every provider with an order (up/down, "LinkedIn first"), an on/off switch, status (Ready, Missing credentials, No setup needed, Hidden by env) and the env vars to set.
- **Features**: registration mode (open, invite only, closed) and grouped feature switches. Each switch says what turning it off hides.
- **Plans**: create from the defaults or from scratch, a table, an edit dialog, delete, and a pricing preview with USD/EGP and monthly/yearly toggles.
- **Users**: search, pagination, and a user dialog with activate/deactivate, change plan per workspace, and impersonate (reusing `POST /user/impersonate`).
- **Branding**: instance name and support email (used as the email sender name and reply-to once saved), default language and time zone.

The UI comes from the Tadween design system, ported to `components/tadween/ui` with styles in `tadween-ui.scss`, scoped to `.tdw-ui` and mapped onto the `--tdw-*` tokens. It includes Button, IconButton, LinkButton, Pill, Avatar, Spinner, Skeleton, Tooltip, Input, Textarea, Checkbox, Switch, SegmentedControl, Popover, Select, Dialog, ConfirmDialog, Table, Pagination, Banner, RadioGroup, UsageMeter, Section, Row, Tabs, EmptyState and StatTile. Icons are the design system's inline Lucide set. Toasts reuse Postiz's toaster.

## What the switches actually do in Phase A

| Feature | Effect today |
| --- | --- |
| registration | **Enforced on the backend** (`AuthService.canRegister`). Invite-only lets a signed invite through. The register and login pages show the mode. |
| providers | **Enforced on the backend**: hidden from Add channel, and new connects refused |
| agent, analytics, media, plugs, thirdParty, ugc | Hidden from the sidebar |
| autopost, sets, signatures, webhooks | Settings tabs hidden |
| publicApi | Settings → API & MCP hidden, and onboarding's agent step shows a notice instead of keys |
| shortLinks | Settings → short-link preference hidden |
| ai | Saved only, not applied yet (marked in the UI) |

Hiding is UI-only. The API routes behind these features still answer, so Phase B should add backend checks.

## Phase B (not in this PR)

- Backend enforcement of feature switches (guards per controller), and hiding AI buttons in the editor.
- Provider credentials from the UI. This needs encrypted storage: an encrypted column with a key from env or KMS, write-only from the UI, and runtime reads in each provider (which today read `process.env` at import time).
- Use provider price ids at checkout. Charge in EGP through a local provider (Paymob, Fawry or Stripe EGP), with currency picked per workspace.
- Enforce team-member counts (Postiz only supports on/off) and posts/month.
- Apply the default language and time zone to new accounts. Use the instance name in page titles and the UI.
- `proxy.ts` still redirects `/auth/register` from the env only, because it can't read the database. Read the setting there through a cached fetch.
- Audit log of admin changes (`PlatformSetting.updatedBy` is a start), and a provider drag-and-drop order.
- Redesign the billing pages with the design system's PricingTable and BillingScreen (they already read the plans).
