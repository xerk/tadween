# Partners program (phase 1)

Two programs on one system, built into Tadween with no paid tools:

- **Invite & earn · ادعُ واكسب**: every workspace has a referral link and code. The friend gets AI credits on their first payment, and the person who invited them climbs a rewards ladder.
- **Founding Creators (affiliates)**: invite-only. The super admin turns a creator's workspace into an affiliate. Affiliates earn a share of every paid invoice of the customers they bring, for 12 months.

Rewards are paid only out of money customers already paid. Commission is held for 30 days. Default rewards are AI credits and Tadween balance (the Stripe customer balance). Cash goes out by hand once a month (see the runbook below). There is no Stripe Connect.

Everything sits behind the **`affiliate`** instance feature switch (Admin → Features → Growth → "Invite & earn and partners"), which is off by default.
- **Off:** nothing shows, and sign-ups are not attributed.
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

All of these live inside a `.tdw-ui` scope (TadweenScope) and use only kit aliases of the `--tdw-*` tokens. Light and dark come from the tokens; RTL uses logical properties. Styles are in `app/tadween/referral.scss` (Invite & earn pieces) and `app/tadween/partners.scss` (partner dashboard and admin pages).

### ReferralLinkCard
`components/tadween/referral/referral.link.card.tsx`

Props:
- `code: string`
- `friendCredits: number` (300, or 500 for affiliates)
- `trialDays?: number | null` (affiliates: 14; it changes the subtitle and the share text)
- `className?`

What it shows:
- A gift badge, a title ("Give {{n}} AI credits, earn rewards") and a subtitle.
- A read-only link field with a primary "Copy link" button.
- A dashed code chip that copies the code.
- Share pills: WhatsApp, LinkedIn, X, and the phone's native share sheet when `navigator.share` exists.

Link rules (`useInviteLink`):
- Branding has a website URL: `${websiteUrl}/?ref=CODE`, or `/ar?ref=CODE` in Arabic.
- Otherwise: `${origin}/auth?ref=CODE`.

States:
- Copy feedback is a toast.
- On phones (≤720px) the button goes full width under the field, and the code chip and share pills stretch.

Theme and direction:
- Dark: the soft primary gradient corner follows the tokens.
- RTL: the gradient corner moves to the start side, and the link and code stay LTR.

### RewardLadder
`components/tadween/referral/reward.ladder.tsx`

Props:
- `steps: { step, reward: 'credits'|'free_month'|'next_plan_year'|'founder_for_life', credits, reached }[]`
- `qualified: number`
- `className?`

What it shows:
- A summary with the big number of paying friends and the next goal ("2 more to 1 free month").
- A progress track: qualified out of the last step.
- Five step cards in a row.

Step states:
- Reached: success tint and a check.
- Next: primary outline and a filled icon.
- Upcoming: muted.
- All reached: a "top of the ladder" message.

Phones: the steps become a vertical list (icon, text, "Earned").

`useLadderLabels()` returns the translated reward text for a step.

### ReferralStatusList
`components/tadween/referral/referral.status.list.tsx`

Props:
- `referrals: { id, initials, status, source, signedUpAt, firstPaidAt, qualifiedAt }[]`

What it shows:
- One row per invited workspace: an initials avatar, "Joined {date}" (plus "with your code" for typed codes), a hint line, and a status pill.
- Pills: Signed up (neutral), Paid once (brand), Counts (ok), Not eligible (bad), Refunded (warn).
- With no rows, an empty state.

It never shows names, emails or people.

### PartnerStatTiles and PartnerTierCard
`components/tadween/referral/partner.stat.tiles.tsx`

`PartnerStatTiles` props:
- `stats?: { signups, trials, paying, revenueCents, pendingCents, availableCents, paidCents }`
- `rate?`, `tiers?`, `fixedRate?`, `holdDays?` (default 30), `loading?`, `className?`

`PartnerStatTiles` shows:
- A tier card spanning the row.
- Seven tiles: sign-ups, in trial, paying, revenue referred, pending (in the hold), available, paid out.
- Skeletons while loading.

`PartnerTierCard({ rate, paying, tiers, fixedRate? })` shows the rate and the progress to the next tier ("7 / 10 paying to 35%"). It shows "top tier" at the top, and "agreed rate" when the admin set a fixed rate.

Layout: 2 columns at ≤900px and 1 column at ≤640px. Amounts are LTR inside RTL text.

### Pages
- `InviteEarn` (`invite.earn.tsx`): the link card, "Who invited you?" (`ClaimCode`, first 7 days) or "You joined with code X", the ladder (referrers), three stat tiles, rewards earned, invited workspaces, and how it works with the rules. It is used at `/invite` (sidebar and dock "Invite & earn", gift icon) and in Settings → Billing group → Invite & earn.
- `/partners` (`partners.page.tsx`): the affiliate dashboard. Stats, link card, payout preference and details form, payout history, creator kit (placeholder) and program rules. Other users see an "invite-only" empty state.
- Admin → Growth: Partners, Referrals, Payouts (`components/tadween/admin/admin.{partners,referrals,payouts}.tsx`), built on the server-side DataTable.

## Phase 2 (not built)

- Applying ladder steps 10 and 25 automatically (a coupon or a price change through the payment provider interface).
- An open affiliate application form, the leaderboard and contests, launch bonuses, and the creator-kit content.
- A cash payout provider (Wise API or Payoneer), and a signed W-8BEN upload instead of the acknowledgement.
- Clawing back credits when a qualified friend is refunded; today only commission is clawed back.
- Converting non-USD Stripe balances: a non-USD customer's free month or balance stays AVAILABLE for the admin to apply.
- Better IP and device signals: today only the sign-up IP and user agent are compared.
