import { readdirSync } from 'node:fs';
import path from 'node:path';
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

/** The tool pages under /features, in the order the menus and the overview list them.
    The AI agent has its own page at /ai-agent. */
export const FEATURE_SLUGS = ['calendar', 'board', 'composer', 'media-library', 'analytics', 'collaboration', 'auto-post', 'signatures-sets'] as const;
export type FeatureSlug = (typeof FEATURE_SLUGS)[number];

export const channelPath = (slug: string) => `${PATHS.channels}/${slug}`;
/** AI client pages sit at the top level (/chatgpt, /ar/chatgpt), like the networks' own names. */
export const clientPath = (slug: string) => `/${slug}`;

/** First path segments something else already answers: the pages above, the redirect in
    next.config.ts, generated files (og, sitemap, robots, icons), public/ and Next itself.
    lib/aiClients.ts refuses a client slug from this list, and the [client] routes also check
    the app and public folders at build time, so a client page can never shadow a route. */
export const RESERVED_SEGMENTS = [
  ...Object.values(PATHS).map((p) => p.slice(1)).filter(Boolean),
  'ar',
  'en',
  'developers',
  'og',
  'sitemap.xml',
  'robots.txt',
  'favicon.ico',
  'icon.svg',
  'apple-icon.png',
  'logo.svg',
  'product',
  'showcase',
  'api',
  '_next',
];

/** Fails the build when a client slug would take over a route, or two clients share one. */
export function assertClientSlugs(taken: string[] = []) {
  const reserved = new Set([...RESERVED_SEGMENTS, ...taken]);
  const seen = new Set<string>();
  for (const { slug } of AI_CLIENTS) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error(`AI client slug "${slug}" must be lowercase words joined by hyphens.`);
    if (reserved.has(slug)) throw new Error(`AI client slug "${slug}" collides with an existing route at /${slug}.`);
    if (seen.has(slug)) throw new Error(`AI client slug "${slug}" is listed twice.`);
    seen.add(slug);
  }
}
assertClientSlugs();

/** The static params of the [client] routes. Run at build time, it also checks every folder
    and file the app and public/ serve at the top level, so a page added later can't be
    shadowed by (or shadow) a client page without the build failing. */
export function clientStaticParams() {
  const top = (dir: string) => readdirSync(path.join(process.cwd(), dir)).map((name) => name.replace(/\.(tsx?|jsx?)$/, ''));
  const taken = [...top('src/app/(en)'), ...top('src/app/(ar)/ar'), ...top('src/app'), ...top('public')].filter((name) => !name.startsWith('[') && !name.startsWith('('));
  assertClientSlugs(taken);
  return AI_CLIENTS.map((c) => ({ client: c.slug }));
}
export const featurePath = (slug: FeatureSlug) => `${PATHS.features}/${slug}`;

/** The URL of a page in one language: English has no prefix, Arabic lives under /ar. */
export const localePath = (lang: Lang, path: string) => (lang === 'ar' ? `/ar${path}` : path || '/');

/** Every page, for the sitemap. */
export const ALL_PAGES: { path: string; priority: number }[] = [
  { path: PATHS.home, priority: 1 },
  { path: PATHS.pricing, priority: 0.9 },
  { path: PATHS.features, priority: 0.8 },
  { path: PATHS.agent, priority: 0.8 },
  ...FEATURE_SLUGS.map((slug) => ({ path: featurePath(slug), priority: 0.8 })),
  { path: PATHS.channels, priority: 0.8 },
  ...CHANNELS.map((c) => ({ path: channelPath(c.slug), priority: c.group === 'professional' ? 0.8 : 0.6 })),
  ...AI_CLIENTS.map((c) => ({ path: clientPath(c.slug), priority: 0.7 })),
];
