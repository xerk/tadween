import { LegalPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.refund, title: en.legal.refund.metaTitle, description: en.legal.refund.metaDescription, og: 'refund' });

export default function Refund() {
  return <LegalPage t={en} page="refund" />;
}
