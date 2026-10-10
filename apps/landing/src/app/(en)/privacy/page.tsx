import { LegalPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.privacy, title: en.legal.privacy.metaTitle, description: en.legal.privacy.metaDescription, og: 'privacy' });

export default function Privacy() {
  return <LegalPage t={en} page="privacy" />;
}
