# Demo workspace for marketing screenshots

The product screenshots on the marketing site (`apps/landing/public/product/*.webp`) are real
captures of the app, taken in a demo workspace filled with **fictional** brands and posts. No
customer or owner data appears in them.

- **Where:** the local copy of the database, `tadween-live` (Postgres on `127.0.0.1:55440`).
- **Which workspace:** only the organization **"Tadween Test"**
  (`16a2a304-7405-44c0-a901-f1151b0b7969`), signed in as `tester@tadween.local`. No row in
  any other organization was read for the shots or changed.
- **How to find the rows:** every inserted row has an id that starts with `demo-`, so it is easy
  to find and remove.
- **Kept on purpose:** the owner can browse the demo workspace in the app. How to remove it is
  further down.

## What is in it

| Kind | Rows | Notes |
| --- | --- | --- |
| Channels (`Integration`) | 7: `demo-int-li-nile` (LinkedIn, Nile Studio), `demo-int-lip-coffee` (LinkedIn page, Cairo Coffee Co.), `demo-int-lip-maadi` (LinkedIn page, Maadi Lane Homes), `demo-int-x-rakeeza` (X, Rakeeza), `demo-int-ig-qolla` (Instagram, Qolla Ceramics), `demo-int-fb-sett` (Facebook, مطبخ ستّ الحُسن), `demo-int-th-felucca` (Threads, Felucca Hours) | Token and refresh token are the literal string `demo`, so nothing can publish with them. No orchestrator runs against this database. |
| Customers | `demo-cust-coffee`, `demo-cust-maadi` | The two LinkedIn pages sit under these customers. |
| Posts | `demo-post-01` … `demo-post-51` (50 rows) | 1 to 30 October 2026, in English and Egyptian Arabic. States: published (with a fake `releaseId` so the hover card offers "Post statistics"), scheduled, failed (with a made-up reason) and draft. Emoji were stripped because the screenshot browser has no emoji font. |
| Tags | `demo-tag-launch`, `-offers`, `-hiring`, `-community` | Linked to posts in `TagsPosts`. |
| Media folders | `demo-fold-brand`, `-campaigns`, `-october` (inside Campaigns), `-homes` (inside Campaigns), `-food` | From the media-library PR (#28). |
| Media | `demo-med-*` (12 files) | Stored under the app's upload directory in `demo-tadween/`. |
| Notifications | `demo-notif-1` … `-6` | |
| Signatures | `demo-sig-nile` (added automatically), `demo-sig-ar` | |
| Sets | `demo-set-launch`, `demo-set-menu` | |
| Auto post | `demo-auto-blog` | Feed address on a reserved `.example` domain, which never resolves. |
| Webhooks | `demo-hook-crm`, `demo-hook-sheet` (+ `IntegrationsWebhooks` links) | `.example` addresses. |
| Comments | `demo-comment-1`, `-2` | Guest comments on the shareable page of `demo-post-14a`. |

### Photos

- **Six photos from the sign-in showcase** (Unsplash licence, credits in
  `apps/landing/public/showcase/README.md`): `desk`, `living-room`, `ceramics`, `koshary`,
  `latte`, `nile-felucca`.
- **Six generated images** (Z-Image Turbo on Hugging Face; no people, no logos): `bakery`,
  `flatlay`, `tower`, `beans`, `stage`, `cushions`.
- **Seven channel avatars**, drawn as monograms. The brands are made up.

### Temporary channels

To take one composer shot per network page, `demo/channels-extra.sql` adds 14 more channels
(`demo-xint-*`: TikTok, YouTube, Pinterest, Bluesky, Mastodon, Reddit, Telegram, Discord, Slack,
Google Business Profile, Medium, Dev.to, Hashnode, WordPress). `demo/channels-extra-cleanup.sql`
removes them right after the capture, so they are **not** left in the workspace.

### Mocked during capture only

Three surfaces are filled in by the capture script, inside the screenshot browser only. Nothing
is written to the database for them:
- **The agent chat:** there is no AI key locally, so the agent runtime's answers are faked with a
  fictional conversation.
- **One LinkedIn page's analytics:** the network's API can't be reached.
- **The upload dock:** the upload request is held so the progress shows, and never reaches the
  server.

## Scripts

The scripts live in the session scratchpad,
`/tmp/claude-1000/-home-xerk-code-xerk-postize/e64a9089-1afb-488b-9f39-f3186d04db31/scratchpad/landing-v3/`.

**Under `demo/`:** `prep-media.cjs`, then `seed.sql`, `seed-sets.sql`, `seed-more.sql`,
`seed-webhooks.sql` and `seed-fixups.sql`, in that order. Also `channels-extra.sql` /
`channels-extra-cleanup.sql`, and `cleanup.sql`.

**Under `app/`:**
- `login.mjs` saves the session.
- `shoot.mjs [shot]` captures every surface in en and ar × light and dark at 2x.
  - Run `shoot.mjs channels` for the network pages.
  - It refuses to save a shot if the owner's workspace name shows on screen.
- `optimise.cjs` writes the WebP files into `apps/landing/public/product/`.

## Remove the demo data

Run this against `tadween-live`. It only touches `demo-` rows of the Tadween Test organization:

```sql
\set org '16a2a304-7405-44c0-a901-f1151b0b7969'
BEGIN;
DELETE FROM "TagsPosts" WHERE "postId" LIKE 'demo-%' AND "postId" IN (SELECT id FROM "Post" WHERE "organizationId" = :'org');
DELETE FROM "Comments" WHERE id LIKE 'demo-%' AND "organizationId" = :'org';
DELETE FROM "Post" WHERE "integrationId" LIKE 'demo-xint-%' AND "organizationId" = :'org';
DELETE FROM "Post" WHERE id LIKE 'demo-%' AND "organizationId" = :'org';
DELETE FROM "Tags" WHERE id LIKE 'demo-%' AND "orgId" = :'org';
DELETE FROM "Media" WHERE id LIKE 'demo-%' AND "organizationId" = :'org';
DELETE FROM "MediaFolder" WHERE id LIKE 'demo-%' AND "organizationId" = :'org' AND "parentId" IS NOT NULL;
DELETE FROM "MediaFolder" WHERE id LIKE 'demo-%' AND "organizationId" = :'org';
DELETE FROM "Notifications" WHERE id LIKE 'demo-%' AND "organizationId" = :'org';
DELETE FROM "Signatures" WHERE id LIKE 'demo-%' AND "organizationId" = :'org';
DELETE FROM "Sets" WHERE id LIKE 'demo-%' AND "organizationId" = :'org';
DELETE FROM "AutoPost" WHERE id LIKE 'demo-%' AND "organizationId" = :'org';
DELETE FROM "IntegrationsWebhooks" WHERE "webhookId" LIKE 'demo-%';
DELETE FROM "Webhooks" WHERE id LIKE 'demo-%' AND "organizationId" = :'org';
DELETE FROM "Integration" WHERE id LIKE 'demo-%' AND "organizationId" = :'org';
DELETE FROM "Customer" WHERE id LIKE 'demo-%' AND "orgId" = :'org';
COMMIT;
```

Then delete the `demo-tadween/` folder in the app's upload directory.
