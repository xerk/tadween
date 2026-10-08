'use client';

import dynamic from 'next/dynamic';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { GithubProvider } from '@gitroom/frontend/components/auth/providers/github.provider';
import { GoogleProvider } from '@gitroom/frontend/components/auth/providers/google.provider';
import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { AppleProvider } from '@gitroom/frontend/components/auth/providers/apple.provider';
import { FarcasterProvider } from '@gitroom/frontend/components/auth/providers/farcaster.provider';
import { WalletUiProvider } from '@gitroom/frontend/components/auth/providers/placeholder/wallet.ui.provider';
import {
  AuthDivider,
  AuthProviders,
} from '@gitroom/frontend/components/tadween/auth/auth.parts';
import { useLoginProviders } from '@gitroom/frontend/components/tadween/instance/instance.settings';
const WalletProvider = dynamic(
  () => import('@gitroom/frontend/components/auth/providers/wallet.provider'),
  {
    ssr: false,
    loading: () => <WalletUiProvider />,
  }
);

// The social sign-in buttons above the email form, shared by sign-in and
// sign-up. The generic OIDC button shows when POSTIZ_GENERIC_OAUTH is on and,
// as in Postiz, replaces Google (an SSO-only instance stays SSO-only);
// otherwise Google shows when the backend has its credentials (public
// /instance/settings). The rest keep their own env switches. Without any
// button, no divider either.
export const SocialProviders = () => {
  const {
    isGeneral,
    genericOauth,
    neynarClientId,
    appleClientId,
    billingEnabled,
  } = useVariables();
  const isConfigured = useLoginProviders();
  const generic = isGeneral && genericOauth;
  const google = isGeneral && !generic && isConfigured('google');

  if (
    isGeneral &&
    !google &&
    !generic &&
    !appleClientId &&
    !neynarClientId &&
    !billingEnabled
  ) {
    return null;
  }

  return (
    <>
      <AuthProviders>
        {!isGeneral ? (
          <GithubProvider />
        ) : (
          <>
            {google && <GoogleProvider />}
            {generic && <OauthProvider />}
            {!!appleClientId && <AppleProvider />}
            {!!neynarClientId && <FarcasterProvider />}
            {billingEnabled && <WalletProvider />}
          </>
        )}
      </AuthProviders>
      <AuthDivider />
    </>
  );
};
