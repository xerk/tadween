import { LegalPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.terms, title: ar.legal.terms.metaTitle, description: ar.legal.terms.metaDescription, og: 'terms' });

export default function ArabicTerms() {
  return <LegalPage t={ar} page="terms" />;
}
