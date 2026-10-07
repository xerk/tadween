'use client';

import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import {
  AuthDivider,
  AuthProviders,
} from '@gitroom/frontend/components/tadween/auth/auth.parts';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const LoginWithOidc = () => {
  const { isGeneral, genericOauth } = useVariables();

  if (!(isGeneral && genericOauth)) {
    return null;
  }

  return (
    <>
      <AuthProviders>
        <OauthProvider />
      </AuthProviders>
      <AuthDivider />
    </>
  );
};
