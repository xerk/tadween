import type { Lang } from '@/content/types';
import { AI_CLIENTS } from './aiClients';
import { CHANNELS } from './channels';
import { REFERRAL_PROGRAM } from './config';

/** Paths of the pages that exist in both languages, without the /ar prefix. */
export const PATHS = {
  home: '',
  features: '/features',
  channels: '/channels',
  agent: '/ai-agent',
  pricing: '/pricing',
  terms: '/terms',
  privacy: '/privacy',
  refund: '/refund',
  contact: '/contact',
  deleteAccount: '/delete-account',
  /** Invite & earn; only built when REFERRAL_PROGRAM is on. */
  referral: '/referral',
} as const;

/** The legal pages, in the order the footer lists them. */
export const LEGAL_PAGES = ['terms', 'privacy', 'refund', 'contact', 'deleteAccount'] as const;
export type LegalPageKey = (typeof LEGAL_PAGES)[number];

/** The tools, in the order /features and the home page list them. Each is a section of
    /features (anchor #<slug>); the AI agent has its own page at /ai-agent. */
export const FEATURE_SLUGS = ['calendar', 'board', 'composer', 'media-library', 'analytics', 'collaboration', 'auto-post', 'signatures-sets'] as const;
export type FeatureSlug = (typeof FEATURE_SLUGS)[number];

export const channelPath = (slug: string) => `${PATHS.channels}/${slug}`;
/** A tool's section on /features. */
export const featurePath = (slug: FeatureSlug) => `${PATHS.features}#${slug}`;
/** AI client pages sit at the top level (/chatgpt, /ar/chatgpt), like Postiz's. lib/clientRoutes.ts
    keeps them from colliding with any other route. */
export const clientPath = (slug: string) => `/${slug}`;

/** The URL of a page in one language: English has no prefix, Arabic lives under /ar. */
export const localePath = (lang: Lang, path: string) => (lang === 'ar' ? `/ar${path}` : path || '/');

/** Every page, for the sitemap. */
export const ALL_PAGES: { path: string; priority: number }[] = [
  { path: PATHS.home, priority: 1 },
  { path: PATHS.pricing, priority: 0.9 },
  { path: PATHS.features, priority: 0.8 },
  { path: PATHS.agent, priority: 0.8 },
  { path: PATHS.channels, priority: 0.8 },
  // The focus networks are equals, so every channel page gets the same priority.
  ...CHANNELS.map((c) => ({ path: channelPath(c.slug), priority: 0.8 })),
  ...AI_CLIENTS.map((c) => ({ path: clientPath(c.slug), priority: 0.7 })),
  ...(REFERRAL_PROGRAM ? [{ path: PATHS.referral, priority: 0.5 }] : []),
  ...LEGAL_PAGES.map((key) => ({ path: PATHS[key], priority: 0.3 })),
];
