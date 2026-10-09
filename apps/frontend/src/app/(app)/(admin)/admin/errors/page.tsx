export const dynamic = 'force-dynamic';
import { AdminErrorsPage } from '@gitroom/frontend/components/tadween/admin/admin.errors';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Tadween' : 'Gitroom'} Admin Errors`,
  description: '',
};

export default async function Page() {
  return <AdminErrorsPage />;
}
