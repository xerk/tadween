import { LegalPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.deleteAccount, title: ar.legal.deleteAccount.metaTitle, description: ar.legal.deleteAccount.metaDescription, og: 'delete-account' });

export default function ArabicDeleteAccount() {
  return <LegalPage t={ar} page="deleteAccount" />;
}
