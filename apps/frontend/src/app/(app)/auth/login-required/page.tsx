import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import { AuthHeading } from '@gitroom/frontend/components/tadween/auth/auth.parts';
import Link from 'next/link';

export default async function LoginRequiredPage() {
  const t = await getT();
  return (
    <>
      <AuthHeading
        title={t('tdw_auth_login_required_title', 'Sign in to continue')}
        subtitle={t(
          'tdw_auth_login_required_subtitle',
          'Login to use the wizard to generate API code'
        )}
      />
      <Link href="/auth/login" className="pz-btn pz-btn-primary tdw-auth-submit">
        {t('sign_in_1', 'Sign in')}
      </Link>
    </>
  );
}
