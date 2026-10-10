import type { Lang } from '@/content/types';
import { AI_CLIENTS } from './aiClients';
import { CHANNELS } from './channels';

/** Paths of the pages that exist in both languages, without the /ar prefix. */
export const PATHS = {
  home: '',
  features: '/features',
  channels: '/channels',
  agent: '/ai-agent',
  pricing: '/pricing',
} as const;

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
  ...CHANNELS.map((c) => ({ path: channelPath(c.slug), priority: c.group === 'professional' ? 0.8 : 0.6 })),
  ...AI_CLIENTS.map((c) => ({ path: clientPath(c.slug), priority: 0.7 })),
];
