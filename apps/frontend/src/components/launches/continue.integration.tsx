'use client';

import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { HttpStatusCode } from 'axios';
import { useRouter } from 'next/navigation';
import { Redirect } from '@gitroom/frontend/components/layout/redirect';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import dayjs from 'dayjs';
import { continueProviderList } from '@gitroom/frontend/components/new-launch/providers/continue-provider/list';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import {
  EmptyState,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

// Providers connected through the browser extension hand their cookies over in
// this tab's sessionStorage instead of the URL (see AddProviderComponent). Read
// once and removed right away; the in-memory copy is dropped after the connect
// request.
const extensionCodes = new Map<string, string>();
const takeExtensionCode = (state: string) => {
  const key = `extension-cookies:${state}`;
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      extensionCodes.set(state, stored);
      sessionStorage.removeItem(key);
    }
  } catch {
    // site storage blocked: nothing was handed over
  }
  return extensionCodes.get(state);
};

interface TwoStepState {
  integrationId: string;
  onboarding: boolean;
  pages: any[];
  returnURL?: string;
}

interface SuccessState {
  message: string;
}

// Tadween: connecting, connected or failed, on the continue step's page card
// (app/tadween/continue.scss) with the kit's empty-state layout
const ConnectState: FC<{
  icon: string;
  tone: 'success' | 'error' | 'busy';
  title: ReactNode;
  body: ReactNode;
}> = ({ icon, tone, title, body }) => (
  <TadweenScope className="tdw-continue-page">
    <div
      className={`tdw-continue-card tdw-continue-state is-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-busy={tone === 'busy' || undefined}
    >
      <EmptyState icon={icon} title={title} body={body} />
    </div>
  </TadweenScope>
);

export const ContinueIntegration: FC<{
  provider: string;
  searchParams: any;
  logged: boolean;
}> = (props) => {
  const { provider, searchParams, logged } = props;
  const { push } = useRouter();
  const t = useT();
  const fetch = useFetch();
  const { extensionId, backendUrl } = useVariables();
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [twoStepState, setTwoStepState] = useState<TwoStepState | null>(null);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to handle navigation - redirects if logged or returnURL exists, otherwise shows inline
  const navigateOrShow = useCallback(
    (path: string, returnURL: string | undefined, successMessage: string) => {
      if (returnURL) {
        // If returnURL exists, always redirect to it with the path params
        const params = path.includes('?') ? path.split('?')[1] : '';
        push(params ? `${returnURL}?${params}` : returnURL);
      } else if (logged) {
        // If logged in without returnURL, use normal navigation
        push(path);
      } else {
        // If not logged in without returnURL, show success inline
        setSuccessState({ message: successMessage });
      }
    },
    [logged, push]
  );
  const modifiedParams = useMemo(() => {
    if (provider === 'mewe') {
      return {
        state: searchParams.state || '',
        code: searchParams.loginRequestToken || '',
        refresh: searchParams.refresh || '',
      };
    }
    if (provider === 'x') {
      return {
        state: searchParams.oauth_token || '',
        code: searchParams.oauth_verifier || '',
        refresh: searchParams.refresh || '',
      };
    }

    if (provider === 'tiktok-business') {
      // The TikTok Business API redirects back with `auth_code` instead of `code`
      return {
        state: searchParams.state || '',
        code: searchParams.auth_code || searchParams.code || '',
        refresh: searchParams.refresh || '',
      };
    }

    if (provider === 'vk') {
      return {
        ...searchParams,
        state: searchParams.state || '',
        code: searchParams.code + '&&&&' + searchParams.device_id,
      };
    }

    if (provider === 'mewe') {
      const hash =
        typeof window !== 'undefined' ? window.location.hash.substring(1) : '';
      const hashParams = new URLSearchParams(hash);
      return {
        state: hashParams.get('state') || searchParams.state || '',
        code: hashParams.get('loginRequestToken') || '',
        refresh: searchParams.refresh || '',
      };
    }

    if (
      !searchParams.code &&
      searchParams.state &&
      typeof window !== 'undefined'
    ) {
      const code = takeExtensionCode(searchParams.state);
      if (code) {
        return { ...searchParams, code };
      }
    }

    return searchParams;
  }, []);

  useEffect(() => {
    (async () => {
      const timezone = String(dayjs.tz().utcOffset());

      // Try public endpoint first (handles both public and fallback scenarios)
      let data = await fetch(`/integrations/social-connect/${provider}`, {
        method: 'POST',
        body: JSON.stringify({ ...modifiedParams, timezone }),
      });

      // If public endpoint fails with specific errors, try authenticated endpoint
      if (data.status === HttpStatusCode.BadRequest) {
        const errorData = await data.json().catch(() => ({}));
        // "Invalid connection type" means this wasn't started as a public flow
        if (
          errorData.message?.includes('Invalid connection type') ||
          errorData.message?.includes('Invalid or expired state')
        ) {
          data = await fetch(`/integrations/social-connect/${provider}`, {
            method: 'POST',
            body: JSON.stringify({ ...modifiedParams, timezone }),
          });
        }
      }

      // The connect request has the extension cookies now; drop our copy
      extensionCodes.delete(modifiedParams.state);

      if (data.status === HttpStatusCode.PreconditionFailed) {
        const { returnURL } = await data.json().catch(() => ({}));
        navigateOrShow(
          `/launches?precondition=true`,
          returnURL,
          'Precondition failed'
        );
        return;
      }

      if (data.status === HttpStatusCode.NotAcceptable) {
        const { msg, returnURL } = await data.json();
        navigateOrShow(`/launches?msg=${msg}`, returnURL, msg);
        return;
      }

      if (
        data.status !== HttpStatusCode.Ok &&
        data.status !== HttpStatusCode.Created
      ) {
        const errorData = await data.json().catch(() => ({}));
        setErrorMessage(
          errorData.message || errorData.msg || 'Could not add provider'
        );
        setError(true);
        return;
      }

      const {
        inBetweenSteps,
        id,
        onboarding: resOnboarding,
        pages,
        returnURL,
        extensionToken,
      } = await data.json();
      const onboarding = resOnboarding || searchParams.onboarding === 'true';

      // Store refresh token in extension for background cookie refresh
      if (
        extensionToken &&
        extensionId &&
        typeof chrome !== 'undefined' &&
        chrome?.runtime?.sendMessage
      ) {
        try {
          chrome.runtime.sendMessage(
            extensionId,
            {
              type: 'STORE_REFRESH_TOKEN',
              provider,
              integrationId: id,
              jwt: extensionToken,
              backendUrl,
            },
            () => {
              if (chrome.runtime.lastError) {
                return;
              }
            }
          );
        } catch {
          // Silently ignore — extension may not be available
        }
      }

      // If it's a two-step provider, show the selection UI inline
      if (inBetweenSteps && !searchParams.refresh) {
        setTwoStepState({
          integrationId: id,
          onboarding,
          pages: pages || [],
          returnURL,
        });
        return;
      }

      navigateOrShow(
        `/launches?added=${provider}&msg=Channel Updated${
          onboarding ? '&onboarding=true' : ''
        }`,
        returnURL,
        'Channel Updated'
      );
    })();
  }, []);

  const onSave = useCallback(
    async (data: any) => {
      if (!twoStepState) return;

      setIsSaving(true);

      try {
        // Use public or authenticated endpoint based on the flow
        const endpoint = logged
          ? `/integrations/provider/${twoStepState.integrationId}/connect`
          : `/integrations/public/provider/${twoStepState.integrationId}/connect`;

        const response = await fetch(endpoint, {
          method: 'POST',
          body: JSON.stringify({ ...modifiedParams, ...data }),
        });

        if (
          response.status !== HttpStatusCode.Ok &&
          response.status !== HttpStatusCode.Created
        ) {
          const errorData = await response.json().catch(() => ({}));
          setErrorMessage(
            errorData.message || 'Failed to save channel configuration'
          );
          setError(true);
          return;
        }

        navigateOrShow(
          `/launches?added=${provider}&msg=Channel Added${
            twoStepState.onboarding ? '&onboarding=true' : ''
          }`,
          twoStepState.returnURL,
          'Channel Added'
        );
      } finally {
        setIsSaving(false);
      }
    },
    [twoStepState, fetch, modifiedParams, provider, navigateOrShow]
  );

  const Provider = useMemo(() => {
    return (
      continueProviderList[provider as keyof typeof continueProviderList] ||
      null
    );
  }, [provider]);

  const providerDisplayName = useMemo(() => {
    const names: Record<string, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      'linkedin-page': 'LinkedIn',
      youtube: 'YouTube',
      gmb: 'Google Business',
      tumblr: 'Tumblr',
      'tiktok-business': 'TikTok Business',
    };
    return names[provider] || provider;
  }, [provider]);

  // Success state for non-logged users without returnURL
  if (successState) {
    return (
      <ConnectState
        icon="circle-check"
        tone="success"
        title={t('tdw_channel_connected', 'Channel connected')}
        body={
          successState.message ||
          t(
            'channel_connected_description',
            'Your {{name}} channel is connected. You can close this window now.',
            { name: providerDisplayName }
          )
        }
      />
    );
  }

  // Show the two-step selection UI (Tadween: the same step as the app's
  // continue dialog, on a page card; styles in app/tadween/continue.scss)
  if (twoStepState && Provider) {
    return (
      <div className="tdw-continue-page">
        <div className="tdw-continue-card">
          <IntegrationContext.Provider
            value={{
              date: newDayjs(),
              value: [],
              allIntegrations: [],
              integration: {
                editor: 'normal',
                additionalSettings: '',
                display: '',
                time: [{ time: 0 }],
                id: twoStepState.integrationId,
                type: '',
                name: '',
                picture: '',
                inBetweenSteps: true,
                changeNickName: false,
                changeProfilePicture: false,
                identifier: provider,
              },
            }}
          >
            <Provider
              onSave={onSave}
              existingId={[]}
              initialData={twoStepState.pages}
              isSaving={isSaving}
              allowReconnect={logged}
            />
          </IntegrationContext.Provider>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ConnectState
        icon="circle-x"
        tone="error"
        title={t('tdw_connect_failed', "We couldn't connect this channel")}
        body={
          <>
            {errorMessage ||
              t(
                'you_are_being_redirected_back',
                'An error occurred. Please try again.'
              )}
            {logged && <Redirect url="/launches" delay={3000} />}
          </>
        }
      />
    );
  }

  // Loading state
  return (
    <ConnectState
      icon="loader-circle"
      tone="busy"
      title={t('tdw_connecting_channel', 'Connecting your channel')}
      body={t('please_wait', 'Please wait while we connect your account...')}
    />
  );
};
