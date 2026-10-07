# Deployment patches (Tadween on Postiz v2.25.0)

Hot patches applied to the compiled build running on post.xerk.io. Each `X.js` replaces the built file; `X.orig.js` is the untouched v2.25.0 build kept for diffing; `*.prev.js` is an earlier iteration.

| File | What it changes | Ported |
| --- | --- | --- |
| `app.module.js` | Registers `AutopostActivity` so RSS auto-posts actually run (upstream PR #1922). | Already upstream: `d883bfa1` "feat: fix auto post" (Postiz, merged into `tadween` by the upstream sync) registers it in `apps/orchestrator/src/app.module.ts`. |
| `auth.service.js` | `INVITE_ONLY_REGISTRATION=true` blocks open sign-ups; a valid signed invite still lets people join. | `c8b9e227` / `38457215` (super-admin console: registration mode `open` / `invite` / `closed`, env fallback). `.env.example` entry added in the port-prod-patches PR. |
| `autopost.service.js` | RSS drafts keep the title and a short summary, and attach the article image (needed by Instagram), fetched through the SSRF-safe dispatcher. | Port-prod-patches PR (`fix/port-prod-patches`). |
| `login.client.js`, `login.ssr.js` | The login page says "Invite only — ask your workspace admin for an invite link" instead of linking to sign-up. | `38457215` (`components/auth/login.tsx` reads the registration mode from `/instance/settings`; kept by the redesigned login in PR #16). |

Once a build that includes all of the above is deployed, every hot patch here can be retired: deploy the normal image without copying these files over it.

Differences from the hot patches, on purpose:

- Invite links do not bypass `DISABLE_REGISTRATION=true` (mode `closed`). The hot patch let them through. Production runs in invite mode, so nothing changes there.
- Draft vs schedule: `tadween` (and Postiz) created every RSS post as a draft; the hot patch scheduled them all on the next free slot. The source now schedules them too, which is a behaviour change for every org with an active autopost.
- The hot patch dropped Instagram from an RSS post when no image was found and scheduled the rest. The source version runs the same validation as the editor for every channel: channels that pass are scheduled on the next free slot, and channels that fail (for example Instagram without an image) are saved as drafts to finish by hand instead of being dropped.
