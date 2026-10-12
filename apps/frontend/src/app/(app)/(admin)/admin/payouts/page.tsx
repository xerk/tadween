import { Metadata } from 'next';
import { AdminPayoutsPage } from '@gitroom/frontend/components/tadween/admin/admin.payouts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin Payouts',
  description: '',
};

export default function Page() {
  return <AdminPayoutsPage />;
}
