import { Metadata } from 'next';
import { AdminPlansPage } from '@gitroom/frontend/components/tadween/admin/admin.plans';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin Plans',
  description: '',
};

export default function Page() {
  return <AdminPlansPage />;
}
