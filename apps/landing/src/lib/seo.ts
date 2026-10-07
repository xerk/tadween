import type { Metadata, Viewport } from 'next';
import type { Dict } from '@/content/types';
import { SITE_URL } from './config';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0c' },
  ],
};

/** Metadata for one page in one language, with hreflang alternates to its twin. */
export function pageMetadata(t: Dict, page: 'home' | 'pricing'): Metadata {
  const path = page === 'home' ? '' : '/pricing';
  const en = path || '/';
  const ar = `/ar${path}`;
  const title = page === 'home' ? t.meta.title : t.meta.pricingTitle;
  const description = page === 'home' ? t.meta.description : t.meta.pricingDescription;
  const url = t.lang === 'ar' ? ar : en;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: 'Tadween',
    alternates: { canonical: url, languages: { en, ar, 'x-default': en } },
    openGraph: {
      type: 'website',
      siteName: 'Tadween',
      title,
      description,
      url,
      locale: t.meta.ogLocale,
      alternateLocale: t.lang === 'ar' ? ['en_US'] : ['ar_EG'],
      images: [{ url: '/og.png', width: 1200, height: 630, alt: t.meta.title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og.png'] },
    formatDetection: { telephone: false },
  };
}
