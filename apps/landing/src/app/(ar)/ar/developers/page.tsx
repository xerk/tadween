import { DevelopersPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.developers, ...ar.meta.developers, og: 'developers' });

export default function ArabicDevelopers() {
  return <DevelopersPage t={ar} />;
}
