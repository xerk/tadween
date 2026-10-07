# Deployment patches (Tadween on Postiz v2.25.0)

Hot patches applied to the compiled build running on post.xerk.io. Each `X.js` replaces the built file; `X.orig.js` is the untouched v2.25.0 build kept for diffing; `*.prev.js` is an earlier iteration.

| File | What it changes |
| --- | --- |
| `app.module.js` | Registers `AutopostActivity` so RSS auto-posts actually run (upstream PR #1922). |
| `auth.service.js` | `INVITE_ONLY_REGISTRATION=true` blocks open sign-ups; a valid signed invite still lets people join. |
| `autopost.service.js` | RSS drafts keep the title and a short summary, and attach the article image (needed by Instagram), fetched through the SSRF-safe dispatcher. |
| `login.client.js`, `login.ssr.js` | The login page says "Invite only — ask your workspace admin for an invite link" instead of linking to sign-up. |

These should be ported into the TypeScript sources (`apps/backend`, `apps/orchestrator`, `apps/frontend`) on the `tadween` branch so they survive rebuilds, and the autopost fix can be dropped once upstream merges #1922.
