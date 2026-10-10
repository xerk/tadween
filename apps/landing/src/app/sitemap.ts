import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { ALL_PAGES, localePath } from '@/lib/routes';

// Each page exists in English and Arabic; every entry lists both (and x-default) as alternates.
export default function sitemap(): MetadataRoute.Sitemap {
  return ALL_PAGES.flatMap(({ path, priority }) => {
    const en = path ? `${SITE_URL}${path}` : SITE_URL; // the same form as the canonical link
    const ar = `${SITE_URL}${localePath('ar', path)}`;
    const languages = { en, ar, 'x-default': en };
    return [
      { url: en, changeFrequency: 'monthly' as const, priority, alternates: { languages } },
      { url: ar, changeFrequency: 'monthly' as const, priority, alternates: { languages } },
    ];
  });
}
