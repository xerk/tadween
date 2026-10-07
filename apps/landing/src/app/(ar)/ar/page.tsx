import { LandingPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, 'home');
export const revalidate = 3600;

export default function ArabicHome() {
  return <LandingPage t={ar} />;
}
