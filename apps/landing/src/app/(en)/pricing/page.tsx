import { PricingPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.pricing, title: en.meta.pricingTitle, description: en.meta.pricingDescription, og: 'pricing' });
// Prices come from Admin → Plans; re-read at most every minute (lib/plans.ts PLANS_REVALIDATE).
export const revalidate = 60;

export default function Pricing() {
  return <PricingPage t={en} />;
}
