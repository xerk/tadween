'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ForgotPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot.password.dto';
import {
  AuthField,
  AuthHeading,
  AuthNotice,
  AuthSubmit,
  AuthSwitch,
} from '@gitroom/frontend/components/tadween/auth/auth.parts';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
type Inputs = {
  email: string;
};
export function Forgot() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState(false);
  const resolver = useMemo(() => {
    return classValidatorResolver(ForgotPasswordDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    await fetchData('/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        provider: 'LOCAL',
      }),
    });
    setState(true);
    setLoading(false);
  };
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <AuthHeading
          title={t('tdw_auth_forgot_title', 'Reset your password')}
          subtitle={
            !state
              ? t(
                  'tdw_auth_forgot_subtitle',
                  'Enter the email you sign in with and we will send you a reset link.'
                )
              : undefined
          }
        />
        {!state ? (
          <div className="tdw-auth-form">
            <AuthField
              name="email"
              type="email"
              autoComplete="email"
              label={t('label_email', 'Email')}
              placeholder={t('tdw_auth_email_placeholder', 'you@company.com')}
            />
            <AuthSubmit loading={loading}>
              {t('tdw_auth_send_link', 'Send reset link')}
            </AuthSubmit>
          </div>
        ) : (
          <AuthNotice
            tone="success"
            icon="mail"
            title={t('tdw_auth_check_inbox', 'Check your inbox')}
          >
            {t(
              'tdw_auth_check_inbox_body',
              'If an account uses that email, a reset link is on its way.'
            )}
          </AuthNotice>
        )}
        <AuthSwitch
          href="/auth/login"
          action={t('go_back_to_login', 'Go back to login')}
        />
      </form>
    </FormProvider>
  );
}
