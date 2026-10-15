'use client';

import { openPaywall } from '@gitroom/frontend/components/tadween/billing/paywall.modal';
import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import i18next from '@gitroom/react/translation/i18next';
import { FetchWrapperComponent } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useReturnUrl } from '@gitroom/frontend/app/(app)/auth/return.url.component';
import { useVariables } from '@gitroom/react/helpers/variable.context';
export default function LayoutContext(params: { children: ReactNode }) {
  if (params?.children) {
    // eslint-disable-next-line react/no-children-prop
    return <LayoutContextInner children={params.children} />;
  }
  return <></>;
}
export function setCookie(cname: string, cvalue: string, exdays: number) {
  if (typeof document === 'undefined') {
    return;
  }
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}
function LayoutContextInner(params: { children: ReactNode }) {
  const returnUrl = useReturnUrl();
  const { backendUrl, isGeneral, isSecured } = useVariables();
  // Tadween: a request that never reached the server says so (once every few
  // seconds), instead of the click doing nothing
  const toaster = useToaster();
  const lastNetworkToast = useRef(0);
  // requests cut off by a reload, a logout redirect or a hidden tab are not
  // the user's problem: no toast while the page is leaving
  const leaving = useRef(false);
  useEffect(() => {
    const leave = () => {
      leaving.current = true;
    };
    const back = () => {
      leaving.current = false;
    };
    window.addEventListener('beforeunload', leave);
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', back);
    return () => {
      window.removeEventListener('beforeunload', leave);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', back);
    };
  }, []);
  const onNetworkError = useCallback(() => {
    if (
      leaving.current ||
      document.visibilityState === 'hidden' ||
      Date.now() - lastNetworkToast.current < 5000
    ) {
      return;
    }
    lastNetworkToast.current = Date.now();
    toaster.show(
      navigator.onLine
        ? i18next.t(
            'tdw_network_error',
            'Couldn’t reach the server. Check your connection and try again.'
          )
        : i18next.t(
            'tdw_offline_toast',
            'You’re offline. Reconnect and try again.'
          ),
      'warning'
    );
  }, [toaster]);
  const afterRequest = useCallback(
    async (url: string, options: RequestInit, response: Response) => {
      if (
        typeof window !== 'undefined' &&
        (window.location.href.includes('/p/') ||
          window.location.pathname.startsWith('/provider/'))
      ) {
        return true;
      }
      const headerAuth =
        response?.headers?.get('auth') || response?.headers?.get('Auth');
      const showOrg =
        response?.headers?.get('showorg') || response?.headers?.get('Showorg');
      const impersonate =
        response?.headers?.get('impersonate') ||
        response?.headers?.get('Impersonate');
      const logout =
        response?.headers?.get('logout') || response?.headers?.get('Logout');
      if (headerAuth) {
        setCookie('auth', headerAuth, 365);
      }
      if (showOrg) {
        setCookie('showorg', showOrg, 365);
      }
      if (impersonate) {
        setCookie('impersonate', impersonate, 365);
      }
      if (logout && !isSecured) {
        setCookie('auth', '', -10);
        setCookie('showorg', '', -10);
        setCookie('impersonate', '', -10);
        window.location.href = '/';
        return true;
      }
      const reloadOrOnboarding =
        response?.headers?.get('reload') ||
        response?.headers?.get('onboarding');
      if (reloadOrOnboarding) {
        const getAndClear = returnUrl.getAndClear();
        if (getAndClear) {
          window.location.href = getAndClear;
          return true;
        }
      }
      if (response?.headers?.get('onboarding')) {
        window.location.href = isGeneral
          ? '/launches?onboarding=true'
          : '/analytics?onboarding=true';
        return true;
      }

      if (response?.headers?.get('reload')) {
        window.location.reload();
        return true;
      }

      if (response.status === 401 || response?.headers?.get('logout')) {
        if (!isSecured) {
          setCookie('auth', '', -10);
          setCookie('showorg', '', -10);
          setCookie('impersonate', '', -10);
        }
        window.location.href = '/';
      }
      if (response.status === 406) {
        if (
          await deleteDialog(
            'You are currently on trial, in order to use the feature you must finish the trial',
            'Finish the trial, charge me now',
            'Trial',

          )
        ) {
          window.open('/billing?finishTrial=true', '_blank');
          return false;
        }
        return false;
      }

      if (response.status === 402) {
        // Tadween: a plan limit opens the upgrade paywall (section from the
        // backend's SubscriptionExceptionFilter)
        const body = await response
          .clone()
          .json()
          .catch(() => ({}));
        openPaywall({ section: body.section, message: body.message });
        // Let the caller receive the 402 so its loading state ends
        return true;
      }
      return true;
    },
    []
  );
  return (
    <FetchWrapperComponent
      baseUrl={backendUrl}
      afterRequest={afterRequest}
      onNetworkError={onNetworkError}
    >
      {params?.children || <></>}
    </FetchWrapperComponent>
  );
}
