// Tadween super-admin console: registries and defaults.
//
// Everything here describes what the instance does when the admin has not saved
// anything yet. Those defaults equal current Postiz behaviour (all features on,
// registration driven by env vars, every provider listed in Postiz's order with
// LinkedIn first), so an empty database changes nothing for existing users.
import { SubscriptionTier } from '@prisma/client';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

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
  { key: 'thirdParty', group: 'Workspace', label: 'Integrations', description: 'Third-party tools such as HeyGen.', hides: 'Integrations in the sidebar', applied: true },
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
  const offByDefault: FeatureKey[] = ['ugc'];
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

export const credentialStatus = (identifier: string) => {
  const spec = PROVIDER_CREDENTIALS[identifier];
  if (!spec) {
    // The user brings their own server or token (Bluesky, Mastodon custom, WordPress…)
    return { needsCredentials: false, configured: true, env: [] as { name: string; set: boolean }[], note: undefined as string | undefined };
  }
  const isSet = (name: string) => !!process.env[name];
  const names = [...spec.required, ...(spec.anyOf || []).flat()];
  const requiredOk = spec.required.every(isSet);
  const anyOk = !spec.anyOf || spec.anyOf.some((group) => group.every(isSet));
  return {
    needsCredentials: true,
    configured: requiredOk && anyOk,
    env: Array.from(new Set(names)).map((name) => ({ name, set: isSet(name) })),
    note: spec.note,
  };
};

// ── Plans ────────────────────────────────────────────────────────────────────
// The four Tadween tiers from the design system. PRICES ARE PLACEHOLDERS: the
// owner sets real EGP/USD prices in /admin/plans before selling.
// Tier mapping (Plan.tier → Postiz SubscriptionTier) is chosen so inherited
// capabilities grow with the plan: Creator→STANDARD, Pro→TEAM, Team→PRO,
// Agency→ULTIMATE. Stripe products stay keyed by the Postiz tier name.
//
// LIMITS COME FROM POSTIZ'S PRICING MAP. A plan's limits replace the tier's for
// every workspace on it (team members and AI at once, channels at the next
// Stripe renewal), and this instance already has paying subscribers. Loading the
// defaults must therefore never lower anything: channels, team members and AI
// credits equal the static `pricing` entry of the tier. Lowering them is a
// deliberate edit in /admin/plans, which PlansService refuses while paying
// workspaces are on that tier.
const limitsOf = (tier: Exclude<SubscriptionTier, 'FREE'>) => ({
  channels: pricing[tier].channel!,
  teamMembers: pricing[tier].team_members ? -1 : 0,
  postsPerMonth: -1,
  aiCredits: pricing[tier].image_generation_count,
});

export interface DefaultPlan {
  key: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  monthlyPriceEgp: number;
  yearlyPriceEgp: number;
  trialDays: number;
  mostPopular: boolean;
  channels: number;
  teamMembers: number;
  postsPerMonth: number;
  aiCredits: number;
  features: string[];
  position: number;
}

export const DEFAULT_PLANS: DefaultPlan[] = [
  {
    key: 'creator',
    name: 'Creator',
    description: 'For one voice on LinkedIn',
    tier: 'STANDARD',
    monthlyPriceUsd: 9,
    yearlyPriceUsd: 86,
    monthlyPriceEgp: 299,
    yearlyPriceEgp: 2868,
    trialDays: 7,
    mostPopular: false,
    ...limitsOf('STANDARD'),
    features: ['5 channels', 'Unlimited scheduled posts', 'First comments and repeats', 'Calendar and post previews', 'Analytics'],
    position: 0,
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'For creators who post every week',
    tier: 'TEAM',
    monthlyPriceUsd: 19,
    yearlyPriceUsd: 182,
    monthlyPriceEgp: 599,
    yearlyPriceEgp: 5748,
    trialDays: 7,
    mostPopular: false,
    ...limitsOf('TEAM'),
    features: ['10 channels', 'Unlimited team members', 'Everything in Creator', 'RSS auto-post', 'Sets and signatures'],
    position: 1,
  },
  {
    key: 'team',
    name: 'Team',
    description: 'For brands with a team',
    tier: 'PRO',
    monthlyPriceUsd: 39,
    yearlyPriceUsd: 374,
    monthlyPriceEgp: 1199,
    yearlyPriceEgp: 11508,
    trialDays: 7,
    mostPopular: true,
    ...limitsOf('PRO'),
    features: ['30 channels', 'Unlimited team members', 'Preview links for clients', 'Shared calendar and tags', 'Agent and MCP access'],
    position: 2,
  },
  {
    key: 'agency',
    name: 'Agency',
    description: 'For agencies and many clients',
    tier: 'ULTIMATE',
    monthlyPriceUsd: 79,
    yearlyPriceUsd: 758,
    monthlyPriceEgp: 2499,
    yearlyPriceEgp: 23988,
    trialDays: 7,
    mostPopular: false,
    ...limitsOf('ULTIMATE'),
    features: ['100 channels', 'Everything in Team', 'Customer groups', 'Unlimited webhooks'],
    position: 3,
  },
];
