import { LandingPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.home, title: ar.meta.title, description: ar.meta.description, og: 'home' });
// Prices come from Admin → Plans; re-read at most every minute (lib/plans.ts PLANS_REVALIDATE).
export const revalidate = 60;

export default function ArabicHome() {
  return <LandingPage t={ar} />;
}
