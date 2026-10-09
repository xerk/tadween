'use client';
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ForgotReturnPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot-return.password.dto';
import {
  AuthField,
  AuthHeading,
  AuthNotice,
  AuthSubmit,
  AuthSwitch,
} from '@gitroom/frontend/components/tadween/auth/auth.parts';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
type Inputs = {
  password: string;
  repeatPassword: string;
  token: string;
};
export function ForgotReturn({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const t = useT();
  const [state, setState] = useState(false);
  const resolver = useMemo(() => {
    return classValidatorResolver(ForgotReturnPasswordDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
    mode: 'onChange',
    defaultValues: {
      token,
    },
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    const { reset } = await (
      await fetchData('/auth/forgot-return', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
        }),
      })
    ).json();
    // Tadween: only show the success state when the reset went through, so an
    // expired link keeps the form and shows the error under the password field
    if (!reset) {
      form.setError('password', {
        type: 'manual',
        message: t('password_reset_link_expired', 'Your password reset link has expired. Please try again.'),
      });
      setLoading(false);
      return false;
    }
    setState(true);
    setLoading(false);
  };
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <AuthHeading
          title={t('tdw_auth_new_password_title', 'Choose a new password')}
          subtitle={
            !state
              ? t(
                  'tdw_auth_new_password_subtitle',
                  'You will use it the next time you sign in.'
                )
              : undefined
          }
        />
        {!state ? (
          <div className="tdw-auth-form">
            <AuthField
              name="password"
              type="password"
              autoComplete="new-password"
              label={t('label_new_password', 'New Password')}
            />
            <AuthField
              name="repeatPassword"
              type="password"
              autoComplete="new-password"
              label={t('label_repeat_password', 'Repeat Password')}
            />
            <AuthSubmit loading={loading}>
              {t('change_password', 'Change Password')}
            </AuthSubmit>
          </div>
        ) : (
          <AuthNotice
            tone="success"
            title={t('tdw_auth_password_changed', 'Password changed')}
          >
            {t(
              'tdw_auth_password_changed_body',
              'You can now sign in with your new password.'
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
