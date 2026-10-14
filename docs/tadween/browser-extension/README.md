# Tadween browser extension (Skool connector)

The extension in `apps/extension` lets Tadween connect channels that have no public API and sign in
with browser cookies instead. Today that is only **Skool**. It is Postiz's extension
(gitroomhq/postiz-app `apps/extension`, Manifest V3) with Tadween's name, icons and allowed origins.

| File | What |
|---|---|
| `tadween-extension-1.0.0.zip` | The package to upload to the Chrome Web Store (built as below) |
| `store-listing.md` | Everything the store asks for: listing text (English and Arabic), category, single purpose, permission justifications, data-usage answers, privacy-policy paragraph |
| `store/` | Store images: 128 px icon, 440×280 promo tile, three 1280×800 screenshots |

## How it works

1. The user is signed in to skool.com in Chrome.
2. In Tadween: Add channel → Skool → the notice → "I understand, continue".
3. The app page sends `PING`, then `GET_COOKIES` to the extension (`chrome.runtime.sendMessage(EXTENSION_ID, …)`,
   `apps/frontend/src/components/launches/add.provider.component.tsx`).
4. The extension reads two cookies for `https://www.skool.com`, `client_id` and `auth_token`, and returns them.
   Chrome only lets pages that match the manifest's `externally_connectable.matches` send messages, and the
   service worker checks the sender's origin against the same patterns.
5. The app opens `/integrations/social/skool?state=…&code=<base64 JSON of the two cookies>`, which POSTs to
   `/integrations/social-connect/skool`. The backend (`SkoolProvider.authenticate`) calls
   `GET https://api2.skool.com/self` with the cookies, and stores them AES-256 encrypted with a key derived from
   `JWT_SECRET` (`AuthService.fixedEncryption`, in `Integration.token` and `Integration.customInstanceDetails`).
6. On success the backend returns a signed `extensionToken` (channel id, workspace id, Skool user id; no
   cookies). The app passes it to the extension (`STORE_REFRESH_TOKEN`), which keeps it in `chrome.storage.local`
   and sets a daily alarm that re-reads the cookies and POSTs them to `<API>/integrations/extension-refresh`.
   Deleting the channel sends `REMOVE_REFRESH_TOKEN`.

The extension has no popup, no content scripts and no remote code. Its permissions are `cookies`, `storage`
and `alarms`, with the host `*://*.skool.com/*`, the same as Postiz's published build.

## Build

```bash
# from the repo root
EXTENSION_ALLOWED_ORIGINS="https://studio.tadween.app/*,https://*.tadween.app/*" pnpm run build:extension
# -> apps/extension/dist/ (unpacked) and apps/extension/extension.zip
cp apps/extension/extension.zip docs/tadween/browser-extension/tadween-extension-1.0.0.zip
```

- `EXTENSION_ALLOWED_ORIGINS`: comma-separated match patterns of the app pages that may talk to the extension
  (`externally_connectable.matches`). If it isn't set, the build uses `FRONTEND_URL`'s origin, and if that isn't
  set either, localhost. A self-hoster builds their own with their app's URL.
- The store build has **no localhost** origin, so a page on a developer's localhost can't ask it for Skool cookies.
- Version: `apps/extension/package.json` `version` (also in `manifest.json`). Raise it for every new upload.
- `pnpm --filter ./apps/extension run dev` builds the dev variant (`manifest.dev.json`: name "Tadween (dev)",
  localhost only, a fixed `key`, so the unpacked ID is always `kgddbfffcmalgflbimlcndpdkjodgfpa`). Put that ID
  in `EXTENSION_ID` for local development.
- Don't run the upstream workflows `publish-extension.yml` / `build-extension.yaml`: they build for
  platform.postiz.com and need Postiz's secrets.

## What was tested (2026-10-14)

The exact `tadween-extension-1.0.0.zip`, unzipped and loaded in Playwright's Chromium
(`--load-extension`), against a local production build of the app (backend + `next start`) on a copy of the
database. A local HTTPS proxy served the app as `https://studio.tadween.app` (Chromium `--host-resolver-rules`,
self-signed certificate), so the store manifest's origins were exercised unchanged. Fake `client_id` and
`auth_token` cookies were set on `.skool.com`.

| Step | Result |
|---|---|
| Extension loads, manifest version 1.0.0, permissions `cookies, alarms, storage`, host `*://*.skool.com/*` | OK |
| App page `https://studio.tadween.app` → `PING` | `{"status":"ok","version":"1.0.0"}` |
| Add channel → Skool → notice → "I understand, continue" | `GET /api/integrations/social/skool` 200, then the extension returned both cookies and the app navigated to `/integrations/social/skool?state=…&code=…` (code = the two fake cookies) |
| Continue page → `POST /api/integrations/social-connect/skool` (`state, code, timezone`) | Backend called `GET https://api2.skool.com/self` with the cookies → Skool answered **401** → backend replied 409 `Invalid cookie data` → "Could not add provider. Invalid cookie data". **This is where the test stops**: creating the integration needs a real Skool session. |
| Same app served from `http://localhost:4417` and `https://other.example.test` (not in the manifest) | `chrome.runtime.sendMessage` is undefined on those pages: they can't reach the extension at all |
| `STORE_REFRESH_TOKEN` / `REMOVE_REFRESH_TOKEN` from the app page | `{"success":true}` both |
| Daily refresh, forced by firing the alarm | The service worker's request reached the API only as a CORS preflight (`OPTIONS /api/integrations/extension-refresh`, origin `chrome-extension://…`); the backend's CORS list doesn't include the extension, so the `POST` is never sent. See "Known limitation". |

### Known limitation: the daily refresh doesn't reach the API

The keep-alive POST is a cross-origin request from the extension. Without a host permission for the API (or the
extension's origin in the backend's CORS list) Chrome blocks it after the preflight. Postiz's published build has
the same permissions and the same behaviour, so nothing regresses. Connecting and reconnecting Skool from the app
work without it; a user whose Skool session expires reconnects the channel. Fixing it means either adding the API
as a host permission (`https://studio.tadween.app/*`, a new permission the store reviews) or allowing the
extension's origin in the backend's CORS settings once the store ID is known.

## Upload to the Chrome Web Store (owner)

1. Open https://chrome.google.com/webstore/devconsole with the Google account that should own the listing
   (a company account is better than a personal one; you can add other people later with a group publisher).
2. Pay the one-time US$5 registration fee and accept the developer agreement.
3. **Account** tab: publisher name `Xerk LLC`, contact email (verify it). Declare as a **trader** and enter Xerk
   LLC's address and phone (required to publish in the EU). Optional: verify `tadween.app` in Google Search
   Console with the same account so the listing can show the verified official URL.
4. **Items → New item** → upload `tadween-extension-1.0.0.zip`.
5. **Store listing** tab: copy from `store-listing.md` (description, category, language). Upload
   `store/store-icon-128.png`, the three `store/screenshot-*.png` and `store/promo-tile-440x280.png`.
   Official URL `https://tadween.app`, support URL `https://tadween.app/contact` (or `mailto:support@tadween.app`).
6. **Privacy** tab: single purpose, one justification per permission, "No, I am not using remote code", the
   data-usage checkboxes and certifications, privacy policy URL `https://tadween.app/privacy` (all in
   `store-listing.md`). Add the privacy paragraph to the site's privacy page **before** submitting.
7. **Distribution**: free, all regions, visibility **Unlisted** first (only people with the link can install it).
   Switch to Public after a real Skool account has been connected through it.
8. **Submit for review**. Extensions with the `cookies` permission usually get a manual review (days, sometimes
   longer). You get an email when it is approved or rejected.

## After approval: server settings

The store assigns a new ID; it is **not** the local unpacked or dev ID.

| Variable (app env, `/opt/tadween/app.env`) | Value |
|---|---|
| `EXTENSION_ID` | the item ID from the developer console (32 letters a–p) |
| `CHROME_EXTENSION_URL` | the store link, `https://chromewebstore.google.com/detail/<slug>/<EXTENSION_ID>` |

Both are read at request time (`apps/frontend/src/app/(app)/layout.tsx`), so recreating the app container is
enough; no image rebuild. Also turn **Skool** on in Admin → Providers: it isn't a focus network, so it is off until
an admin enables it. Then connect a real Skool account once to confirm (unlisted install link).
