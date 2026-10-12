'use client';

import { FC, FormEvent, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button, Input } from '@gitroom/frontend/components/tadween/ui';

export const OAuthSelfHosted: FC<{
  appName: string;
  // clients that read the email from userinfo (ChatGPT) need one
  askEmail: boolean;
  params: {
    client_id: string | null;
    state: string | null;
    redirect_uri: string | null;
    code_challenge: string | null;
    code_challenge_method: string | null;
    resource: string | null;
  };
  onBack: () => void;
}> = ({ appName, askEmail, params, onBack }) => {
  const t = useT();
  const fetch = useFetch();
  const [instanceUrl, setInstanceUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const connect = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError('');
      try {
        const response = await fetch('/oauth/authorize/self-hosted', {
          method: 'POST',
          body: JSON.stringify({
            client_id: params.client_id,
            state: params.state,
            ...(params.redirect_uri
              ? { redirect_uri: params.redirect_uri }
              : {}),
            ...(params.code_challenge
              ? { code_challenge: params.code_challenge }
              : {}),
            ...(params.code_challenge_method
              ? { code_challenge_method: params.code_challenge_method }
              : {}),
            ...(params.resource ? { resource: params.resource } : {}),
            instance_url: instanceUrl.trim(),
            ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
            ...(askEmail && email.trim() ? { email: email.trim() } : {}),
          }),
        });
        const data = await response.json();
        if (data.redirect) {
          window.location.href = data.redirect;
          return;
        }

        setError(
          response.status === 429
            ? t('tdw_oauth_sh_too_many', 'Too many attempts. Try again later.')
            : (Array.isArray(data.message) ? data.message[0] : data.message) ||
                t('tdw_oauth_sh_failed', 'Could not connect to your instance.')
        );
      } catch {
        setError(
          t('tdw_oauth_sh_failed', 'Could not connect to your instance.')
        );
      }
      setSubmitting(false);
    },
    [params, instanceUrl, apiKey, email, askEmail]
  );

  return (
    <form onSubmit={connect} className="tdw-consent-form">
      <div className="tdw-consent-scopes">
        <h2>{t('tdw_oauth_use_self_hosted', 'Use a self-hosted instance')}</h2>
        <p className="tdw-consent-text">
          {t(
            'tdw_oauth_sh_intro',
            '{{app}} will work with your own instance. This server relays its requests, and your API key is stored encrypted.',
            { app: appName, interpolation: { escapeValue: false } }
          )}
        </p>
      </div>

      {/* plain text fields: a password field makes browsers autofill the
          saved login (email + password) into this form */}
      <Input
        name="instance_url"
        label={t('tdw_oauth_sh_url', 'Instance URL')}
        value={instanceUrl}
        onChange={(e) => setInstanceUrl(e.target.value)}
        placeholder="https://app.example.com"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
      />

      <Input
        name="api_key"
        label={t('tdw_oauth_sh_key', 'API key')}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={t(
          'tdw_oauth_sh_key_placeholder',
          'Settings > Developers on your instance'
        )}
        hint={t(
          'tdw_oauth_sh_key_hint',
          'You can also paste the MCP URL from Settings > Developers in the instance URL, it includes the key.'
        )}
        autoComplete="off"
        spellCheck={false}
      />

      {askEmail && (
        <Input
          name="email"
          label={t('tdw_oauth_sh_email', 'Email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          hint={t(
            'tdw_oauth_sh_email_hint',
            '{{app}} uses it to identify your account.',
            { app: appName, interpolation: { escapeValue: false } }
          )}
          autoComplete="email"
        />
      )}

      {!!error && (
        <p className="tdw-consent-error" role="alert">
          {error}
        </p>
      )}

      <div className="tdw-consent-actions is-pair">
        <Button
          variant="secondary"
          size="lg"
          onClick={onBack}
          disabled={submitting}
        >
          {t('tdw_oauth_sh_back', 'Back')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          loadingLabel={t('tdw_oauth_sh_connecting', 'Connecting…')}
          disabled={!instanceUrl.trim() || (askEmail && !email.trim())}
        >
          {t('tdw_oauth_sh_connect', 'Connect')}
        </Button>
      </div>

      <p className="tdw-consent-hint">
        {t(
          'tdw_oauth_sh_https',
          'Your instance has to be reachable from the internet over https.'
        )}
      </p>
    </form>
  );
};
