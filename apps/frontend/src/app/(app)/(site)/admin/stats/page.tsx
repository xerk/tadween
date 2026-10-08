export const dynamic = 'force-dynamic';
import { AdminStatsComponent } from '@gitroom/frontend/components/admin/admin-stats.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Tadween' : 'Gitroom'} Admin Stats`,
  description: '',
};

export default async function Page() {
  return (
    <div className="pz-settings-body tdw-admin-legacy max-w-[1100px] flex-1 min-w-0 flex flex-col gap-[12px]">
      <AdminStatsComponent />
    </div>
  );
}
