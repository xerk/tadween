import { Metadata } from 'next';
import { AdminApiPage } from '@gitroom/frontend/components/tadween/admin/admin.api.page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin API',
  description: '',
};

export default function Page() {
  return <AdminApiPage />;
}
