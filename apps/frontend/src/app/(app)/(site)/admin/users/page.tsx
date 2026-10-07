import { Metadata } from 'next';
import { AdminUsersPage } from '@gitroom/frontend/components/tadween/admin/admin.users';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin Users',
  description: '',
};

export default function Page() {
  return <AdminUsersPage />;
}
