'use client';

import useSWR from 'swr';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { ReactNode, useCallback } from 'react';
import {
  useCopilotConnection,
  useFetch,
} from '@gitroom/helpers/utils/custom.fetch';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { AiProvider } from '@gitroom/frontend/components/tadween/instance/ai.guard';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
// `signedIn` false (a visitor of a shared post, no auth cookie): no account to
// load and no assistant, so the page asks nothing that answers 401
export const PreviewWrapper = ({
  children,
  signedIn = true,
}: {
  children: ReactNode;
  signedIn?: boolean;
}) => {
  const fetch = useFetch();
  const copilotConnection = useCopilotConnection();
  const { backendUrl } = useVariables();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user } = useSWR(signedIn ? '/user/self' : null, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });
  if (!signedIn) {
    return (
      <MantineWrapper>
        <Toaster />
        <ToolTip />
        {children}
      </MantineWrapper>
    );
  }
  return (
    <ContextWrapper user={user}>
      <AiProvider
        {...copilotConnection}
        runtimeUrl={backendUrl + '/copilot/chat'}
        useSingleEndpoint={true}
        showDevConsole={false}
        enableInspector={false}
      >
        <MantineWrapper>
          <Toaster />
          <ToolTip />
          {children}
        </MantineWrapper>
      </AiProvider>
    </ContextWrapper>
  );
};
