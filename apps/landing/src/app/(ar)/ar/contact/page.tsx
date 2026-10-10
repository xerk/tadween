import { LegalPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.contact, title: ar.legal.contact.metaTitle, description: ar.legal.contact.metaDescription, og: 'contact' });

export default function ArabicContact() {
  return <LegalPage t={ar} page="contact" />;
}
