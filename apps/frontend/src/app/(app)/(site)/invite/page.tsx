export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { InviteEarnPage } from '@gitroom/frontend/components/tadween/referral/invite.earn';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Tadween' : 'Gitroom'} Invite & earn`,
  description: '',
};
export default async function Page() {
  return <InviteEarnPage />;
}
