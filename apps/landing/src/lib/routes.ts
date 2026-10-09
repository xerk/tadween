import type { Lang } from '@/content/types';
import { CHANNELS } from './channels';

/** Paths of the pages that exist in both languages, without the /ar prefix. */
export const PATHS = {
  home: '',
  features: '/features',
  channels: '/channels',
  agent: '/ai-agent',
  developers: '/developers',
  pricing: '/pricing',
} as const;

export const channelPath = (slug: string) => `${PATHS.channels}/${slug}`;

/** The URL of a page in one language: English has no prefix, Arabic lives under /ar. */
export const localePath = (lang: Lang, path: string) => (lang === 'ar' ? `/ar${path}` : path || '/');

/** Every page, for the sitemap. */
export const ALL_PAGES: { path: string; priority: number }[] = [
  { path: PATHS.home, priority: 1 },
  { path: PATHS.pricing, priority: 0.9 },
  { path: PATHS.features, priority: 0.8 },
  { path: PATHS.agent, priority: 0.8 },
  { path: PATHS.channels, priority: 0.8 },
  { path: PATHS.developers, priority: 0.6 },
  ...CHANNELS.map((c) => ({ path: channelPath(c.slug), priority: c.group === 'professional' ? 0.8 : 0.6 })),
];
