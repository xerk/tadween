import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { AdminLayoutComponent } from '@gitroom/frontend/components/tadween/admin/admin.layout';

export const dynamic = 'force-dynamic';

// Super-admin console, outside the customer app's (site) layout so it has its
// own full-screen shell. The backend enforces access on every /admin API route
// (403 for anyone who isn't a super admin); this redirect only keeps other
// people from seeing an empty console.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const self = await internalFetch('/user/self')
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  if (!self?.admin) {
    redirect('/launches');
  }

  return <AdminLayoutComponent>{children}</AdminLayoutComponent>;
}
