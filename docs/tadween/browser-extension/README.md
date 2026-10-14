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
   Chrome only lets pages that match the manifest's `externally_connectable.matches` (the store build:
   `https://studio.tadween.app/*` only) send messages, and the service worker checks the sender's origin against
   the same patterns.
5. The app puts the cookies (base64 JSON) in this tab's `sessionStorage` under `extension-cookies:<state>` and opens
   `/integrations/social/skool?state=…`. The cookies are **never in the URL**, so they don't reach browser history
   or web-server access logs. `ContinueIntegration` (`continue.integration.tsx`) reads that entry only when the URL
   has no `code`, removes it at once, and sends it as `code` in the `POST /integrations/social-connect/skool` body.
   OAuth providers always come back with `code` in the URL, so their flow is unchanged.
6. The backend (`SkoolProvider.authenticate`) calls `GET https://api2.skool.com/self` with the cookies, and stores
   them AES-256 encrypted with a key derived from `JWT_SECRET` (`AuthService.fixedEncryption`, in
   `Integration.token` and `Integration.customInstanceDetails`).
7. On success the backend returns a signed `extensionToken` (channel id, workspace id, Skool user id, provider;
   no cookies). The app passes it to the extension (`STORE_REFRESH_TOKEN`), which keeps it in
   `chrome.storage.local` and sets a daily alarm. Deleting the channel sends `REMOVE_REFRESH_TOKEN`.
8. **Daily refresh:** the alarm re-reads the two cookies and POSTs `{ jwt, cookies }` to
   `<API>/integrations/extension-refresh`. The backend verifies the JWT and that the channel still exists with the
   same Skool user, checks the cookies against Skool, and saves them encrypted exactly like the first connect.
   The request comes from `chrome-extension://<EXTENSION_ID>`, so `apps/backend/src/main.ts` adds that origin to
   CORS **for this one route only**, and only when the backend's `EXTENSION_ID` is set. No other route accepts it.
   (A host permission for the API would also work, but it's a new permission users are warned about and the store
   reviews, and every self-hoster would need their API host in the manifest.)

The extension has no popup, no content scripts and no remote code. Its permissions are `cookies`, `storage`
and `alarms`, with the host `*://*.skool.com/*`, the same as Postiz's published build.

## Build

```bash
# from the repo root
EXTENSION_ALLOWED_ORIGINS="https://studio.tadween.app/*" pnpm run build:extension
# -> apps/extension/dist/ (unpacked) and apps/extension/extension.zip
cp apps/extension/extension.zip docs/tadween/browser-extension/tadween-extension-1.0.0.zip
```

- `EXTENSION_ALLOWED_ORIGINS`: comma-separated match patterns of the app pages that may talk to the extension
  (`externally_connectable.matches`), read from the shell. If it isn't set, the build uses `FRONTEND_URL`'s origin,
  and if that isn't set either, localhost. A self-hoster builds their own with their app's URL.
- Only `studio.tadween.app` is allowed: the landing site (`tadween.app`) and other subdomains can't ask for
  cookies. There is **no localhost** in the store build either.
- Version: `apps/extension/package.json` `version` (also in `manifest.json`). Raise it for every new upload.
- `pnpm --filter ./apps/extension run dev` builds the dev variant (`manifest.dev.json`: name "Tadween (dev)",
  localhost only, a fixed `key`, so the unpacked ID is always `kgddbfffcmalgflbimlcndpdkjodgfpa`). Put that ID
  in `EXTENSION_ID` for local development.
- Don't run the upstream workflows `publish-extension.yml` / `build-extension.yaml`: they build for
  platform.postiz.com and need Postiz's secrets.

## What was tested (2026-10-14)

The exact `tadween-extension-1.0.0.zip`, unzipped and loaded in Playwright's Chromium (`--load-extension`), against
a local production build of this branch (backend + `next start`) on a copy of the database. A local HTTPS proxy
served the app as `https://studio.tadween.app` (Chromium `--host-resolver-rules`, self-signed certificate), so the
store manifest's origin was used unchanged. Fake `client_id` / `auth_token` cookies were set on `.skool.com`.
**Skool's API was stubbed** in the test backend (a preload script, not in the repo) to accept the fake cookies and
return a test user, so the connect and refresh paths could finish; the real Skool call is the only part not run.

| Step | Result |
|---|---|
| Extension loads: version 1.0.0, permissions `cookies, alarms, storage`, host `*://*.skool.com/*`, `externally_connectable` = `https://studio.tadween.app/*` | OK |
| `PING` from `https://studio.tadween.app` | `{"status":"ok","version":"1.0.0"}` |
| Add channel → Skool → notice → continue | App went to `/integrations/social/skool?state=…` (no `code=` in any URL), `POST /api/integrations/social-connect/skool` with `state, code, timezone` → 201, landed on `/launches?added=skool`, "Channel Updated". The `extension-cookies:*` sessionStorage entry was gone afterwards. |
| Stored credentials after connect | `token` and `customInstanceDetails`: hex ciphertext; not JSON, not base64 JSON, not a JWT; decrypts to the cookies |
| Extension after connect | One refresh entry (channel id, provider `skool`, API URL, signed token), daily alarm set |
| Daily refresh: new `auth_token` set in the browser, alarm fired | `OPTIONS` then `POST /api/integrations/extension-refresh` from `chrome-extension://<id>`; the backend validated the JWT, called Skool with the new cookies and saved them: both columns re-encrypted (hex) and decrypt to the **new** `auth_token` |
| CORS (curl preflight) | Extension origin allowed on `/integrations/extension-refresh` only; not on `/integrations/list`; another extension ID or a website origin gets no `Access-Control-Allow-Origin` |
| Refresh with an invalid JWT | 401 `Invalid token` |
| Same app on `https://tadween.app`, `https://other.example.test`, `http://localhost:4417` | `chrome.runtime.sendMessage` is undefined there: those pages can't reach the extension |

Before this branch, the refresh POST never left the browser: Chrome stopped it at the CORS preflight, which is also
how Postiz's published extension behaves. Refreshed cookies used to be stored as a signed JWT (readable with
base64); `SkoolProvider.getCookies` still reads that old format, so rows saved that way keep working.

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

The frontend reads them at request time (`apps/frontend/src/app/(app)/layout.tsx`) and the backend reads
`EXTENSION_ID` at start-up for the refresh route's CORS, so recreating the app container is enough; no image
rebuild. The app image must include this branch (sessionStorage hand-over, refresh CORS, encrypted refresh); an
older image still connects Skool, but the daily refresh won't reach the API.

Also turn **Skool** on in Admin → Providers: it isn't a focus network, so it is off until an admin enables it. Then
connect a real Skool account once through the unlisted install link to confirm.
