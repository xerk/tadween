export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { PartnersPage } from '@gitroom/frontend/components/tadween/referral/partners.page';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Tadween' : 'Gitroom'} Partners`,
  description: '',
};
export default async function Page() {
  return <PartnersPage />;
}
