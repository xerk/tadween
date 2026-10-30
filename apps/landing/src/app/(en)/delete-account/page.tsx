import { LegalPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.deleteAccount, title: en.legal.deleteAccount.metaTitle, description: en.legal.deleteAccount.metaDescription, og: 'delete-account' });

export default function DeleteAccount() {
  return <LegalPage t={en} page="deleteAccount" />;
}
