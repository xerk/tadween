import { Metadata } from 'next';
import { AdminFeaturesPage } from '@gitroom/frontend/components/tadween/admin/admin.features';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tadween Admin Features',
  description: '',
};

export default function Page() {
  return <AdminFeaturesPage />;
}
