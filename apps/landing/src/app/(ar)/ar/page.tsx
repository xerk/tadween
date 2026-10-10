import { LandingPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.home, title: ar.meta.title, description: ar.meta.description, og: 'home' });
// Static; when NEXT_PUBLIC_API_URL is set, plans are re-read at most hourly.
export const revalidate = 3600;

export default function ArabicHome() {
  return <LandingPage t={ar} />;
}
