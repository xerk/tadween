'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useTrack } from '@gitroom/react/helpers/use.track';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';
import { SocialProviders } from '@gitroom/frontend/components/auth/providers/social.providers';
import {
  AuthField,
  AuthHeading,
  AuthLegal,
  AuthLoading,
  AuthSubmit,
  AuthSwitch,
} from '@gitroom/frontend/components/tadween/auth/auth.parts';
type Inputs = {
  email: string;
  password: string;
  company: string;
  providerToken: string;
  provider: string;
};
export function Register() {
  const t = useT();
  const getQuery = useSearchParams();
  const fetch = useFetch();
  const [provider] = useState(getQuery?.get('provider')?.toUpperCase());
  const [code, setCode] = useState(getQuery?.get('code') || '');
  const [state] = useState(getQuery?.get('state') || '');
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (provider && code) {
      load();
    }
  }, []);
  const load = useCallback(async () => {
    const { token } = await (
      await fetch(`/auth/oauth/${provider?.toUpperCase() || 'LOCAL'}/exists`, {
        method: 'POST',
        body: JSON.stringify({
          code,
          state,
        }),
      })
    ).json();
    if (token) {
      setCode(token);
      setShow(true);
    }
  }, [provider, code]);
  if (!code && !provider) {
    return <RegisterAfter token="" provider="LOCAL" />;
  }
  if (!show) {
    return (
      <AuthLoading
        title={t('tdw_auth_loading_title', 'Setting up your account…')}
        subtitle={t('tdw_auth_loading_subtitle', 'This takes a few seconds.')}
      />
    );
  }
  return (
    <RegisterAfter token={code} provider={provider?.toUpperCase() || 'LOCAL'} />
  );
}
// Tadween partners program: a referral code from ?ref= on this page or the
// `tdw_ref` cookie the website (or this page) set; the newest one wins, and
// the cookie survives the round trip through a social sign-in
const REF_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
const useReferralCode = () => {
  const query = useSearchParams();
  const [saved, setSaved] = useCookie('tdw_ref', '');
  const fromUrl = query?.get('ref') || '';
  useEffect(() => {
    if (REF_PATTERN.test(fromUrl)) {
      setSaved(fromUrl.toUpperCase(), { days: 60, SameSite: 'Lax' });
    }
  }, [fromUrl]);
  const code = (REF_PATTERN.test(fromUrl) ? fromUrl : saved || '').toUpperCase();
  return REF_PATTERN.test(code) ? code : undefined;
};

function getHelpfulReasonForRegistrationFailure(httpCode: number) {
  switch (httpCode) {
    case 400:
      return 'Email already exists';
    case 404:
      return 'Your browser got a 404 when trying to contact the API, the most likely reasons for this are the NEXT_PUBLIC_BACKEND_URL is set incorrectly, or the backend is not running.';
  }
  return 'Unhandled error: ' + httpCode;
}
export function RegisterAfter({
  token,
  provider,
}: {
  token: string;
  provider: string;
}) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const fireEvents = useFireEvents();
  const track = useTrack();
  const [datafast_visitor_id] = useCookie('datafast_visitor_id');
  const ref = useReferralCode();
  const isAfterProvider = useMemo(() => {
    return !!token && !!provider;
  }, [token, provider]);
  const resolver = useMemo(() => {
    return classValidatorResolver(CreateOrgUserDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
    defaultValues: {
      providerToken: token,
      provider: provider,
    },
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    await fetchData('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        datafast_visitor_id,
        ...(ref ? { ref } : {}),
      }),
    })
      .then(async (response) => {
        setLoading(false);
        if (response.status === 200) {
          fireEvents('register');
          return track(TrackEnum.CompleteRegistration).then(() => {
            if (response.headers.get('activate') === 'true') {
              router.push('/auth/activate');
            } else {
              router.push('/auth/login');
            }
          });
        } else {
          form.setError('email', {
            message: await response.text(),
          });
        }
      })
      .catch((e) => {
        form.setError('email', {
          message:
            'General error: ' +
            e.toString() +
            '. Please check your browser console.',
        });
      });
  };
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <AuthHeading
          title={
            isAfterProvider
              ? t('tdw_auth_register_finish_title', 'Name your workspace')
              : t('tdw_auth_register_title', 'Create your account')
          }
          subtitle={
            isAfterProvider
              ? t(
                  'tdw_auth_register_finish_subtitle',
                  'Your posts, channels and team live here. It’s the last step before you’re in.'
                )
              : t(
                  'tdw_auth_register_subtitle',
                  'Plan, preview and schedule your LinkedIn posts in one place.'
                )
          }
        />
        {!isAfterProvider && <SocialProviders />}
        <div className="tdw-auth-form">
          {!isAfterProvider && (
            <>
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
                autoComplete="new-password"
                label={t('label_password', 'Password')}
              />
            </>
          )}
          <AuthField
            name="company"
            type="text"
            autoComplete="organization"
            label={t('tdw_auth_workspace', 'Workspace name')}
            placeholder={t('tdw_auth_workspace_placeholder', 'Your company or your name')}
          />
          <AuthLegal />
          <AuthSubmit loading={loading}>
            {t('create_account', 'Create Account')}
          </AuthSubmit>
        </div>
        {!isAfterProvider && (
          <AuthSwitch
            prompt={t('tdw_auth_have_account', 'Already have an account?')}
            href="/auth/login"
            action={t('sign_in_1', 'Sign in')}
          />
        )}
      </form>
    </FormProvider>
  );
}
