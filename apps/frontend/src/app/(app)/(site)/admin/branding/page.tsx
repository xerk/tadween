import { Metadata } from 'next';
import { AdminBrandingPage } from '@gitroom/frontend/components/tadween/admin/admin.branding';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin Branding',
  description: '',
};

export default function Page() {
  return <AdminBrandingPage />;
}
