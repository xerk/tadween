import { DevelopersPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.developers, ...en.meta.developers, og: 'developers' });

export default function Developers() {
  return <DevelopersPage t={en} />;
}
