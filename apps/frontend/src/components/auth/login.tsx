'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { GithubProvider } from '@gitroom/frontend/components/auth/providers/github.provider';
import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { GoogleProvider } from '@gitroom/frontend/components/auth/providers/google.provider';
import { AppleProvider } from '@gitroom/frontend/components/auth/providers/apple.provider';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { FarcasterProvider } from '@gitroom/frontend/components/auth/providers/farcaster.provider';
import WalletProvider from '@gitroom/frontend/components/auth/providers/wallet.provider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  AuthDivider,
  AuthField,
  AuthHeading,
  AuthLink,
  AuthNotice,
  AuthProviders,
  AuthSubmit,
  AuthSwitch,
} from '@gitroom/frontend/components/tadween/auth/auth.parts';
import { useInstanceSettings } from '@gitroom/frontend/components/tadween/instance/instance.settings';
type Inputs = {
  email: string;
  password: string;
  providerToken: '';
  provider: 'LOCAL';
};
export function Login() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [notActivated, setNotActivated] = useState(false);
  // Tadween: registration mode set in /admin
  const registrationMode = useInstanceSettings().data?.registration?.mode;
  const {
    isGeneral,
    neynarClientId,
    appleClientId,
    billingEnabled,
    genericOauth,
  } = useVariables();
  const resolver = useMemo(() => {
    return classValidatorResolver(LoginUserDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
    defaultValues: {
      providerToken: '',
      provider: 'LOCAL',
    },
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    setNotActivated(false);
    const login = await fetchData('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        provider: 'LOCAL',
      }),
    });
    if (login.status === 400) {
      const errorMessage = await login.text();
      if (errorMessage === 'User is not activated') {
        setNotActivated(true);
      } else {
        form.setError('email', {
          message: errorMessage,
        });
      }
      setLoading(false);
    }
  };
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <AuthHeading
          title={t('tdw_auth_login_title', 'Welcome back')}
          subtitle={t(
            'tdw_auth_login_subtitle',
            'Sign in to plan, write and schedule your posts.'
          )}
        />
        <AuthProviders>
          {isGeneral && genericOauth ? (
            <OauthProvider />
          ) : !isGeneral ? (
            <GithubProvider />
          ) : (
            <>
              <GoogleProvider />
              {!!appleClientId && <AppleProvider />}
              {!!neynarClientId && <FarcasterProvider />}
              {billingEnabled && <WalletProvider />}
            </>
          )}
        </AuthProviders>
        <AuthDivider />
        <div className="tdw-auth-form">
          <AuthField
            name="email"
            type="email"
            autoComplete="email"
            label={t('label_email', 'Email')}
            placeholder={t('tdw_auth_email_placeholder', 'you@company.com')}
          />
          <AuthField
            name="password"
            type="password"
            autoComplete="current-password"
            label={t('label_password', 'Password')}
            aside={
              <AuthLink href="/auth/forgot">
                {t('tdw_auth_forgot', 'Forgot password?')}
              </AuthLink>
            }
          />
          {notActivated && (
            <AuthNotice tone="warning">
              {t(
                'account_not_activated',
                'Your account is not activated yet. Please check your email for the activation link.'
              )}
              <br />
              <Link href="/auth/activate">
                {t('resend_activation_email', 'Resend Activation Email')}
              </Link>
            </AuthNotice>
          )}
          <AuthSubmit loading={loading}>{t('sign_in_1', 'Sign in')}</AuthSubmit>
        </div>
        {registrationMode === 'invite' ? (
          <p className="tdw-auth-switch">
            {t(
              'registration_invite_only',
              'Invite only. Ask your workspace admin for an invite link.'
            )}
          </p>
        ) : (
          <AuthSwitch
            prompt={t('tdw_auth_new_here', 'New to Tadween?')}
            href="/auth"
            action={t('tdw_auth_create_account', 'Create an account')}
          />
        )}
      </form>
    </FormProvider>
  );
}
