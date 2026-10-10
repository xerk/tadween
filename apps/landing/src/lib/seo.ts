import type { Metadata, Viewport } from 'next';
import type { Dict } from '@/content/types';
import { SITE_URL } from './config';
import { localePath } from './routes';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0c' },
  ],
};

/** Metadata for one page in one language: canonical URL, hreflang alternates to its twin,
    Open Graph and Twitter cards. `path` has no language prefix ('' is the home page) and
    `og` names the generated card in app/og/[card]. */
export function pageMetadata(t: Dict, { path, title, description, og }: { path: string; title: string; description: string; og: string }): Metadata {
  const en = localePath('en', path);
  const ar = localePath('ar', path);
  const url = t.lang === 'ar' ? ar : en;
  const image = `/og/${og}.png`;
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
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    formatDetection: { telephone: false },
  };
}
