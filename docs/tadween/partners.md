# Partners program (phase 1)

Two programs on one system, built into Tadween with no paid tools:

- **Invite & earn · ادعُ واكسب**: every workspace has a referral link and code. The friend gets AI credits on their first payment, and the person who invited them climbs a rewards ladder.
- **Founding Creators (affiliates)**: invite-only. The super admin turns a creator's workspace into an affiliate. Affiliates earn a share of every paid invoice of the customers they bring, for 12 months.

Rewards are paid only out of money customers already paid. Commission is held for 30 days. Default rewards are AI credits and Tadween balance (the Stripe customer balance). Cash goes out by hand once a month (see the runbook below). There is no Stripe Connect.

Everything sits behind the **`affiliate`** instance feature switch (Admin → Features → Growth → "Invite & earn and partners"), which is off by default.
- **Off:** nothing shows, and sign-ups are not attributed.
- **On while payments are off** (`/user/self` → `paymentsEnabled` false): "Invite & earn" still shows in the sidebar, the top bar and Settings (in the Workspace group). The page promises only what works without a payment: friends who join with the link skip the waitlist; the partner row (rate and months from `PARTNERS`) links to "Become a partner" with "Starts when paid plans launch"; "Details" (the ladder, rewards and how it works) is hidden. With payments on, the ladder inside "Details" shows as "Coming soon" on a plan with 0 AI credits.
- **Switched off after launch:** the program is hidden and no new referrals are attributed. Referrals that already exist keep earning until a super admin rejects them in Admin → Referrals.

## The rules (owner-approved 2026-10-12)

| | Rule | Where in code |
|---|---|---|
| Attribution | `?ref=CODE` link or a typed code. One inviter per workspace, set at sign-up (the newest link before sign-up wins) and never changed. "Who invited you?" accepts a code during the first 7 days. | `PartnersService.attribute`, `claim` |
| Friend bonus | 300 AI credits on the first paid invoice. When an affiliate brought the friend: 500 credits, and a 14-day trial instead of 7. | `invoicePaid` (`fr_<referralId>`), `trialDaysFor` |
| When a friend counts | On their 2nd paid invoice, if it falls 20 or more days after the 1st (a day-one upgrade invoice doesn't count). On a yearly plan: 30 days after the 1st payment. Evaluated when data is read or an event arrives; there is no cron or Temporal job. | `invoicePaid`, `settle` |
| Referrer ladder | 1 friend → 500 credits · 3 → 1 free month (account balance = the current plan's monthly price) · 5 → +1,000 credits and the Ambassador badge · 10 → next plan up free for 12 months · 25 → founder price for life. Each step is given once. At most 10 credit rewards per month per referrer. | `REFERRER_LADDER`, `climbLadder` |
| Affiliate commission | 30% of what was paid (USD, excluding tax), for invoices within 12 months of the first payment. The rate is set by the number of currently paying customers: 30%, 35% from 10, 40% from 30. An admin can set a fixed rate instead. Held for 30 days (PENDING), then AVAILABLE. | `addCommission`, `PARTNERS.tierRates` |
| Payout | Default is Tadween balance at 1.5×, applied automatically. Cash, monthly, from $50, needs: the W-8BEN acknowledgement, a country, a method and details, plus a Mawthooq licence number for Saudi Arabia. | `payCommissionAsBalance`, `updatePayoutSettings`, `markPaid` |
| Clawback | Refund: held commission is voided, available commission is clawed back, and paid commission becomes a negative row taken from the next payout. Partial refunds cut commission proportionally, and refunds only ever lower it. Chargebacks are treated as a full refund. | `paymentReversed`, `reduceCommission` |
| Anti-fraud | Refused: your own code in your own workspace, the same login, a member of the referrer's workspace (checked at sign-up and again at the first payment), the same Stripe customer, or the same card fingerprint. Flagged for review (never blocked): the same sign-up IP or browser as a member of the referrer's workspace. | `attribute`, `selfReferralOnPayment` |

Founder spots changed in this PR as well. A spot is now taken on a workspace's **first paid invoice** at a founder price, no longer when a trial starts. A trial started while spots were open keeps the founder price it was sold at when it converts, so the final count can go a little past the cap.

## Data model (additive; `schema.prisma`, section "Tadween partners program")

| Model | Purpose |
|---|---|
| `Partner` | One per workspace (`organizationId` unique). Holds `kind` (REFERRER/AFFILIATE), `status`, `code` (8 characters, no 0/O/1/I/L), `tier`, `commissionRate` (null means the tier rate), `commissionMonths`, `ambassador`, `country`, `mawthooqNumber`, `payoutPreference`, `payoutMethod`, and `payoutDetails`. `payoutDetails` is encrypted with `AuthService.fixedEncryption`. Only the super admin's CSV export decrypts it; the partner sees it masked. |
| `Referral` | The referred workspace (`organizationId` unique), with `source` (LINK/CODE) and `status` (SIGNED_UP, PAID, QUALIFIED, REJECTED, REFUNDED). Also `firstPaidAt`, `qualifiedAt`, `rejectionReason` and `fraudFlags`. |
| `ReferralInvoice` | Every paid invoice of a referred workspace. The id is the provider invoice id; the row also holds the payment id (to match refunds), the USD amount and `refundedAt`. Counting paid invoices from these rows makes a replayed webhook harmless. |
| `ReferralReward` | The ledger. Ids are deterministic per event: `com_<invoiceId>`, `ms_<partnerId>_<step>`, `fr_<referralId>`, `cb_<rewardId>`. Types are COMMISSION, CREDITS, ACCOUNT_CREDIT, UPGRADE and BONUS. Statuses are PENDING, AVAILABLE, APPLYING, PAID, CLAWED_BACK and VOID. |
| `PartnerPayout` | A cash payout the owner sent, or a balance grant: `method`, `reference`, `status` (PENDING/PAID/CANCELLED), `paidAt`, `createdById`. |

There are no foreign keys to upstream Postiz models (only ids), so the Postiz models are untouched and `prisma db push` stays additive.

Credits go through the existing AI credits ledger: an `AiCreditPurchase` row with the reward id as its id, amount 0 and provider `referral`. Purchased credits never expire.

## How rewards are applied

- **Webhooks** (`StripeService.processWebhook`): `invoice.payment_succeeded` with `amount_paid > 0` takes the founder spot and records the referral invoice, then rewards the friend, the commission and the ladder. `invoice.created` applies the balance a workspace earned before its invoice is finalised. `charge.refunded` and `charge.dispute.created` claw back.
  - Every partner step catches and logs; none of it throws back to the webhook.
  - A refund or dispute that arrives before the paid-invoice event is picked up from the charge when the invoice event is handled.
  - **Production:** the Stripe webhook endpoint must be subscribed to `invoice.created`, `charge.refunded` and `charge.dispute.created`.
- **Balance** goes through the generic `PaymentProviderAbstract.grantAccountCredit(orgId, cents, reason, idempotencyKey)`. The default does nothing. The Stripe implementation:
  - adds a negative customer balance transaction, sending the Stripe idempotency key and storing the key in metadata;
  - skips if a transaction with the same metadata key already exists, so it stays idempotent past Stripe's 24-hour key window;
  - refuses customers billed in a currency other than USD.
- **Claim pattern:** a reward moves AVAILABLE → APPLYING atomically before anything touches Stripe.
  - Unknown outcome (a timeout or error): the row stays APPLYING and is retried with the same key on the next settle, after 10 minutes.
  - Definite refusal (no customer yet, another currency): the row goes back to AVAILABLE.
  - Balance payouts: there is one pending payout per partner, and its id is the key.
- **Applied by hand:** ladder steps 10 (next plan free for 12 months) and 25 (founder price for life) are recorded as AVAILABLE `UPGRADE` rewards. The super admin applies them in Stripe (a 100% coupon on the next plan for 12 months, or moving the subscription to the founder price), then clicks "Mark applied" in Admin → Growth → Partners.
- **Test clocks:** the settle clock is the later of now and the event time. Live events are never ahead of now. Test-clock events can be, so holds release in test mode.

## Monthly payout runbook (owner)

1. Around the 15th, open **Admin → Growth → Payouts**. "Due this month" lists affiliates who chose cash, with at least $50 available and their details complete ("Ready").
2. Click **Export CSV**. It has code, workspace, email, country, Mawthooq number, method, payout details, amount (USD) and ready. Keep the file private; it holds payout details.
3. Pay each line from the company account in Wise (or Payoneer/bank), in the amount shown.
4. For each line, click **Mark paid** and paste the transfer id. The amount must match what is available at that moment; if more commission became available since the export, you get a 409 and the new amount.
5. Balance payouts happen on their own and show in the same history with method "Tadween balance".

## API

| Route | Who | What |
|---|---|---|
| `GET /partners/me` | any member | Code, ladder, rewards, invited workspaces (initials only), how this workspace was invited and, for affiliates, stats and payout settings with masked details. 404 when the switch is off. |
| `POST /partners/claim {code}` | any member | "Who invited you?" (7 days). |
| `POST /partners/apply {audience, note?}` | any member | "Become a partner": emails the application to the team's inbox (`TADWEEN_SUPPORT_EMAIL`, else Branding's support email), reply-to the applicant. Once per workspace. The admin approves by adding the affiliate in Admin → Growth → Partners. |
| `GET /partners/invited` | any member | The longer trial of a workspace an affiliate brought (billing shows "Start 14-day trial"). |
| `PUT /partners/payout` | the affiliate's own login | Payout preference and details. |
| `GET/POST /admin/console/partners`, `PUT /admin/console/partners/:id`, `POST …/:id/apply`, `POST …/rewards/:id/applied` | super admin | Partners list, add affiliate by email, edit (status, kind, rate, months, ambassador), grant what's due now, mark manual rewards applied. |
| `GET /admin/console/referrals`, `POST …/:id/reject` | super admin | Referrals with fraud flags; reject (voids held rewards and claws back paid ones). |
| `GET /admin/console/payouts`, `GET …/payouts/export`, `POST …/payouts/:partnerId {reference, method, amountCents}` | super admin | Payout history, due list, CSV, mark paid. |

## Website (apps/landing)

- `?ref=` is always stored in the `tdw_ref` cookie: 60 days (`NEXT_PUBLIC_REFERRAL_COOKIE_DAYS`), on `NEXT_PUBLIC_REFERRAL_COOKIE_DOMAIN` (e.g. `.tadween.app`, so studio.tadween.app reads it).
- `ref` is added to every link into the app.
- The app's sign-up page also reads `?ref=` and the cookie, and sends `ref` with `POST /auth/register`. That covers email and social sign-up.
- The home section and `/referral` (`/ar/referral`) only show with `NEXT_PUBLIC_REFERRAL_PROGRAM=1`. Turn it on together with the app switch.
- The Terms have a "Referral program" section (§11).

## Design-system pieces

Invite & earn is minimal: one column at most 560px wide (centred on /invite, start-aligned in Settings) with the invite card, one stat line, one slim partner row and a collapsed "Details". /partners uses the full width of the content area (capped at 1600px on very wide screens), with generous spacing (cards 24px apart, padded 24px, `radius-lg`); its top is the brand-tinted ReferralLinkCard (the only gradient and glow) and the commission tier card above the number tiles. Below it, the body follows Whop's affiliate and earnings dashboards: labels small and muted above the numbers, tables with quiet borders, empty states with one next step. Nile (`primary`) carries progress, selection and the one primary action. Papyrus (`smart`) appears only on AI-credit items (the credit steps of the ladder and credit rewards).

All of these live inside a `.tdw-ui` scope (TadweenScope) and use only the kit's token aliases (`--primary`, `--card`, `--border`…), so light and dark come from the tokens. RTL uses logical properties (`inset-inline-start`, `padding-inline`, `text-align: start`); amounts, dates, codes and links stay LTR inside Arabic text. Animations (the ladder and tier fills) are switched off under `prefers-reduced-motion`.

Styles are in `app/tadween/referral.scss` (Invite & earn pieces, including the link card shared with /partners) and `app/tadween/partners.scss` (partner dashboard, payout drawer form, admin extras). Both pages are CSS containers (`tdw-ref`, `tdw-partners`), and their breakpoints are container queries, so the same layout adapts inside the narrower Settings pane:

| Container width | Invite & earn | /partners |
|---|---|---|
| wide | (never wider than 560px) | tier card across 4 columns, then the 7 number tiles 4 across; link card full width; paired rows (history + payout, kit + rules) |
| ≤ 940px | | paired rows stack |
| ≤ 760px | ladder in "Details" is vertical | number tiles 2 across, kit 1 column |
| ≤ 600px | "Details" cards padded 20/16px, "First paid" column hidden | link button full width, code chip and share buttons stretch; cards padded 20/16px, number tiles 16px with 22px amounts |
| ≤ 440px (phones) | invite card padded 20/16px, 18px title | |

### ReferralLinkCard
`components/tadween/referral/referral.link.card.tsx`

Props:
- `code: string`
- `friendCredits: number` (300, or 500 for affiliates)
- `trialDays?: number | null` (affiliates: 14; it changes the subtitle and the share text)
- `className?`

What it shows:
- A filled Nile gift badge with a soft glow, the headline ("Give {{n}} AI credits, earn rewards") and a subtitle.
- A read-only link field with a primary "Copy link" button.
- A dashed primary-soft code chip (pill) that copies the code, and pill share buttons (WhatsApp, LinkedIn, X with the networks' own colour dot, and the phone's share sheet when `navigator.share` exists).

Link rules (`useInviteLink`):
- Branding has a website URL: `${websiteUrl}/?ref=CODE`, or `/ar?ref=CODE` in Arabic.
- Otherwise: `${origin}/auth?ref=CODE`.

States: copy feedback is a toast. Phones: the button goes full width under the field; the code chip and share buttons stretch.
Theme and direction: the card has a Nile radial tint in the top corner on the end side (top right; top left in Arabic, `html[dir='rtl']`) and a faint Nile ring, in both themes; the link and code stay LTR in Arabic.

### RewardLadder (progress track)
`components/tadween/referral/reward.ladder.tsx`

Props:
- `steps: { step, reward: 'credits'|'free_month'|'next_plan_year'|'founder_for_life', credits, reached }[]`
- `qualified: number` (friends who count)
- `className?`

What it shows:
- A summary: the big number of paying friends and the next goal in Nile ("1 more to 1 free month").
- A track of five nodes on one line. Each node draws the line to the next one, filled by `--seg` (0…1): full when the next step is reached, partly filled between the last reached step and the next one. The steps are uneven (1, 3, 5, 10, 25), so the fill is per segment, not linear in friends.
- Under each node: "N friends", the reward, and "Earned" (with a check) or "N to go" on the next step.

Step states:
- Reached: filled Nile dot with a check (`primary-foreground` icon, so dark mode stays readable).
- Next: primary-soft dot with a Nile ring and a soft halo; "N to go" in Nile.
- Upcoming: hairline dot, muted reward text. Credit steps keep the sparkles icon in Papyrus.
- All reached: "You reached the top of the ladder".

Narrow containers (≤ 760px): the track turns vertical, dots on the start side and the line running down; RTL mirrors it.
Accessibility: a visually hidden `progressbar` (0…last step, value = qualified) next to the readable summary; the steps are an ordered list.

`useLadderLabels()` returns the translated reward text for a step.

### ReferralStatusList (table)
`components/tadween/referral/referral.status.list.tsx`

Props:
- `referrals: { id, initials, status, source, signedUpAt, firstPaidAt, qualifiedAt }[]`

What it shows: a kit `Table` inside the section card (no inner frame; cells line up with the card title) with columns Workspace (initials avatar, where it is on the way to counting, and "with your code" for typed codes), Status pill, Joined and First paid.
- Pills: Signed up (neutral), Paid once (brand), Counts (ok), Not eligible (bad), Refunded (warn).
- No rows: an `EmptyState` (users icon, "No one has joined yet", one line of help).
- Phones: the avatar and the First paid column are hidden.

It never shows names, emails or people. `useReferralStatusLabel()` is exported for other lists.

### PartnerStatTiles
`components/tadween/referral/partner.stat.tiles.tsx`

Props: `stats?: { signups, trials, paying, revenueCents, pendingCents, availableCents, paidCents }`, `rate?`, `tiers?`, `fixedRate?`, `holdDays?` (30), `loading?`, `className?`.
A grid: PartnerTierCard across the full width, then seven kit `StatTile`s: Sign-ups, In trial, Paying customers, Revenue referred (paid invoices, before tax), Pending ("In the 30-day hold"), Available ("Ready for your next payout") and Paid out. 4 across, 2 across at ≤ 760px; amounts stay LTR. `loading` shows skeletons. There is no period selector: the API returns totals since the start.

### PartnerTierCard
Props: `rate`, `paying`, `tiers: { tier, minPaying, rate }[]`, `fixedRate?`.
An award badge, "Your commission" with the rate as a big number ("of every paid invoice"), then the progress to the next tier ("3 / 10 paying to 35%", "7 to go") on a Nile bar that fills from the inline start (right in Arabic). On the top tier: "You're on the top tier". With `fixedRate` (set by the team) there is no bar, only "A rate agreed with the Tadween team". `nextPartnerTier(tiers, paying)` is exported.

### PayoutPreferenceCard
`components/tadween/referral/payout.preference.card.tsx`

Props: `affiliate: PartnerAffiliate`, `onSaved: () => void`, `className?`.

What it shows: the two ways to be paid as rows (Tadween balance 1.5×, Cash monthly with the saved method and masked details), the current one tinted and marked "Current", a "Ready for cash payouts" / "Details missing" pill when cash is chosen, the 30-day hold, and "Change payout settings".
The button opens `PayoutSettingsDrawer`, a kit `Drawer` (inline end side; left in Arabic; full width on phones) with the payout form: preference, then for cash the method, country (two letters, validated), payout details (blank keeps the saved value), Mawthooq number for SA and the W-8BEN confirmation. The drawer owns the form state, like the other kit drawers; Save in its footer (or Enter in a field) sends the same single `PUT /partners/payout` as before; on success the card refreshes and the drawer closes; errors are a warning toast and the drawer stays open. `useMethodLabel()` is exported (payout history uses it).

### Pages
- `InviteEarn` (`invite.earn.tsx`), kept minimal:
  - One card: "Invite friends to Tadween", one line (payments off: friends skip the waitlist; on: the friend's credits, or the trial for affiliates), the read-only link with **Copy** (the button turns into "Copied" with a check for a moment, no toast), icon-only share buttons (WhatsApp, LinkedIn, X, and the phone's share sheet) and a quiet code chip that copies the code (its icon turns into a check). The share text and targets come from `useShareMessage` and `shareTargets` in `referral.link.card.tsx`, shared with ReferralLinkCard.
  - "N friends joined" once someone joined (plus "· N rewards" with payments on).
  - One slim partner row: "Earn 30% for 12 months" (lowest tier rate and months from the program config) with **Apply** to /partners, and "Starts when paid plans launch" while payments are off. Affiliates see "You're a Tadween partner" with **Dashboard** instead.
  - "Have an invite code?" (a small link that opens the claim form) while the workspace can add a code (first 7 days).
  - "Details", collapsed, only with payments on: the ladder (referrers), "You joined with code X", the invited table, the rewards earned, "How it works" and the rules.
  - Used at `/invite` and embedded in Settings → Invite & earn (`embedded`: start-aligned).
- `/partners` (`partners.page.tsx`): page title, PartnerStatTiles (tier card and the seven numbers), ReferralLinkCard, payout history (date, paid as, commission with the 1.5× value for balance payouts; or an empty state) beside PayoutPreferenceCard, then the creator kit (2 × 2) beside the program rules. Other users see an "invite-only" empty state.
- Admin → Growth (`components/tadween/admin/admin.{partners,referrals,payouts}.tsx`): a summary strip in the admin console's `tdw-stat-grid` above the server-side DataTable. Partners: total, affiliates, referrers, suspended. Referrals: total, paid once, qualified, flagged. Each tile links to the filtered list; the numbers are each list's `total` for that filter (`countQuery()` in `admin.api.tsx`, page size 1), never sums of the visible page. Payouts: due this month (total and count, from the `due` list), ready to pay, next payout day, past payouts.

## Phase 2 (not built)

- Applying ladder steps 10 and 25 automatically (a coupon or a price change through the payment provider interface).
- An admin queue for affiliate applications (today they arrive by email), the leaderboard and contests, launch bonuses, and the creator-kit content.
- A cash payout provider (Wise API or Payoneer), and a signed W-8BEN upload instead of the acknowledgement.
- Clawing back credits when a qualified friend is refunded; today only commission is clawed back.
- Converting non-USD Stripe balances: a non-USD customer's free month or balance stays AVAILABLE for the admin to apply.
- Better IP and device signals: today only the sign-up IP and user agent are compared.
