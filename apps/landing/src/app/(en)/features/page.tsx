import { FeaturesPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.features, ...en.meta.features, og: 'features' });

export default function Features() {
  return <FeaturesPage t={en} />;
}
