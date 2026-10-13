import { Metadata } from 'next';
import { AdminPartnersPage } from '@gitroom/frontend/components/tadween/admin/admin.partners';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin Partners',
  description: '',
};

export default function Page() {
  return <AdminPartnersPage />;
}
