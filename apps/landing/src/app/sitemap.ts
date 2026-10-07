import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

// Each page exists in English and Arabic; every entry lists both as alternates.
const PAGES = [
  { en: '/', ar: '/ar', priority: 1 },
  { en: '/pricing', ar: '/ar/pricing', priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap(({ en, ar, priority }) => {
    const languages = { en: `${SITE_URL}${en}`, ar: `${SITE_URL}${ar}` };
    return [
      { url: languages.en, changeFrequency: 'monthly' as const, priority, alternates: { languages } },
      { url: languages.ar, changeFrequency: 'monthly' as const, priority, alternates: { languages } },
    ];
  });
}
