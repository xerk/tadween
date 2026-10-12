'use client';

import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { OAuthSelfHosted } from '@gitroom/frontend/components/oauth/self.hosted.component';
import {
  McpClientIcon,
  mcpClientFromRequest,
} from '@gitroom/frontend/components/public-api/mcp.client.icons';
import { useBrandLinks } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { useLegalLinks } from '@gitroom/frontend/components/tadween/auth/auth.parts';
import { useOrganizations } from '@gitroom/frontend/components/tadween/shell/sidebar';
import {
  Avatar,
  Button,
  cx,
  Icon,
  IconName,
  LinkButton,
  Select,
  Skeleton,
  Spinner,
} from '@gitroom/frontend/components/tadween/ui';

// Consent screen of OAuth / MCP clients (ChatGPT, Claude, Cursor, …).
// Flow, unchanged from Postiz: GET /oauth/authorize validates the request
// (client, redirect_uri, PKCE), POST /oauth/authorize approves or denies for
// the current user and workspace (showorg cookie) and answers with the URL to
// send the browser to. Signed-out visitors sign in and come back here.
// Styles: app/tadween/oauth.scss, inside the auth shell (oauth/authorize/layout.tsx).

interface AuthorizeInfo {
  app: {
    name: string;
    description?: string | null;
    picture?: { path?: string } | null;
    clientId: string;
    redirectUrl: string;
    dynamic?: boolean;
  };
  // what the token will be granted (OAuthService.grantedScope)
  scope?: string;
  state?: string;
  selfHosted: boolean;
  selfHostedEmail: boolean;
}

interface Workspace {
  id: string;
  name: string;
}

const useAuthorizeRequest = (query: string | null) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const data = await (await fetch(`/oauth/authorize?${query}`)).json();
    if (data?.statusCode >= 400) {
      throw new Error(
        (Array.isArray(data.message) ? data.message[0] : data.message) ||
          'Invalid OAuth request'
      );
    }
    return data as AuthorizeInfo;
  }, [query]);
  return useSWR(query ? `oauth-authorize?${query}` : null, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });
};

// The signed-in account. A session that expired answers 401, which sends the
// browser to sign in (layout.context); the stored returnUrl brings it back here.
const useConsentUser = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    localStorage.setItem('returnUrl', window.location.href);
    const res = await fetch('/user/self');
    if (!res.ok) {
      throw new Error('session expired');
    }
    localStorage.removeItem('returnUrl');
    return (await res.json()) as {
      name?: string;
      email?: string;
      orgId?: string;
    };
  }, []);
  return useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });
};

// Backend messages of a request that can't be served, as friendly copy.
// Anything else is shown as sent.
const REQUEST_ERRORS: Record<string, [string, string, string, string]> = {
  missing: [
    'tdw_oauth_err_missing_title',
    'This link is incomplete',
    'tdw_oauth_err_missing_body',
    'The app that sent you here left out part of the request. Go back to the app and connect again.',
  ],
  'Invalid client_id': [
    'tdw_oauth_err_client_title',
    'We don’t recognise this app',
    'tdw_oauth_err_client_body',
    'Its connection may have expired or been removed. Go back to the app and connect again.',
  ],
  'Invalid redirect_uri': [
    'tdw_oauth_err_redirect_title',
    'This app’s return address doesn’t match',
    'tdw_oauth_err_redirect_body',
    'For your safety, we only send you back to the address the app registered. Remove the connector in the app and add it again.',
  ],
  pkce: [
    'tdw_oauth_err_pkce_title',
    'This sign-in request isn’t secure enough',
    'tdw_oauth_err_pkce_body',
    'The app has to use PKCE (S256) to connect. Update the app or contact its developer.',
  ],
  action: [
    'tdw_oauth_err_action_title',
    'We couldn’t finish connecting',
    'tdw_oauth_err_action_body',
    'Nothing was shared. Check your connection and try again.',
  ],
};

const requestErrorKey = (message: string) =>
  message === 'Failed to process authorization'
    ? 'action'
    : message.startsWith('Missing required parameters') ||
      message.startsWith('Only response_type')
    ? 'missing'
    : message.startsWith('code_challenge') || message.includes('S256')
    ? 'pkce'
    : message;

// What the token can do, from the granted scopes. Fixed rows only: an unknown
// scope is never echoed.
const SCOPE_ROWS: Record<
  string,
  { icon: IconName; key: string; text: string }[]
> = {
  'mcp:read': [
    {
      icon: 'eye',
      key: 'tdw_oauth_scope_read',
      text: 'See your channels, posts and analytics',
    },
  ],
  'mcp:write': [
    {
      icon: 'calendar',
      key: 'tdw_oauth_scope_write',
      text: 'Create, schedule and edit posts',
    },
    {
      icon: 'upload',
      key: 'tdw_oauth_scope_media',
      text: 'Upload images and videos to your media library',
    },
  ],
  email: [
    {
      icon: 'mail',
      key: 'tdw_oauth_scope_email',
      text: 'See your email address',
    },
  ],
};

const Card: FC<{ children: ReactNode; busy?: boolean; label?: string }> = ({
  children,
  busy,
  label,
}) => (
  <section
    className="tdw-consent"
    aria-busy={busy || undefined}
    aria-label={label}
  >
    {children}
  </section>
);

/* The client's mark and Tadween's, joined by a quiet connector */
const LogoPair: FC<{ client: ReactNode }> = ({ client }) => (
  <div className="tdw-consent-logos" aria-hidden="true">
    <span className="tdw-consent-logo is-client">{client}</span>
    <span className="tdw-consent-connector">
      <i />
      <i />
      <i />
    </span>
    <span className="tdw-consent-logo is-brand">
      <Logo />
    </span>
  </div>
);

const StatusIcon: FC<{
  tone: 'error' | 'success' | 'muted';
  icon: IconName;
}> = ({ tone, icon }) => (
  <span className={cx('tdw-consent-status', `is-${tone}`)} aria-hidden="true">
    <Icon name={icon} size={24} />
  </span>
);

const Footnote: FC<{ logged: boolean }> = ({ logged }) => {
  const t = useT();
  const { termsUrl, privacyUrl } = useLegalLinks();
  return (
    <footer className="tdw-consent-foot">
      <p>
        {t('tdw_oauth_revoke_hint', 'You can remove access any time in')}{' '}
        {logged ? (
          <a href="/settings?tab=approved_apps">
            {t('tdw_oauth_revoke_link', 'Settings → Approved apps')}
          </a>
        ) : (
          <span>{t('tdw_oauth_revoke_link', 'Settings → Approved apps')}</span>
        )}
        .
      </p>
      {termsUrl || privacyUrl ? (
        <p className="tdw-consent-legal">
          {privacyUrl ? (
            <a
              href={privacyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {t('privacy_policy', 'Privacy Policy')}
            </a>
          ) : null}
          {termsUrl && privacyUrl ? <span aria-hidden="true">·</span> : null}
          {termsUrl ? (
            <a
              href={termsUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {t('terms_of_service', 'Terms of Service')}
            </a>
          ) : null}
        </p>
      ) : null}
    </footer>
  );
};

/* Signed-in account and the workspace the approval goes to. Only mounted for
   signed-in visitors: both requests need a session. */
const ConsentAccount: FC<{ busy: boolean }> = ({ busy }) => {
  const t = useT();
  const fetch = useFetch();
  const { data: user } = useConsentUser();
  const { data: workspaceData } = useOrganizations();
  const [switching, setSwitching] = useState(false);
  const workspaces: Workspace[] = Array.isArray(workspaceData)
    ? workspaceData
    : [];
  const workspace = workspaces.find((w) => w.id === user?.orgId);

  // Sign out and in as someone else, then come back (same returnUrl the
  // sign-in page stores)
  const switchAccount = useCallback(() => {
    localStorage.setItem('returnUrl', window.location.href);
    window.location.href = '/auth/logout';
  }, []);

  // The approval goes to the current workspace (showorg cookie), so switching
  // is the app's own: POST /user/change-org, then reload this request
  const changeWorkspace = useCallback(
    async (id: string) => {
      if (id === user?.orgId) {
        return;
      }
      setSwitching(true);
      await fetch('/user/change-org', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      window.location.reload();
    },
    [user?.orgId]
  );

  return (
    <div className="tdw-consent-who">
      <div className="tdw-consent-account">
        {user ? (
          <Avatar name={user.name || user.email || ''} size={36} />
        ) : (
          <Skeleton width={36} height={36} radius={18} />
        )}
        <div className="tdw-consent-account-text">
          <span className="tdw-consent-label">
            {t('tdw_oauth_signed_in_as', 'Signed in as')}
          </span>
          <strong dir="auto">
            {user ? (
              user.email || user.name
            ) : (
              <Skeleton width={160} height={14} />
            )}
          </strong>
        </div>
        <button
          type="button"
          className="tdw-consent-link-btn"
          onClick={switchAccount}
          disabled={busy || switching || !user}
        >
          {t('tdw_oauth_switch_account', 'Not you?')}
        </button>
      </div>
      <div className="tdw-consent-workspace">
        <span className="tdw-consent-label" id="tdw-consent-ws">
          {t('tdw_oauth_workspace', 'Workspace')}
        </span>
        {workspaces.length > 1 ? (
          <Select
            aria-label={t('tdw_oauth_workspace', 'Workspace')}
            value={user?.orgId}
            disabled={busy || switching}
            onChange={changeWorkspace}
            options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
          />
        ) : (
          <strong dir="auto" aria-labelledby="tdw-consent-ws">
            {workspace?.name || <Skeleton width={120} height={14} />}
          </strong>
        )}
      </div>
    </div>
  );
};

const LoadingCard: FC = () => {
  const t = useT();
  return (
    <Card busy={true} label={t('tdw_oauth_loading', 'Checking the request…')}>
      <div className="tdw-consent-logos" aria-hidden="true">
        <Skeleton width={56} height={56} radius={16} />
        <span className="tdw-consent-connector">
          <i />
          <i />
          <i />
        </span>
        <Skeleton width={56} height={56} radius={16} />
      </div>
      <div className="tdw-consent-skeleton" aria-hidden="true">
        <Skeleton width="80%" height={22} />
        <Skeleton width="55%" height={22} />
        <span className="tdw-consent-gap" />
        <Skeleton height={44} radius={12} />
        <Skeleton height={44} radius={12} />
        <Skeleton height={44} radius={12} />
      </div>
      <span className="sr-only" role="status">
        {t('tdw_oauth_loading', 'Checking the request…')}
      </span>
    </Card>
  );
};

const ErrorCard: FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => {
  const t = useT();
  const brand = useBrandLinks();
  const known = REQUEST_ERRORS[requestErrorKey(message)];
  return (
    <Card>
      <StatusIcon tone="error" icon="triangle-alert" />
      <h1 className="tdw-consent-title is-center" role="alert">
        {known
          ? t(known[0], known[1])
          : t('tdw_oauth_err_title', 'This connection can’t continue')}
      </h1>
      <p className="tdw-consent-text is-center">
        {known ? t(known[2], known[3]) : message}
      </p>
      {known && requestErrorKey(message) !== 'action' ? (
        <p className="tdw-consent-detail">
          <Icon name="info" size={14} />
          <code>{message}</code>
        </p>
      ) : null}
      <div className="tdw-consent-actions">
        {onRetry ? (
          <Button variant="primary" size="lg" onClick={onRetry}>
            {t('tdw_oauth_try_again', 'Try again')}
          </Button>
        ) : (
          <LinkButton href="/" variant="secondary" size="lg">
            {t('tdw_oauth_open_app', 'Open {{brand}}', {
              brand: brand.name,
              interpolation: { escapeValue: false },
            })}
          </LinkButton>
        )}
      </div>
    </Card>
  );
};

export const OAuthAuthorize: FC<{ logged: boolean }> = ({ logged }) => {
  const t = useT();
  const fetch = useFetch();
  const brand = useBrandLinks();
  const searchParams = useSearchParams();
  const [selfHosted, setSelfHosted] = useState(false);
  const [phase, setPhase] = useState<
    'idle' | 'approve' | 'deny' | 'approved' | 'denied'
  >('idle');
  const [actionError, setActionError] = useState('');

  const clientId = searchParams.get('client_id');
  const responseType = searchParams.get('response_type');
  const state = searchParams.get('state');
  const redirectUri = searchParams.get('redirect_uri');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const resource = searchParams.get('resource');

  const paramsError =
    !clientId || !responseType
      ? 'Missing required parameters (client_id, response_type)'
      : responseType !== 'code'
      ? 'Only response_type=code is supported'
      : '';

  const query = useMemo(() => {
    if (paramsError) {
      return null;
    }
    return new URLSearchParams({
      client_id: clientId!,
      response_type: responseType!,
      ...(state ? { state } : {}),
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      ...(codeChallenge ? { code_challenge: codeChallenge } : {}),
      ...(codeChallengeMethod
        ? { code_challenge_method: codeChallengeMethod }
        : {}),
      ...(resource ? { resource } : {}),
    }).toString();
  }, [
    paramsError,
    clientId,
    responseType,
    state,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    resource,
  ]);

  const { data: appInfo, error: requestError } = useAuthorizeRequest(query);

  const handleAction = useCallback(
    async (action: 'approve' | 'deny') => {
      setPhase(action);
      setActionError('');
      try {
        const result = await (
          await fetch('/oauth/authorize', {
            method: 'POST',
            body: JSON.stringify({
              client_id: clientId,
              state,
              action,
              ...(redirectUri ? { redirect_uri: redirectUri } : {}),
              ...(codeChallenge ? { code_challenge: codeChallenge } : {}),
              ...(codeChallengeMethod
                ? { code_challenge_method: codeChallengeMethod }
                : {}),
            }),
          })
        ).json();

        // only ever the URL the backend built from the validated request
        if (result.redirect) {
          setPhase(action === 'approve' ? 'approved' : 'denied');
          window.location.href = result.redirect;
          return;
        }
        setActionError(
          (Array.isArray(result.message)
            ? result.message[0]
            : result.message) || 'Failed to process authorization'
        );
      } catch {
        setActionError('Failed to process authorization');
      }
      setPhase('idle');
    },
    [clientId, state, redirectUri, codeChallenge, codeChallengeMethod]
  );

  // Sign in (or sign up) and land back on this same request
  const signIn = useCallback(() => {
    window.location.href = `/auth/login?returnUrl=${encodeURIComponent(
      window.location.href
    )}`;
  }, []);

  if (paramsError || requestError) {
    return <ErrorCard message={paramsError || requestError.message} />;
  }
  if (!appInfo) {
    return <LoadingCard />;
  }
  if (actionError) {
    return (
      <ErrorCard message={actionError} onRetry={() => setActionError('')} />
    );
  }

  // Where approve / deny send the browser: dynamic clients go back to their
  // validated redirect_uri, static apps to the URL stored on the app
  const target = appInfo.app.dynamic ? redirectUri : appInfo.app.redirectUrl;
  const known = mcpClientFromRequest(appInfo.app.name, target);
  const clientName = (known?.label || appInfo.app.name || '').slice(0, 60);
  const destination = (() => {
    try {
      const url = new URL(target || '');
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(
        url.hostname
      );
      // every web callback names its host; only loopback and private
      // schemes (cursor://) stay on this device
      return ['http:', 'https:'].includes(url.protocol) && !loopback
        ? url.host
        : '';
    } catch (e) {
      return '';
    }
  })();

  const clientMark = known ? (
    <McpClientIcon client={known.client} size={30} />
  ) : appInfo.app.picture?.path ? (
    <img src={appInfo.app.picture.path} alt="" />
  ) : (
    <span className="tdw-consent-initial">
      {clientName[0]?.toUpperCase() || '?'}
    </span>
  );

  if (phase === 'approved' || phase === 'denied') {
    return (
      <Card busy={true}>
        <StatusIcon
          tone={phase === 'approved' ? 'success' : 'muted'}
          icon={phase === 'approved' ? 'circle-check' : 'x'}
        />
        <h1 className="tdw-consent-title is-center" role="status">
          {phase === 'approved'
            ? t('tdw_oauth_done_title', '{{client}} is connected', {
                client: clientName,
                interpolation: { escapeValue: false },
              })
            : t('tdw_oauth_cancelled_title', 'You cancelled the request')}
        </h1>
        <p className="tdw-consent-text is-center tdw-consent-redirecting">
          <Spinner
            size={16}
            label={t('tdw_oauth_redirecting', 'Redirecting')}
          />
          {t('tdw_oauth_taking_back', 'Taking you back to {{client}}…', {
            client: clientName,
            interpolation: { escapeValue: false },
          })}
        </p>
      </Card>
    );
  }

  const scopes = (appInfo.scope || 'mcp:read mcp:write').split(/\s+/);
  const rows = scopes.flatMap((scope) => SCOPE_ROWS[scope] || []);
  const busy = phase !== 'idle';

  return (
    <Card
      label={t(
        'tdw_oauth_title',
        '{{client}} wants to access your {{brand}} workspace',
        {
          client: clientName,
          brand: brand.name,
          interpolation: { escapeValue: false },
        }
      )}
    >
      <LogoPair client={clientMark} />
      <h1 className="tdw-consent-title is-center">
        {t(
          'tdw_oauth_title',
          '{{client}} wants to access your {{brand}} workspace',
          {
            client: clientName,
            brand: brand.name,
            interpolation: { escapeValue: false },
          }
        )}
      </h1>
      {appInfo.app.description && !known ? (
        <p className="tdw-consent-text is-center">
          {appInfo.app.description.slice(0, 200)}
        </p>
      ) : null}

      {selfHosted ? (
        <OAuthSelfHosted
          appName={clientName}
          askEmail={!!appInfo.selfHostedEmail}
          params={{
            client_id: clientId,
            state,
            redirect_uri: redirectUri,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
            resource,
          }}
          onBack={() => setSelfHosted(false)}
        />
      ) : (
        <>
          {logged ? <ConsentAccount busy={busy} /> : null}

          <div className="tdw-consent-scopes">
            <h2>
              {t('tdw_oauth_will_be_able', 'This will let {{client}}:', {
                client: clientName,
                interpolation: { escapeValue: false },
              })}
            </h2>
            <ul>
              {rows.map((row) => (
                <li key={row.key}>
                  <span className="tdw-consent-scope-icon" aria-hidden="true">
                    <Icon name={row.icon} size={16} />
                  </span>
                  {t(row.key, row.text)}
                </li>
              ))}
              <li className="is-quiet">
                <span className="tdw-consent-scope-icon" aria-hidden="true">
                  <Icon name="lock" size={16} />
                </span>
                {t('tdw_oauth_scope_password', 'It never sees your password')}
              </li>
            </ul>
          </div>

          <p className="tdw-consent-destination">
            <Icon name="external-link" size={14} />
            <span>
              {destination
                ? t(
                    'tdw_oauth_sent_back_to',
                    'You’ll be sent back to {{host}}',
                    {
                      host: destination,
                      interpolation: { escapeValue: false },
                    }
                  )
                : t(
                    'tdw_oauth_sent_back_to_app',
                    'You’ll be sent back to {{client}} on this device',
                    {
                      client: clientName,
                      interpolation: { escapeValue: false },
                    }
                  )}
            </span>
          </p>

          {logged ? (
            <div className="tdw-consent-actions is-pair">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => handleAction('deny')}
                disabled={busy}
                loading={phase === 'deny'}
                loadingLabel={t('tdw_oauth_cancelling', 'Cancelling…')}
              >
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleAction('approve')}
                disabled={busy}
                loading={phase === 'approve'}
                loadingLabel={t('tdw_oauth_allowing', 'Allowing…')}
              >
                {t('tdw_oauth_allow', 'Allow')}
              </Button>
            </div>
          ) : (
            <div className="tdw-consent-actions">
              <Button variant="primary" size="lg" onClick={signIn}>
                {t('tdw_oauth_sign_in', 'Sign in to continue')}
              </Button>
              <p className="tdw-consent-hint">
                {t(
                  'tdw_oauth_sign_in_hint',
                  'New to {{brand}}? You can create an account on the next screen.',
                  { brand: brand.name, interpolation: { escapeValue: false } }
                )}
              </p>
            </div>
          )}

          {!!appInfo.selfHosted && (
            <button
              type="button"
              className="tdw-consent-link-btn is-center"
              onClick={() => setSelfHosted(true)}
              disabled={busy}
            >
              {t('tdw_oauth_use_self_hosted', 'Use a self-hosted instance')}
            </button>
          )}
        </>
      )}

      <Footnote logged={logged} />
    </Card>
  );
};
