import { PricingPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.pricing, title: ar.meta.pricingTitle, description: ar.meta.pricingDescription, og: 'pricing' });
// Prices come from Admin → Plans; re-read at most every minute (lib/plans.ts PLANS_REVALIDATE).
export const revalidate = 60;

export default function ArabicPricing() {
  return <PricingPage t={ar} />;
}
