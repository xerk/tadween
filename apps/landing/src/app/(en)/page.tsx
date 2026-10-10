import { LandingPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.home, title: en.meta.title, description: en.meta.description, og: 'home' });
// Static; when NEXT_PUBLIC_API_URL is set, plans are re-read at most hourly.
export const revalidate = 3600;

export default function Home() {
  return <LandingPage t={en} />;
}
