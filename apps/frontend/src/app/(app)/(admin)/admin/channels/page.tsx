import { Metadata } from 'next';
import { AdminChannelsPage } from '@gitroom/frontend/components/tadween/admin/admin.channels';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin Channels',
  description: '',
};

export default function Page() {
  return <AdminChannelsPage />;
}
