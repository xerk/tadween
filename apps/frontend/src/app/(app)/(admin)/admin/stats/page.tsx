export const dynamic = 'force-dynamic';
import { AdminStatsComponent } from '@gitroom/frontend/components/admin/admin-stats.component';
import { AdminPage } from '@gitroom/frontend/components/tadween/admin/admin.shell';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Tadween' : 'Gitroom'} Admin Stats`,
  description: '',
};

// Postiz's stats screen (charts, date range) inside the console frame.
export default async function Page() {
  return (
    <AdminPage
      title="Usage stats"
      description="Posts, errors and connected channels per platform."
    >
      <div className="adm-legacy flex-col flex gap-[12px]">
        <AdminStatsComponent />
      </div>
    </AdminPage>
  );
}
