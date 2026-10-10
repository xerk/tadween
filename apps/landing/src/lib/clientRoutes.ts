import { readdirSync } from 'node:fs';
import path from 'node:path';
import { aiClientsAr } from '@/content/aiClients.ar';
import { aiClientsEn } from '@/content/aiClients.en';
import { AI_CLIENTS } from './aiClients';
import { retiredRedirects } from './redirects';

// Build-time checks for the top-level [client] routes. Server only: it reads the app and
// public folders, so keep it out of anything a client component imports.

/** First path segments the folder scan below can't see: generated files and paths Next or a
    proxy may answer. */
const RESERVED_SEGMENTS = ['sitemap.xml', 'robots.txt', 'ar', 'en', 'api', '_next'];

/** First path segments the redirects in lib/redirects.ts answer (a redirect would hide a page). */
const redirectSegments = () => retiredRedirects().map((r) => r.source.split('/')[1]);

/** Every top-level name the app and public/ serve, in both languages. */
const takenSegments = () => {
  const top = (dir: string) => readdirSync(path.join(process.cwd(), dir)).map((name) => name.replace(/\.(tsx?|jsx?)$/, ''));
  return [...top('src/app/(en)'), ...top('src/app/(ar)/ar'), ...top('src/app'), ...top('public')].filter((name) => !name.startsWith('[') && !name.startsWith('('));
};

/** The static params of the [client] routes. Fails the build when a client slug would take
    over another route, when two clients share a slug, or when a language's copy doesn't have
    one line per step for every method in lib/aiClients.ts. */
export function clientStaticParams() {
  const reserved = new Set([...RESERVED_SEGMENTS, ...redirectSegments(), ...takenSegments()]);
  const seen = new Set<string>();
  for (const { slug, methods } of AI_CLIENTS) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error(`AI client slug "${slug}" must be lowercase words joined by hyphens.`);
    if (reserved.has(slug)) throw new Error(`AI client slug "${slug}" collides with an existing route at /${slug}.`);
    if (seen.has(slug)) throw new Error(`AI client slug "${slug}" is listed twice.`);
    seen.add(slug);
    for (const [lang, dict] of [['en', aiClientsEn], ['ar', aiClientsAr]] as const) {
      for (const m of methods) {
        if (dict.items[slug]?.methods[m.auth]?.steps.length !== m.steps.length) throw new Error(`The ${lang} copy for ${slug} (${m.auth}) needs ${m.steps.length} steps.`);
      }
    }
  }
  return AI_CLIENTS.map((c) => ({ client: c.slug }));
}
