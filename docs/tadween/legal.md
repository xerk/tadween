# Legal pages: Terms, Privacy, Refund and Contact

> **Owner: fill these in before Stripe reviews the account.** Until each value is set, the
> public pages show it as an orange placeholder such as **[Company legal name]**. Nothing about
> the company is invented in the text.
>
> **Have a lawyer review all three documents before relying on them.** They are plain-language
> SaaS templates written for Stripe's account review and the card-network rules, not legal
> advice. (This note is only here and in the PR, never on the public pages.)

The marketing site (`apps/landing`) serves, in English and Arabic:

| Page | English | Arabic |
| --- | --- | --- |
| Terms of Service | `/terms` | `/ar/terms` |
| Privacy Policy | `/privacy` | `/ar/privacy` |
| Refund and Cancellation Policy | `/refund` | `/ar/refund` |
| Contact | `/contact` | `/ar/contact` |

Every page links to all four from the footer ("Legal" column). The pricing table, on `/pricing`
and the home page, says "By starting a trial or subscribing, you agree to the Terms of Service
and the Refund and Cancellation Policy" with links. The pages are in the sitemap with hreflang
and canonical links. The Arabic pages say that the English version prevails if the two differ.

The text lives in `apps/landing/src/content/legal.en.ts` and `legal.ar.ts`. When you change it,
change both, and update `LEGAL_UPDATED` in `apps/landing/src/lib/config.ts` (the "Last updated"
date on the pages).

## Placeholders to fill

Set these as environment variables (or Docker build args) for the landing site. They are read at
build time, so rebuild after changing them.

| Variable | Shown until set | Example | Where it appears |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_LEGAL_COMPANY` | [Company legal name] | `Tadween LLC` | All pages: who operates the Service, contact blocks |
| `NEXT_PUBLIC_LEGAL_STATE` | [US state of formation] | `Delaware` | Terms §1 |
| `NEXT_PUBLIC_LEGAL_ADDRESS` | [Registered business address] | `1209 Orange St, Wilmington, DE 19801, USA` | Terms §1/§18, Privacy §1/§14, Refund §8, Contact |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | [Support email] | `support@example.com` | Everywhere people are told to contact you (rendered as a `mailto:` link) |
| `NEXT_PUBLIC_LEGAL_GOVERNING_LAW` | [Governing law state] | `Delaware` | Terms §16. Optional: falls back to `NEXT_PUBLIC_LEGAL_STATE` |
| `NEXT_PUBLIC_LEGAL_VENUE` | [Court venue, e.g. county and state] | `New Castle County, Delaware` | Terms §16 |
| `NEXT_PUBLIC_REFUND_DAYS` | [number of] | `14` | Refund §1/§4. `0` switches to the no-refund wording (below) |
| `NEXT_PUBLIC_LEGAL_AI_PROVIDERS` | [AI providers you use, e.g. OpenAI] | `OpenAI` | Privacy §6 |
| `NEXT_PUBLIC_LEGAL_EMAIL_PROVIDER` | [Email delivery provider] | `Resend` | Privacy §6 |
| `NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER` | [Hosting and file storage provider] | `Hetzner (servers), Cloudflare R2 (media)` | Privacy §6 |
| `NEXT_PUBLIC_LEGAL_ANALYTICS` | [Analytics and error-monitoring tools, or "none"] | `PostHog, Sentry` or `none` | Privacy §6 and §7 |

How to pick the provider values: the app sends email through whatever `EMAIL_PROVIDER` it is
configured with (Resend or SMTP via nodemailer), stores media where `STORAGE_PROVIDER` points
(local disk or Cloudflare R2), and loads analytics or error tracking only when their env keys are
set (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_FACEBOOK_PIXEL`,
`NEXT_PUBLIC_SENTRY_DSN`). List what production actually uses. If the AI tools in the app call
other vendors besides OpenAI on your instance (image or video generation), list them too.

The values are written into the page as given, in both languages, so use the Latin legal name and
address (they are wrapped so they read correctly inside Arabic text).

## Refund policy: the choice

**Default (chosen): refund window on the first payment.** With `NEXT_PUBLIC_REFUND_DAYS=14`, the
policy says: cancel any time and keep access until the end of the paid period; no charge if you
cancel during the 7-day trial; a full refund of the **first payment of a new subscription** if
asked within 14 days of that payment (once per customer, and the subscription is cancelled);
renewals are not refundable except where the law requires (with a "contact us" path for an
unwanted renewal you have not used); billing errors are always refunded.

This is the consumer-friendly option Stripe reviewers and card networks like to see, and it keeps
disputes down: a customer who forgot to cancel the trial can get the money back without a
chargeback.

Alternatives:

- **A different window**: set `NEXT_PUBLIC_REFUND_DAYS` to `7` or `30`. Arabic note: the Arabic
  text says "{n} يومًا", which is correct for 11 and above (14, 30); for 3 to 10 the Arabic word
  should be "أيام", so edit `legal.ar.ts` if you pick 7.
- **No refunds**: set `NEXT_PUBLIC_REFUND_DAYS=0`. The policy then says payments are not
  refundable except where the law requires, because you can try free and cancel any time;
  billing errors are still refunded. This is allowed by Stripe, but expect more disputes.
- **Refunds on annual plans too** (for example a prorated refund of the unused months of a yearly
  plan within 30 days of renewal): not built in; edit the `refunds` section of `legal.en.ts` and
  `legal.ar.ts`.

## Commitments the text makes that you must honour by hand

The pages describe only what the app does today. A few sentences are promises that the app does
not automate, so someone has to do them:

- **Refunds** are done by you in the Stripe Dashboard (or the admin console), within a few
  business days of a request to the support email.
- **Price changes**: the Terms promise notice before a new price applies at renewal. The app does
  not send this email; send it yourself (or through Stripe) before changing prices of existing
  subscriptions.
- **Material changes to the terms**: the same, tell users by email or in the app before they take
  effect.
- **Google / YouTube revocation**: the Privacy Policy promises that when a user revokes access in
  Google's security settings, the YouTube data stored under that permission is deleted within 7
  days of learning about it (required by the YouTube API Services Developer Policies). The app does not
  detect revocations automatically; when a user tells you, or a token stops working because it was
  revoked, delete that channel's data.
- **Privacy requests** (access, copy, deletion, correction) arrive at the support email. There is
  no self-service data export in the app, so answer access/copy requests by hand. Account deletion
  exists in the app (Settings), which removes the user's workspaces, channels and posts and
  de-identifies the user record.

Things deliberately **not** claimed: trial-ending reminder emails, data export, SOC 2 or other
certifications, uptime guarantees, or any feature the app does not have. Stripe can send
trial-ending and renewal reminder emails for you (Stripe Dashboard → Settings → Billing →
Subscriptions and emails); turning them on is recommended, and if you do, you may add a sentence
about them to the Refund Policy.

## Stripe review checklist

What Stripe and the card networks look for, and where it is:

- Business name and contact details: footer → Contact, and every policy's contact section
  (needs `NEXT_PUBLIC_LEGAL_COMPANY`, `NEXT_PUBLIC_LEGAL_ADDRESS`, `NEXT_PUBLIC_SUPPORT_EMAIL`).
- Clear description of what is sold, prices and currency: home page, `/pricing` (USD).
- Refund and cancellation policy: `/refund`, linked from the footer and next to the pricing table.
- Terms of Service with recurring billing, auto-renewal and trial disclosure: `/terms` §5.
- Privacy Policy: `/privacy`.
- Agreement before purchase: the line under the pricing table. Consider also adding the Terms
  and Refund links to the app's own billing page. Stripe Checkout can require a terms checkbox,
  but that needs the app to pass `consent_collection` when it creates the session (not part of
  this change).

In the Stripe Dashboard (Settings → Business → Public details) set the support email, the website
and the links to `https://<site>/terms`, `https://<site>/privacy` and `https://<site>/refund`.

## Google / YouTube API requirements covered

From the YouTube API Services Developer Policies and the Google API Services User Data Policy:

- The Terms say users agree to be bound by the YouTube Terms of Service (link to
  `https://www.youtube.com/t/terms`), Terms §9.
- The Privacy Policy says Tadween uses YouTube API Services, links the Google Privacy Policy, says
  what YouTube data is accessed and stored and why, includes the Limited Use disclosure ("Tadween's
  use and transfer to any other app of information received from Google APIs will adhere to the
  Google API Services User Data Policy, including the Limited Use requirements"), explains
  revocation at `https://myaccount.google.com/permissions`, and gives a contact for privacy
  complaints, Privacy §5.
- Cookies are disclosed in Privacy §7.

For the Google OAuth verification form, use `https://<site>/privacy` as the privacy policy URL
and `https://<site>/terms` as the terms URL. The privacy policy must be on the same domain as the
app's home page in the OAuth consent screen.

## Links from the app (sign-up page, settings)

The app's Terms and Privacy links come from **Admin → Branding** (`termsUrl` and `privacyUrl`,
added in PR #17, "brand links in Branding"). Set them to:

- Terms of service: `https://<site>/terms`
- Privacy policy: `https://<site>/privacy`

Until they are saved in Branding, PR #17 reads the env fallbacks `TADWEEN_TERMS_URL` and
`TADWEEN_PRIVACY_URL` on the backend, so on the production backend set:

```
TADWEEN_TERMS_URL=https://<site>/terms
TADWEEN_PRIVACY_URL=https://<site>/privacy
```

Branding also has a support email field: use the same address as `NEXT_PUBLIC_SUPPORT_EMAIL`.
