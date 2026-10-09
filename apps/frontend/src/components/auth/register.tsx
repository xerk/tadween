'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
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
      <div className="tdw-auth-spinner">
        <LoadingComponent />
      </div>
    );
  }
  return (
    <RegisterAfter token={code} provider={provider?.toUpperCase() || 'LOCAL'} />
  );
}
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
              ? t('tdw_auth_register_finish_title', 'One last step')
              : t('tdw_auth_register_title', 'Create your account')
          }
          subtitle={
            isAfterProvider
              ? t(
                  'tdw_auth_register_finish_subtitle',
                  'Name your workspace and you are in.'
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
        <AuthSwitch
          prompt={t('tdw_auth_have_account', 'Already have an account?')}
          href="/auth/login"
          action={t('sign_in_1', 'Sign in')}
        />
      </form>
    </FormProvider>
  );
}
