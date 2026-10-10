// Public URLs, read at build time. NEXT_PUBLIC_* values are inlined into the bundle.
import type { LegalValueKey, RefundMode } from '@/content/types';

const trim = (u: string) => u.replace(/\/+$/, '');

/** The Tadween app (sign-up and sign-in live there). */
export const APP_URL = trim(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4200');
/** The Tadween API; when set, pricing reads plans from GET /instance/settings. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ? trim(process.env.NEXT_PUBLIC_API_URL) : '';
/** Where this marketing site is served from (canonical URLs, sitemap, Open Graph). */
export const SITE_URL = trim(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4300');

/** The base of the MCP addresses the agent and AI client pages show ({api}/mcp,
    {api}/mcp-oauth-dynamic). Like the app's MCP_URL, NEXT_PUBLIC_MCP_URL wins when MCP is
    served from its own host; otherwise it's the API, or a placeholder the reader replaces. */
export const DOCS_API_URL = trim(process.env.NEXT_PUBLIC_MCP_URL || '') || API_URL || 'https://api.your-tadween-domain';

/** Show the social-proof section with its clearly marked placeholder slots. Off by default,
    so the live site never shows invented customers; set NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS=1
    on a preview build to see where real logos and a quote will go. */
export const SHOW_PROOF = process.env.NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS === '1';

export const SIGN_UP_URL = `${APP_URL}/auth`;
export const SIGN_IN_URL = `${APP_URL}/auth/login`;

/** Tadween is built on Postiz (AGPL-3.0); the footer credit links to its source. */
/** Tadween's own source (AGPL-3.0 asks that users of the hosted app can get the source). */
export const SOURCE_URL = 'https://github.com/xerk/tadween';

// ── Legal pages (/terms, /privacy, /refund, /contact) ──────────────────────────────────
// The company details the legal pages name. One left unset shows as a marked placeholder
// ("[Company legal name]") on the page, so nothing is invented; set them all before the site
// goes live. docs/tadween/legal.md lists them.
const env = (v: string | undefined) => (v || '').trim();
export const LEGAL: Record<LegalValueKey, string> = {
  company: env(process.env.NEXT_PUBLIC_LEGAL_COMPANY),
  state: env(process.env.NEXT_PUBLIC_LEGAL_STATE),
  address: env(process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
  email: env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
  // The state whose law governs the Terms: the state of formation unless set.
  law: env(process.env.NEXT_PUBLIC_LEGAL_GOVERNING_LAW) || env(process.env.NEXT_PUBLIC_LEGAL_STATE),
  venue: env(process.env.NEXT_PUBLIC_LEGAL_VENUE),
  refundDays: env(process.env.NEXT_PUBLIC_REFUND_DAYS),
  aiProviders: env(process.env.NEXT_PUBLIC_LEGAL_AI_PROVIDERS),
  emailProvider: env(process.env.NEXT_PUBLIC_LEGAL_EMAIL_PROVIDER),
  hostingProvider: env(process.env.NEXT_PUBLIC_LEGAL_HOSTING_PROVIDER),
  analytics: env(process.env.NEXT_PUBLIC_LEGAL_ANALYTICS),
};

/** NEXT_PUBLIC_REFUND_DAYS=0 switches the Refund Policy to "no refunds except where the law
    requires"; any other value (or none, shown as a placeholder) keeps the refund window on
    the first payment. */
export const REFUND_MODE: RefundMode = LEGAL.refundDays && Number(LEGAL.refundDays) === 0 ? 'none' : 'window';
// A typo here would publish "within NaN days" in the Refund Policy; fail the build instead.
if (LEGAL.refundDays && !/^\d+$/.test(LEGAL.refundDays)) throw new Error(`NEXT_PUBLIC_REFUND_DAYS must be a whole number of days, got "${LEGAL.refundDays}".`);

/** The "Last updated" date of the legal pages. Change it whenever their text changes. */
export const LEGAL_UPDATED = '2026-10-11';

/** Third-party policies the legal pages link to. */
export const POLICY_URLS = {
  youtubeTerms: 'https://www.youtube.com/t/terms',
  googlePrivacy: 'https://policies.google.com/privacy',
  googleUserData: 'https://developers.google.com/terms/api-services-user-data-policy',
  googlePermissions: 'https://myaccount.google.com/permissions',
  linkedinTerms: 'https://www.linkedin.com/legal/user-agreement',
  metaTerms: 'https://developers.facebook.com/terms/',
  stripePrivacy: 'https://stripe.com/privacy',
} as const;
