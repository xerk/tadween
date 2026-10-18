import { Metadata } from 'next';
import { AdminAccessPage } from '@gitroom/frontend/components/tadween/admin/admin.access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin Free plan',
  description: '',
};

export default function Page() {
  return <AdminAccessPage />;
}
