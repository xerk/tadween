export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { TadweenAnalytics } from '@gitroom/frontend/components/tadween/analytics/analytics.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Tadween' : 'Gitroom'} Analytics`,
  description: '',
};
export default async function Index() {
  return <TadweenAnalytics />;
}
