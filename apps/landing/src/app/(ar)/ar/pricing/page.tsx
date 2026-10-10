import { PricingPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.pricing, title: ar.meta.pricingTitle, description: ar.meta.pricingDescription, og: 'pricing' });
// Static; when NEXT_PUBLIC_API_URL is set, plans are re-read at most hourly.
export const revalidate = 3600;

export default function ArabicPricing() {
  return <PricingPage t={ar} />;
}
