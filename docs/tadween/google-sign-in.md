# Google sign-in

"Continue with Google" on `/auth/login` and `/auth` (sign-up) works on self-hosted Tadween and on
the cloud. The button shows only when the backend has a Google OAuth client. The backend reports
which sign-in providers are configured as booleans in the public `GET /instance/settings`
(`login: { google: true, github: false, ... }`). Client ids and secrets are never returned.

## Setup

1. In Google Cloud Console, open **APIs & Services → OAuth consent screen**. Set the app name,
   support email and authorised domain (your Tadween domain). The scopes are `userinfo.email` and
   `userinfo.profile`, which do not need verification.
2. Open **APIs & Services → Credentials → Create credentials → OAuth client ID**, application type
   **Web application**.
3. **Authorized JavaScript origins**: your `FRONTEND_URL`, for example `https://post.example.com`.
4. **Authorized redirect URIs**: exactly
   `${FRONTEND_URL}/integrations/social/youtube`, for example
   `https://post.example.com/integrations/social/youtube`.
   Postiz uses the same callback path for sign-in and for connecting a YouTube channel. The
   frontend sees `state=login-…` and the Google scope in the query and sends the visitor to
   `/auth?provider=GOOGLE…`, which finishes the sign-in.
5. Put the client in the backend env and restart the backend:

   ```env
   GOOGLE_LOGIN_CLIENT_ID="123-abc.apps.googleusercontent.com"
   GOOGLE_LOGIN_CLIENT_SECRET="GOCSPX-…"
   ```

   Without these two, the YouTube client (`YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`) is used,
   as in Postiz. If you reuse the YouTube client, it already has the redirect URI above.

## How it behaves

- A Google account signs in by its Google user id (`User.providerName = GOOGLE`, `providerId`).
- First sign-in is a registration: the visitor is asked for a workspace name. In **invite-only**
  and **closed** registration modes (`/admin`), a new Google user is refused like any other sign-up,
  except with a valid invite link (invite-only).
- **Same email as an existing email/password account:** users are unique on
  `(email, providerName)`, so Google creates a **second, separate user and workspace** with that
  email. Nothing is linked or merged. This is Postiz behaviour and is unchanged.
- `POSTIZ_GENERIC_OAUTH` (generic OIDC button) is independent. `"false"`, `"0"`, `"no"`, `"off"`
  and an empty value now all mean off; before, any non-empty value, including `"false"`, turned it
  on and hid Google.
