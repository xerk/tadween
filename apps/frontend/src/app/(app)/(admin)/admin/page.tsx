import { Metadata } from 'next';
import { AdminOverviewPage } from '@gitroom/frontend/components/tadween/admin/admin.overview';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin',
  description: '',
};

export default function Page() {
  return <AdminOverviewPage />;
}
