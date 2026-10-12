'use client';

import { useCallback } from 'react';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { AuthProviderButton } from '@gitroom/frontend/components/tadween/auth/auth.parts';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const OauthProvider = () => {
  const fetch = useFetch();
  const { oauthLogoUrl, oauthDisplayName } = useVariables();
  const t = useT();
  const gotoLogin = useCallback(async () => {
    try {
      const response = await fetch('/auth/oauth/GENERIC');
      if (!response.ok) {
        throw new Error(
          `Login link request failed with status ${response.status}`
        );
      }
      const link = await response.text();
      window.location.href = link;
    } catch (error) {
      console.error('Failed to get generic oauth login link:', error);
    }
  }, []);
  return (
    <AuthProviderButton
      onClick={gotoLogin}
      label={t('tdw_auth_continue_with', 'Continue with {{provider}}', {
        provider: oauthDisplayName || 'OAuth',
      })}
      mark={
        <SafeImage
          src={oauthLogoUrl || '/icons/generic-oauth.svg'}
          alt=""
          width={20}
          height={20}
        />
      }
    />
  );
};
