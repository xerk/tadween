import { Metadata } from 'next';
import { AdminOrganizationsPage } from '@gitroom/frontend/components/tadween/admin/admin.organizations';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin Subscribers',
  description: '',
};

export default function Page() {
  return <AdminOrganizationsPage />;
}
