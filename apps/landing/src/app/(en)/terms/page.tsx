import { LegalPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.terms, title: en.legal.terms.metaTitle, description: en.legal.terms.metaDescription, og: 'terms' });

export default function Terms() {
  return <LegalPage t={en} page="terms" />;
}
