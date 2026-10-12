import { LandingPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.home, title: en.meta.title, description: en.meta.description, og: 'home' });
// Prices come from Admin → Plans; re-read at most every minute (lib/plans.ts PLANS_REVALIDATE).
export const revalidate = 60;

export default function Home() {
  return <LandingPage t={en} />;
}
