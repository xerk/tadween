import { Metadata } from 'next';
import { AdminReferralsPage } from '@gitroom/frontend/components/tadween/admin/admin.referrals';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin Referrals',
  description: '',
};

export default function Page() {
  return <AdminReferralsPage />;
}
