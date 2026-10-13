# Onboarding and first load

What a new account sees between "Create account" and Today, built from the design system's **Onboarding**, **ScreenOnboarding** (RTL), **Loading** and **AuthCard** components. This page lists the reusable pieces, the rules they follow and how the flow is wired, so the design system and the app stay in step.

## The flow

```
Sign-up card (email, password, workspace name)        /auth
  │  Google / other providers: AuthLoading → "Name your workspace" card
  │  email activation on: "Check your inbox" → link → AuthLoading
  ▼
POST /auth/register → `onboarding` header → /launches?onboarding=true
  ▼
BootScreen (onboarding shape)                          while /user/self loads
  ▼
Onboarding, full screen, in place of the app shell
  1 You        name                                    POST /user/personal
  2 Language   English / العربية (+ more), 12/24-hour  i18next cookie, localStorage `isUS`
  3 Plan       only when the workspace has no plan     the one-page /billing paywall
  4 Channels   LinkedIn profile + page, other networks Postiz's AddProviderComponent
  5 Ready      summary → Go to Today
  ▼
/today with the "Get started" checklist
```

- **One focused step per screen**: a big headline (`title-1` at 34px, 30px in Arabic), one lead line, the step's fields, one primary action in the footer. **Back**, **Continue** and **Skip setup** are always reachable; the footer is sticky, so it stays on screen on phones.
- **Skip setup** and **Go to Today** end onboarding and open `/today`. If the workspace still needs a plan, the paywall takes over from there, as before.
- **Invited teammates** see "You joined this workspace" with the workspace's name on the first step (their role there isn't `SUPERADMIN`), and never a step that creates or names a workspace.
- **Workspace name** stays on the sign-up card: the server needs it to create the workspace (`CreateOrgUserDto.company`) and has no rename endpoint, so onboarding doesn't ask for it twice.
- **Time zone** is shown, not edited: the app shows every time in the device's zone, and there is no time-zone setting to save to.
- **AI agents** (MCP, API key, CLI) are set up in Settings → API & MCP, as the design system's Onboarding notes. They are not an onboarding step.

### Where it renders

`LayoutComponent` (`components/new-layout/layout.component.tsx`) decides, in this order:

1. `/user/self` not loaded yet → `BootScreen`.
2. An onboarding step is active → `TadweenOnboarding`, full screen, in place of the shell. The plan step is the exception: while the workspace needs a plan, the layout shows the paywall (`FirstBillingComponent`) instead and onboarding waits.
3. The workspace needs a plan → the paywall.
4. Otherwise the app.

`useOnboarding(userId)` (in `tadween.onboarding.tsx`) holds the step and decides once the signed-in user is known. It starts at **You** on `?onboarding=true` (sent after sign-up, activation and a channel's OAuth return), or at **Channels** when the URL also has `added=` (back from connecting a channel). It keeps `{ step, user }` in `sessionStorage` (`tdw_onboarding`), so a channel's OAuth round trip and the paywall come back to the right step in the same tab. Finishing or skipping stores `{ done: user }` and replaces the URL with `/today`, so browser Back doesn't start it over; another account signing up in the same tab still gets onboarding. A payment return (`check=`) never starts onboarding on its own, and the paywall redirect leaves `check=` URLs alone so `CheckPayment` can finish. Without storage (private mode) onboarding still works, it just doesn't resume after a redirect.

Back from a channel's OAuth, onboarding does what the calendar page does on that return (the `channel_added` event, the "Channel updated" toast, the popup hand-off), then drops `added` and `msg` from the URL.

## Reusable pieces

| Piece | File | Use it for |
| --- | --- | --- |
| Onboarding frame (`.pz-ob`, `.pz-ob-head`, `.pz-ob-progress`, `.pz-ob-stage`, `.pz-ob-step`, `.pz-ob-foot`) | `app/tadween/billing.scss` | Any multi-step, full-screen flow. Set `--steps` on the progress list and `--travel` (1 forward, -1 back) on the step; `key` the step so it re-enters. |
| `StepHead` | `tadween.onboarding.tsx` | The headline + lead of a step (`center` for the last step). |
| `.tdw-ob-workspace` | `app/tadween/onboarding.scss` | A "you are here" card: initial tile, caption, name, optional note. |
| `.tdw-ob-note` | `app/tadween/onboarding.scss` | A quiet, muted information row with an icon. |
| `.tdw-ob-summary` | `app/tadween/onboarding.scss` | A short checklist of what's done (check in success, clock for later). |
| `BootScreen` | `components/tadween/shell/boot.screen.tsx` | The app's first load: `variant="onboarding"` or `"app"`. |
| `AuthLoading` | `components/tadween/auth/auth.parts.tsx` | A wait inside the auth card (social sign-in coming back, activation link). `fields` sets how many field skeletons hold the place of the form that follows. |
| `FirstRun` ("Get started") | `components/tadween/today/today.component.tsx` | Today's first-run checklist: connect a channel, write the first post (with AI when the AI feature is on), schedule it. |

## Loading rules (design system: Loading, motion.md)

- **Never a spinner in a box.** A wait whose result has a known shape shows skeletons in that shape: the onboarding frame, the app shell (sidebar, top bar, cards; on phones the top bar and cards only), or the auth card's fields and button.
- **Calm progress**: one 2–3px line in Nile that sweeps along the top edge (app) or under the title (auth card). It is the only moving part. The sweep reverses in RTL.
- **No flash**: the app's `<body>` gets the saved theme (`mode` cookie) on the server, so a light-theme user no longer sees a black frame before the shell mounts. The boot screen fades in after 150ms, so very short waits show nothing.
- **Reduced motion**: steps cross-fade instead of sliding, the progress line stops (a static, half-opacity bar), and skeletons stop shimmering.

## Motion

- Steps slide in from the direction of travel (32px, `--ease-spring`, 420ms) and mirror in RTL. Progress bars fill on the spring curve; the current step's bar is half full.
- The brand mark on the first step and the check on the last pop in with `--ease-bounce`. Summary rows rise in one after another (80ms apart).

## Language and direction

- Every string is in `en` and `ar` `translation.json` (`tdw_ob_*`, `tdw_auth_loading_*`, `today_first_*`).
- Changing the language on step 2 applies at once: the cookie, i18next and `<html dir lang>` change together, and the whole flow re-renders in Arabic, right to left.
- Arabic uses Tajawal through the shared font stack; headlines drop negative tracking and get taller line heights (`.is-ar`).

## Keyboard

- The name field is focused on arrival; Enter continues.
- Language is a radio group (arrow keys), the time format a segmented control, other languages a listbox. Every action is a real button with a visible focus ring.

## Not done yet (design-system follow-ups)

- A time-zone setting: it needs a stored per-user zone and the calendar to read it (Postiz has a draft upstream).
- Renaming a workspace after sign-up (no endpoint today).
- The design system's "Your rhythm" (posting days, posts per week) and "Smart layer" steps: the server has nothing to store them in yet.
