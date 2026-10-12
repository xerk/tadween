import { LegalPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.privacy, title: ar.legal.privacy.metaTitle, description: ar.legal.privacy.metaDescription, og: 'privacy' });

export default function ArabicPrivacy() {
  return <LegalPage t={ar} page="privacy" />;
}
