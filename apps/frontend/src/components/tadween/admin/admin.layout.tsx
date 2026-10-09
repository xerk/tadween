'use client';

// Client frame of the admin console. Provides what the customer LayoutComponent
// provides to its pages and the console uses (signed-in user, Mantine modals for
// Postiz's language/logout dialogs, toasts, tooltips), then the admin shell.
// No workspace chrome, billing gate or CopilotKit.
import React, { FC, ReactNode, useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
import { AdminShell } from './admin.shell';

const useSelf = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  // Same key and options as the customer layout, so both share the cache.
  return useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });
};

export const AdminLayoutComponent: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { data: user } = useSelf();
  if (!user) return null;
  return (
    <ContextWrapper user={user}>
      <MantineWrapper>
        <ToolTip />
        <Toaster />
        <AdminShell>{children}</AdminShell>
      </MantineWrapper>
    </ContextWrapper>
  );
};
