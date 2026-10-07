import { PricingPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, 'pricing');
export const revalidate = 3600;

export default function ArabicPricing() {
  return <PricingPage t={ar} />;
}
