import type { Dict, Faq } from '@/content/types';
import { SITE_URL } from './config';
import { localePath } from './routes';

// schema.org objects for <script type="application/ld+json">. Only facts the page itself
// shows go in here: no ratings, reviews or counts that don't exist.

const abs = (path: string) => (path === '/' ? SITE_URL : `${SITE_URL}${path}`);
const ORG_ID = `${SITE_URL}/#organization`;

export function organization() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Tadween',
    alternateName: 'تدوين',
    url: SITE_URL,
    logo: `${SITE_URL}/apple-icon.png`,
  };
}

/** No offers: the site shows each visitor one price in their own currency, so structured
    data carries no prices. */
export function softwareApplication(t: Dict) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Tadween',
    url: abs(localePath(t.lang, '')),
    description: t.meta.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: ['en', 'ar'],
    publisher: { '@id': ORG_ID },
  };
}

export function faqPage(items: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.title,
      acceptedAnswer: { '@type': 'Answer', text: f.content },
    })),
  };
}

/** `path` is the page's own URL path (already prefixed with /ar for Arabic). */
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}
