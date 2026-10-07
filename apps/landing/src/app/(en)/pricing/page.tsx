import { PricingPage } from '@/components/pages';
import { en } from '@/content/en';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, 'pricing');
export const revalidate = 3600;

export default function Pricing() {
  return <PricingPage t={en} />;
}
