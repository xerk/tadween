'use client';

import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  AuthField,
  AuthHeading,
  AuthNotice,
  AuthSubmit,
  AuthSwitch,
} from '@gitroom/frontend/components/tadween/auth/auth.parts';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type ResendInputs = {
  email: string;
};

type ResendStatus = 'idle' | 'sent' | 'already_activated';

const COOLDOWN_SECONDS = 60;

export function Activate() {
  const t = useT();
  const fetch = useFetch();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ResendStatus>('idle');
  const [cooldown, setCooldown] = useState(0);
  const form = useForm<ResendInputs>();

  useEffect(() => {
    if (cooldown <= 0) return;
    
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const resetToForm = useCallback(() => {
    setStatus('idle');
    setCooldown(COOLDOWN_SECONDS);
  }, []);

  const onSubmit: SubmitHandler<ResendInputs> = async (data) => {
    setLoading(true);
    try {
      const response = await fetch('/auth/resend-activation', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        setStatus('sent');
        setCooldown(COOLDOWN_SECONDS);
      } else if (result.message === 'Account is already activated') {
        setStatus('already_activated');
      } else {
        form.setError('email', {
          message: result.message || t('failed_to_resend', 'Failed to resend activation email'),
        });
      }
    } catch (e) {
      form.setError('email', {
        message: t('error_occurred', 'An error occurred. Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AuthHeading
        title={t('tdw_auth_activate_title', 'Check your email')}
        subtitle={
          <>
            {t('thank_you_for_registering', 'Thank you for registering!')}{' '}
            {t(
              'please_check_your_email_to_activate_your_account',
              'Please check your email to activate your account.'
            )}
          </>
        }
      />
      <div className="tdw-auth-section">
        <h2>{t('didnt_receive_email', "Didn't receive the email?")}</h2>
        {status === 'sent' ? (
          <>
            <AuthNotice tone="success" icon="mail">
              {t(
                'activation_email_sent',
                'Activation email has been sent! Please check your inbox.'
              )}
            </AuthNotice>
            {cooldown > 0 ? (
              <p className="tdw-auth-hint">
                {t('resend_available_in', 'You can resend in')} {cooldown}s
              </p>
            ) : (
              <AuthSubmit type="button" onClick={resetToForm}>
                {t('send_again', 'Send Again')}
              </AuthSubmit>
            )}
          </>
        ) : status === 'already_activated' ? (
          <>
            <AuthNotice tone="success">
              {t(
                'account_already_activated',
                'Great news! Your account is already activated.'
              )}
            </AuthNotice>
            <Link href="/auth/login" className="pz-btn pz-btn-primary tdw-auth-submit">
              {t('go_to_login', 'Go to Login')}
            </Link>
          </>
        ) : (
          <FormProvider {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit(onSubmit)}
              className="tdw-auth-form"
            >
              <AuthField
                name="email"
                type="email"
                autoComplete="email"
                required={t('tdw_auth_email_required', 'Enter your email address.')}
                label={t('label_email', 'Email')}
                placeholder={t('tdw_auth_email_placeholder', 'you@company.com')}
              />
              <AuthSubmit loading={loading} disabled={cooldown > 0}>
                {cooldown > 0
                  ? `${t('resend_available_in', 'You can resend in')} ${cooldown}s`
                  : t('resend_activation_email', 'Resend Activation Email')}
              </AuthSubmit>
            </form>
          </FormProvider>
        )}
      </div>
      {status !== 'already_activated' && (
        <AuthSwitch
          prompt={t('already_activated', 'Already activated?')}
          href="/auth/login"
          action={t('sign_in_1', 'Sign in')}
        />
      )}
    </div>
  );
}
