// Tadween super-admin console: registries and defaults.
//
// Everything here describes what the instance does when the admin has not saved
// anything yet. Most defaults equal current Postiz behaviour (all features on,
// registration driven by env vars, LinkedIn first in Postiz's provider order).
// The exception is the channel list: only the focus networks (FOCUS_PROVIDERS)
// can be added until the admin chooses otherwise. Channels a workspace already
// connected are never affected by it.
import { SubscriptionTier } from '@prisma/client';

// ── Registration ──────────────────────────────────────────────────────────────
export type RegistrationMode = 'open' | 'invite' | 'closed';
export const REGISTRATION_MODES: RegistrationMode[] = ['open', 'invite', 'closed'];

// Env fallback, in the same order the deployment patch applied it.
export const registrationModeFromEnv = (): RegistrationMode => {
  if (process.env.DISABLE_REGISTRATION === 'true') {
    return 'closed';
  }
  if (process.env.INVITE_ONLY_REGISTRATION === 'true') {
    return 'invite';
  }
  return 'open';
};

// ── Features ─────────────────────────────────────────────────────────────────
export const FEATURE_KEYS = [
  'ai',
  'agent',
  'autopost',
  'plugs',
  'analytics',
  'publicApi',
  'webhooks',
  'shortLinks',
  'signatures',
  'sets',
  'thirdParty',
  'media',
  'ugc',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  group: 'Publishing' | 'Smart' | 'Developers' | 'Workspace' | 'Growth';
  // What the switch hides today (Phase A hides UI; see docs/tadween/super-admin.md)
  hides: string;
  // false = the value is saved and exposed, but nothing reads it yet (Phase B)
  applied: boolean;
}

export const FEATURES: FeatureDefinition[] = [
  { key: 'ai', group: 'Smart', label: 'AI writing and images', description: 'AI assistant in the editor, generator and image tools.', hides: 'AI buttons in the post editor (Phase B)', applied: false },
  { key: 'agent', group: 'Smart', label: 'Agent', description: 'The chat agent that drafts and schedules posts.', hides: 'Agent in the sidebar', applied: true },
  { key: 'autopost', group: 'Publishing', label: 'RSS auto-post', description: 'Turn new feed items into drafts or posts.', hides: 'Settings → Auto post', applied: true },
  { key: 'plugs', group: 'Publishing', label: 'Plugs', description: 'Auto repost and auto plug when a post reaches a like threshold.', hides: 'Plugs in the sidebar', applied: true },
  { key: 'analytics', group: 'Workspace', label: 'Analytics', description: 'Channel and post analytics.', hides: 'Analytics in the sidebar', applied: true },
  { key: 'media', group: 'Workspace', label: 'Media library', description: 'The standalone media page. Uploading from the editor stays on.', hides: 'Media in the sidebar', applied: true },
  { key: 'thirdParty', group: 'Workspace', label: 'Integrations', description: 'Third-party tools such as HeyGen. Off unless you switch it on.', hides: 'Integrations in the sidebar', applied: true },
  { key: 'signatures', group: 'Workspace', label: 'Signatures', description: 'Saved sign-offs added to posts.', hides: 'Settings → Signatures', applied: true },
  { key: 'sets', group: 'Workspace', label: 'Sets', description: 'Saved channel groups with a message template.', hides: 'Settings → Sets', applied: true },
  { key: 'shortLinks', group: 'Workspace', label: 'Short links', description: 'Shorten and track links in posts.', hides: 'Settings → Short links preference', applied: true },
  { key: 'publicApi', group: 'Developers', label: 'Public API, MCP and CLI', description: 'API key, OAuth apps and the MCP server for each workspace.', hides: 'Settings → API & MCP, and the agent step of onboarding', applied: true },
  { key: 'webhooks', group: 'Developers', label: 'Webhooks', description: 'HTTP callbacks when posts publish or fail.', hides: 'Settings → Webhooks', applied: true },
  { key: 'ugc', group: 'Growth', label: 'UGC videos', description: 'The AgentMedia UGC video shortcut (a Postiz partner deal). Off unless you switch it on.', hides: 'Make UGC in the sidebar', applied: true },
];

// Env fallback: TADWEEN_DISABLED_FEATURES="plugs,ugc" turns features off until
// the admin saves a value (same shape as Postiz's HIDDEN_PROVIDERS).
export const featureDefaultsFromEnv = (): Record<FeatureKey, boolean> => {
  const off = (process.env.TADWEEN_DISABLED_FEATURES || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  // Partner shortcuts that point at Postiz's own deals (AgentMedia UGC videos)
  // start off; a super admin can switch them on, or list them in
  // TADWEEN_ENABLED_FEATURES. Keep in sync with FEATURES_OFF_BY_DEFAULT in
  // the frontend's instance.settings.tsx.
  const on = (process.env.TADWEEN_ENABLED_FEATURES || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  // off until the admin switches them on: UGC (a Postiz partner deal) and Integrations (hidden for now)
  const offByDefault: FeatureKey[] = ['ugc', 'thirdParty'];
  return FEATURE_KEYS.reduce(
    (all, key) => ({
      ...all,
      [key]:
        !off.includes(key) && (!offByDefault.includes(key) || on.includes(key)),
    }),
    {} as Record<FeatureKey, boolean>
  );
};

// ── Branding ─────────────────────────────────────────────────────────────────
// Public links shown in the product (terms, docs, support…). Empty hides the
// link; nothing falls back to Postiz's own sites.
export const BRAND_LINK_KEYS = [
  'websiteUrl',
  'termsUrl',
  'privacyUrl',
  'docsUrl',
  'supportUrl',
  'tutorialVideoUrl',
] as const;
export type BrandLinkKey = (typeof BRAND_LINK_KEYS)[number];
export type BrandLinks = Record<BrandLinkKey, string>;

export interface Branding extends BrandLinks {
  instanceName: string;
  supportEmail: string;
  defaultLanguage: string;
  defaultTimezone: string;
}

// Env fallbacks until the admin saves Branding: TADWEEN_WEBSITE_URL,
// TADWEEN_TERMS_URL, TADWEEN_PRIVACY_URL, TADWEEN_DOCS_URL, TADWEEN_SUPPORT_URL,
// TADWEEN_TUTORIAL_VIDEO_URL.
export const brandLinksFromEnv = (): BrandLinks => ({
  websiteUrl: process.env.TADWEEN_WEBSITE_URL || '',
  termsUrl: process.env.TADWEEN_TERMS_URL || '',
  privacyUrl: process.env.TADWEEN_PRIVACY_URL || '',
  docsUrl: process.env.TADWEEN_DOCS_URL || '',
  supportUrl: process.env.TADWEEN_SUPPORT_URL || '',
  tutorialVideoUrl: process.env.TADWEEN_TUTORIAL_VIDEO_URL || '',
});

export const brandingDefaults = (): Branding => ({
  instanceName: process.env.TADWEEN_INSTANCE_NAME || 'Tadween',
  supportEmail: process.env.EMAIL_FROM_ADDRESS || '',
  defaultLanguage: 'en',
  // Empty means "use the browser's time zone", which is what Postiz does today.
  defaultTimezone: '',
  ...brandLinksFromEnv(),
});

// For code that has no access to the settings service (provider user agents,
// MCP server metadata): the instance name from env, never "Postiz".
export const brandNameFromEnv = () => brandingDefaults().instanceName;

// User-Agent for outgoing provider calls (WordPress, Tumblr): this instance,
// not postiz.com.
export const brandUserAgent = () =>
  `${brandNameFromEnv().replace(/[^A-Za-z0-9._-]/g, '') || 'Tadween'}/1.0 (+${
    process.env.FRONTEND_URL || 'http://localhost'
  })`;

// Domain for generated addresses (accounts without an email, Stripe customers):
// TADWEEN_PLACEHOLDER_EMAIL_DOMAIN, else this instance's host. Used to be
// @postiz.com, which would route Stripe mail to Postiz's domain.
export const placeholderEmailDomain = () => {
  if (process.env.TADWEEN_PLACEHOLDER_EMAIL_DOMAIN) {
    return process.env.TADWEEN_PLACEHOLDER_EMAIL_DOMAIN;
  }
  try {
    const host = new URL(process.env.FRONTEND_URL || '').hostname;
    return host.includes('.') ? host : 'example.com';
  } catch (e) {
    return 'example.com';
  }
};

// ── Providers ────────────────────────────────────────────────────────────────
// Instance credentials each provider needs. Only the *names* are ever sent to
// the client, with a boolean for whether they are set. `anyOf` lists accepted
// alternatives (Google Business falls back to the YouTube app).
export interface ProviderCredentials {
  required: string[];
  anyOf?: string[][];
  note?: string;
}

export const PROVIDER_CREDENTIALS: Record<string, ProviderCredentials> = {
  linkedin: { required: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'] },
  'linkedin-page': { required: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'] },
  x: { required: ['X_API_KEY', 'X_API_SECRET'] },
  reddit: { required: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'] },
  instagram: { required: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'] },
  'instagram-standalone': { required: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'] },
  facebook: { required: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'] },
  threads: { required: ['THREADS_APP_ID', 'THREADS_APP_SECRET'] },
  youtube: { required: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'] },
  gmb: {
    required: [],
    anyOf: [
      ['GOOGLE_GMB_CLIENT_ID', 'GOOGLE_GMB_CLIENT_SECRET'],
      ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
    ],
  },
  tiktok: { required: ['TIKTOK_CLIENT_ID', 'TIKTOK_CLIENT_SECRET'] },
  'tiktok-business': { required: ['TIKTOK_BUSINESS_CLIENT_ID', 'TIKTOK_BUSINESS_CLIENT_SECRET'] },
  pinterest: { required: ['PINTEREST_CLIENT_ID', 'PINTEREST_CLIENT_SECRET'] },
  dribbble: { required: ['DRIBBBLE_CLIENT_ID', 'DRIBBBLE_CLIENT_SECRET'] },
  discord: { required: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_BOT_TOKEN_ID'] },
  slack: { required: ['SLACK_ID', 'SLACK_SECRET'] },
  kick: { required: ['KICK_CLIENT_ID', 'KICK_SECRET'] },
  twitch: { required: ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'] },
  mastodon: { required: ['MASTODON_CLIENT_ID', 'MASTODON_CLIENT_SECRET'], note: 'MASTODON_URL is optional (defaults to mastodon.social).' },
  wrapcast: { required: ['NEYNAR_CLIENT_ID', 'NEYNAR_SECRET_KEY'] },
  telegram: { required: ['TELEGRAM_TOKEN'] },
  vk: { required: ['VK_ID'] },
  whop: { required: ['WHOP_CLIENT_ID'] },
  mewe: { required: ['MEWE_APP_ID', 'MEWE_API_KEY'] },
  tumblr: { required: ['TUMBLR_CLIENT_ID', 'TUMBLR_CLIENT_SECRET'] },
};

// Providers that sort to the top when nothing is saved: Tadween is LinkedIn first.
export const PROVIDER_PRIORITY = ['linkedin', 'linkedin-page'];

// The networks Tadween focuses on. Until the super admin saves Admin → Channels,
// only these can be added (and only once their app keys are set). A saved
// choice always wins; a provider without a saved row (e.g. one added upstream
// later) falls back to this list.
export const FOCUS_PROVIDERS = [
  'linkedin',
  'linkedin-page',
  'instagram',
  'instagram-standalone',
  'facebook',
  'threads',
  'youtube',
];

// Env override: TADWEEN_ENABLED_PROVIDERS="linkedin,linkedin-page,x" replaces
// the focus list (same shape as HIDDEN_PROVIDERS).
export const focusProviders = (): string[] => {
  const fromEnv = (process.env.TADWEEN_ENABLED_PROVIDERS || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : FOCUS_PROVIDERS;
};

export const credentialStatus = (identifier: string) => {
  const spec = PROVIDER_CREDENTIALS[identifier];
  if (!spec) {
    // The user brings their own server or token (Bluesky, Mastodon custom, WordPress…)
    return { needsCredentials: false, env: [] as { name: string; set: boolean }[], note: undefined as string | undefined };
  }
  const isSet = (name: string) => !!process.env[name];
  const names = [...spec.required, ...(spec.anyOf || []).flat()];
  // Whether they are all set: ProviderCredentialsService.isConfigured
  return {
    needsCredentials: true,
    env: Array.from(new Set(names)).map((name) => ({ name, set: isSet(name) })),
    note: spec.note,
  };
};

// ── Plans ────────────────────────────────────────────────────────────────────
// Three plans that differ in limits; every feature is on in all of them except
// webhooks (Business and Agency). Prices are USD; the yearly price is always
// derived from the monthly one with the yearly discount below (editable in
// /admin/plans, stored in platform settings). 17% ≈ two months free.
//
// Each plan sells its own Postiz tier (Stripe products, prices and webhooks map
// subscriptions back by tier): Creator → STANDARD, Business → TEAM, Agency →
// PRO. Business and Agency take over the tiers the first two Tadween plans sold
// (Pro → TEAM, Business → PRO), so those subscribers only gain limits and keep
// the Stripe price they pay.
//
// Founder pricing: while the founder window is open (the first
// DEFAULT_FOUNDER_CAP paying workspaces, optionally until an end date),
// checkout charges `founderMonthlyPriceUsd` instead of the list price.
// Stripe keeps a subscription on the price it started with, so founders keep
// theirs while they stay subscribed.
//
// Paying workspaces must never lose limits: loading the defaults goes through
// PlansService's lower-limits guard, which refuses any default that would lower
// a tier with subscribers and reports it instead.
export const DEFAULT_YEARLY_DISCOUNT_PERCENT = 17;
export const DEFAULT_FOUNDER_CAP = 300;

export interface DefaultPlan {
  key: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  // List ("regular") price
  monthlyPriceUsd: number;
  // Charged instead while the founder window is open (null: no founder offer)
  founderMonthlyPriceUsd: number | null;
  trialDays: number;
  mostPopular: boolean;
  channels: number;
  // Members besides the owner (-1 unlimited, 0 owner only)
  teamMembers: number;
  postsPerMonth: number;
  aiCredits: number;
  // null = the tier's static value (TEAM 10, PRO 30)
  webhooks: number | null;
  // Extra bullets shown after the ones generated from the limits
  features: string[];
  position: number;
}

export const DEFAULT_PLANS: DefaultPlan[] = [
  {
    key: 'creator',
    name: 'Creator',
    description: 'For creators and solo founders',
    tier: 'STANDARD',
    monthlyPriceUsd: 19,
    founderMonthlyPriceUsd: 12,
    trialDays: 7,
    mostPopular: false,
    channels: 5,
    teamMembers: 0,
    postsPerMonth: -1,
    aiCredits: 250,
    webhooks: 0,
    features: [],
    position: 0,
  },
  {
    key: 'business',
    name: 'Business',
    description: 'For brands and small teams',
    tier: 'TEAM',
    monthlyPriceUsd: 39,
    founderMonthlyPriceUsd: 24,
    trialDays: 7,
    mostPopular: true,
    channels: 15,
    teamMembers: 5,
    postsPerMonth: -1,
    aiCredits: 750,
    webhooks: null,
    features: [],
    position: 1,
  },
  {
    key: 'agency',
    name: 'Agency',
    description: 'For agencies running many brands',
    tier: 'PRO',
    monthlyPriceUsd: 79,
    founderMonthlyPriceUsd: 49,
    trialDays: 7,
    mostPopular: false,
    channels: 40,
    teamMembers: -1,
    postsPerMonth: -1,
    aiCredits: 2000,
    webhooks: null,
    features: [],
    position: 2,
  },
];
