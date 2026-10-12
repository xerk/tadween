import { LegalPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.refund, title: ar.legal.refund.metaTitle, description: ar.legal.refund.metaDescription, og: 'refund' });

export default function ArabicRefund() {
  return <LegalPage t={ar} page="refund" />;
}
