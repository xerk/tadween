export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { TodayComponent } from '@gitroom/frontend/components/tadween/today/today.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Tadween' : 'Gitroom'} — Today`,
  description: '',
};
export default async function Index() {
  return <TodayComponent />;
}
