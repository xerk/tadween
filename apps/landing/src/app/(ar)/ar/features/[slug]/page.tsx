import { FeaturePage } from '@/components/pages';
import { ar } from '@/content/ar';
import { FEATURE_SLUGS, featurePath, type FeatureSlug } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

// One page per tool in FEATURE_SLUGS; anything else is a 404.
export const dynamicParams = false;
export const generateStaticParams = () => FEATURE_SLUGS.map((slug) => ({ slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: FeatureSlug }> }) {
  const { slug } = await params;
  return pageMetadata(ar, { path: featurePath(slug), ...ar.features[slug].meta, og: `feature-${slug}` });
}

export default async function ArabicFeature({ params }: { params: Promise<{ slug: FeatureSlug }> }) {
  const { slug } = await params;
  return <FeaturePage t={ar} slug={slug} />;
}
