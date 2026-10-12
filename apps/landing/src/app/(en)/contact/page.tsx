import { LegalPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.contact, title: en.legal.contact.metaTitle, description: en.legal.contact.metaDescription, og: 'contact' });

export default function Contact() {
  return <LegalPage t={en} page="contact" />;
}
