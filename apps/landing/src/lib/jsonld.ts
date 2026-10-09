import type { Dict, Faq } from '@/content/types';
import { SITE_URL } from './config';
import type { PlanView } from './plans';
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

export function softwareApplication(t: Dict, plans: PlanView[]) {
  const prices = plans.map((p) => p.usd.monthly);
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
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: plans.length,
    },
  };
}

/** Each plan as an Offer at its monthly USD price. */
export function product(t: Dict, plans: PlanView[]) {
  const url = abs(localePath(t.lang, '/pricing'));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Tadween',
    description: t.meta.pricingDescription,
    brand: { '@type': 'Brand', name: 'Tadween' },
    image: `${SITE_URL}/og/pricing.png`,
    url,
    offers: plans.map((p) => ({
      '@type': 'Offer',
      name: t.pricing.plans.find((c) => c.key === p.key)?.name ?? p.name ?? p.key,
      price: p.usd.monthly,
      priceCurrency: 'USD',
      url,
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: p.usd.monthly,
        priceCurrency: 'USD',
        referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
      },
    })),
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
