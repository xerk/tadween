import { FeaturesPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.features, ...ar.meta.features, og: 'features' });

export default function ArabicFeatures() {
  return <FeaturesPage t={ar} />;
}
