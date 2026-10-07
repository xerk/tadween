import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
export const dynamic = 'force-dynamic';
import { Register } from '@gitroom/frontend/components/auth/register';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import Link from 'next/link';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import { LoginWithOidc } from '@gitroom/frontend/components/auth/login.with.oidc';
import { cookies } from 'next/headers';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Tadween' : 'Gitroom'} Register`,
  description: '',
};
export default async function Auth(params: {searchParams: Promise<{provider: string}>}) {
  const t = await getT();
  // Tadween: registration mode comes from the super-admin console (env vars
  // are the fallback), so always ask the backend instead of reading env here.
  // In invite-only mode a pending invite (the `org` cookie) may still register.
  const registration: { register: boolean; mode?: string } =
    await internalFetch('/auth/can-register')
      .then((res) => res.json())
      .catch(() => ({ register: process.env.DISABLE_REGISTRATION !== 'true' }));
  const hasInvite = !!(await cookies()).get('org')?.value;
  const canRegister =
    registration.register || (registration.mode === 'invite' && hasInvite);
  if (!canRegister && !(await params?.searchParams)?.provider) {
    return (
      <>
        <LoginWithOidc />
        <div className="text-center">
          {registration.mode === 'invite'
            ? t(
                'registration_invite_only',
                'Invite only. Ask your workspace admin for an invite link.'
              )
            : t('registration_is_disabled', 'Registration is disabled')}
          <br />
          <Link className="underline hover:font-bold" href="/auth/login">
            {t('login_instead', 'Login instead')}
          </Link>
        </div>
      </>
    );
  }
  return <Register />;
}
