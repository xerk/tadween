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
export const PreviewWrapper = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const copilotConnection = useCopilotConnection();
  const { backendUrl } = useVariables();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });
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
