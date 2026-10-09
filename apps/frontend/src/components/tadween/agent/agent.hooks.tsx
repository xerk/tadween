'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import useSWR from 'swr';
import { orderBy } from 'lodash';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';

// Data for the Tadween agent workspace: the saved chats (/copilot/list, the
// request and SWR key Postiz's agent page used) and the channels the agent
// may post to (the calendar's /integrations/list).

export interface AgentThread {
  id: string;
  title: string;
}

export interface AgentChannel {
  id: string;
  name: string;
  picture: string;
  identifier: string;
  disabled: boolean;
  refreshNeeded?: boolean;
  inBetweenSteps?: boolean;
  additionalSettings?: string;
  customer?: { id: string; name: string } | null;
}

export const useAgentThreads = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await (await fetch('/copilot/list')).json()) as {
      threads: AgentThread[];
    };
  }, []);
  return useSWR('threads', load, {
    revalidateOnFocus: false,
    refreshWhenHidden: false,
    shouldRetryOnError: false,
  });
};

// Network names ("LinkedIn Page", "X"…) for the channel list, from the same
// provider catalogue the "Add channel" dialog reads
export const useAgentNetworks = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await (await fetch('/integrations')).json()) as {
      social: { identifier: string; name: string }[];
    };
  }, []);
  return useSWR('agent-networks', load, {
    revalidateOnFocus: false,
    refreshWhenHidden: false,
    shouldRetryOnError: false,
  });
};

// Channels in the order the agent page always listed them
export const useAgentChannels = () => {
  const { data, isLoading } = useIntegrationList();
  const channels = useMemo(
    () =>
      orderBy(
        (data || []) as (AgentChannel & { type: string })[],
        ['type', 'disabled', 'identifier'],
        ['desc', 'asc', 'asc']
      ),
    [data]
  );
  return { channels, isLoading };
};

// Workspace state shared by the rail, the chat and the composer
export interface AgentWorkspaceState {
  // channels the next message tells the agent to use (the channel panel is
  // the only place that changes them)
  selected: AgentChannel[];
  setSelected: (channels: AgentChannel[]) => void;
  // the channel panel's sheet on phones
  channelsOpen: boolean;
  setChannelsOpen: (open: boolean) => void;
  // text a suggested prompt put into the composer
  draft: { text: string; at: number };
  setDraft: (text: string) => void;
  // bumping it starts a fresh /agents/new chat
  chatKey: number;
  newChat: () => void;
}

export const AgentWorkspaceContext = createContext<AgentWorkspaceState>({
  selected: [],
  setSelected: () => {},
  channelsOpen: false,
  setChannelsOpen: () => {},
  draft: { text: '', at: 0 },
  setDraft: () => {},
  chatKey: 0,
  newChat: () => {},
});

export const useAgentWorkspace = () => useContext(AgentWorkspaceContext);
