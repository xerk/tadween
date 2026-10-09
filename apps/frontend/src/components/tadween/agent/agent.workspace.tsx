'use client';

import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import useCookie from 'react-use-cookie';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PropertiesContext } from '@gitroom/frontend/components/agents/agent';
import { TadweenSheet } from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';
import {
  Icon,
  IconButton,
  Skeleton,
  TadweenScope,
  cx,
} from '@gitroom/frontend/components/tadween/ui';
import {
  AgentChannel,
  AgentWorkspaceContext,
  useAgentThreads,
  useAgentWorkspace,
} from './agent.hooks';
import { ChannelPanel } from './agent.parts';

// Tadween agent workspace, laid out like Postiz's agent page: the channels on
// the start side, the conversation in the middle (children: the /agents/[id]
// page) and past chats on the end side; on phones both side panels are sheets
// opened from the top bar. It owns the channel selection and still provides
// Postiz's PropertiesContext, which the agent's "manualPosting" action reads.
// Styles: app/tadween/agent.scss.

// Opens a fresh chat: back to /agents/new, or a reset when already there
export const useStartNewChat = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { newChat } = useAgentWorkspace();
  return useCallback(() => {
    if (pathname === '/agents/new') {
      newChat();
    } else {
      router.push('/agents/new');
    }
  }, [pathname, newChat, router]);
};

/* ChatThreadList: search, new chat and the saved chats */
export const ChatThreadList: FC<{ onNavigate?: () => void }> = ({
  onNavigate,
}) => {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const startNewChat = useStartNewChat();
  const { data, isLoading } = useAgentThreads();
  const [query, setQuery] = useState('');

  const threads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data?.threads || [];
    return q ? list.filter((p) => (p.title || '').toLowerCase().includes(q)) : list;
  }, [data, query]);

  const startNew = useCallback(() => {
    startNewChat();
    onNavigate?.();
  }, [startNewChat, onNavigate]);

  return (
    <div className="tdw-ag-threads">
      <button type="button" className="tdw-ag-new" onClick={startNew}>
        <Icon name="plus" size={16} />
        {t('start_a_new_chat', 'Start a new chat')}
      </button>
      <label className="tdw-ag-search">
        <Icon name="search" size={15} />
        <span className="sr-only">{t('tdw_ag_search_chats', 'Search chats')}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('tdw_ag_search_chats', 'Search chats')}
        />
      </label>
      <div className="tdw-ag-threads-label">{t('tdw_ag_chats', 'Chats')}</div>
      {isLoading ? (
        <div className="tdw-ag-thread-list" aria-hidden="true">
          {[120, 150, 96, 136].map((w, i) => (
            <div key={i} className="tdw-ag-thread">
              <Skeleton width={w} height={12} />
            </div>
          ))}
        </div>
      ) : threads.length ? (
        <nav className="tdw-ag-thread-list" aria-label={t('tdw_ag_chats', 'Chats')}>
          {threads.map((p) => (
            <Link
              key={p.id}
              href={`/agents/${p.id}`}
              onClick={onNavigate}
              className={cx('tdw-ag-thread', p.id === id && 'is-active')}
              aria-current={p.id === id ? 'page' : undefined}
              dir="auto"
            >
              <Icon name="message-circle" size={15} />
              <span className="tdw-ag-thread-title">
                {p.title || t('tdw_ag_untitled', 'Untitled chat')}
              </span>
            </Link>
          ))}
        </nav>
      ) : (
        <p className="tdw-ag-threads-empty">
          {query
            ? t('tdw_ag_no_match', 'No chats match "{{query}}"', { query })
            : t('tdw_no_agent_chats_body', 'Start a new chat and it will be kept here.')}
        </p>
      )}
    </div>
  );
};

/* AgentTopBar: the chat's title; on phones also the Channels and Chats sheets */
const AgentTopBar: FC = () => {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const { data } = useAgentThreads();
  const { selected, channelsOpen, setChannelsOpen } = useAgentWorkspace();
  const startNewChat = useStartNewChat();
  const [chatsOpen, setChatsOpen] = useState(false);
  const isNew = !id || id === 'new';

  const title = useMemo(
    () =>
      (!isNew && data?.threads?.find((p) => p.id === id)?.title) ||
      t('tdw_ag_new_chat', 'New chat'),
    [data, id, isNew]
  );

  return (
    <header className="tdw-ag-head">
      <button
        type="button"
        className={cx('tdw-ag-chip tdw-ag-phone-only', selected.length && 'is-on')}
        aria-haspopup="dialog"
        aria-expanded={channelsOpen}
        onClick={() => setChannelsOpen(true)}
      >
        <Icon name="users" size={15} />
        <span>{t('channels', 'Channels')}</span>
        <span className="tdw-ag-chip-count">{selected.length}</span>
      </button>
      <h2 className="tdw-ag-head-title" dir="auto">
        {title}
      </h2>
      <IconButton
        icon="message-square"
        label={t('tdw_ag_chats', 'Chats')}
        className="tdw-ag-phone-only"
        onClick={() => setChatsOpen(true)}
      />
      <IconButton
        icon="plus"
        label={t('start_a_new_chat', 'Start a new chat')}
        className="tdw-ag-phone-only"
        onClick={startNewChat}
      />
      <TadweenSheet
        open={channelsOpen}
        onClose={() => setChannelsOpen(false)}
        title={t('channels', 'Channels')}
        done={{ label: t('done', 'Done') }}
        detent="large"
      >
        <TadweenScope className="tdw-ag-sheet">
          <ChannelPanel />
        </TadweenScope>
      </TadweenSheet>
      <TadweenSheet
        open={chatsOpen}
        onClose={() => setChatsOpen(false)}
        title={t('tdw_ag_chats', 'Chats')}
        detent="large"
      >
        <TadweenScope className="tdw-ag-sheet">
          <ChatThreadList onNavigate={() => setChatsOpen(false)} />
        </TadweenScope>
      </TadweenSheet>
    </header>
  );
};

export const AgentWorkspace: FC<{ children: ReactNode }> = ({ children }) => {
  const [selected, setSelected] = useState<AgentChannel[]>([]);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [draft, setDraftState] = useState({ text: '', at: 0 });
  const [chatKey, setChatKey] = useState(0);
  // the same cookie Postiz's agent page collapses its channel list with
  const [collapseMenu, setCollapseMenu] = useCookie('collapseMenu', '0');

  const value = useMemo(
    () => ({
      selected,
      setSelected,
      channelsOpen,
      setChannelsOpen,
      draft,
      setDraft: (text: string) => setDraftState({ text, at: Date.now() }),
      chatKey,
      newChat: () => setChatKey((k) => k + 1),
    }),
    [selected, channelsOpen, draft, chatKey]
  );

  return (
    <AgentWorkspaceContext.Provider value={value}>
      {/* Postiz types this context from its `[]` default */}
      <PropertiesContext.Provider value={{ properties: selected as never[] }}>
        <TadweenScope className="tdw-ag-scope">
          <aside
            className={cx('tdw-ag-channels', collapseMenu === '1' && 'is-collapsed')}
          >
            <ChannelPanel
              collapsed={collapseMenu === '1'}
              onCollapse={(collapsed) => setCollapseMenu(collapsed ? '1' : '0')}
            />
          </aside>
          <div className="tdw-ag-main">
            <AgentTopBar />
            <div className="tdw-ag-body">{children}</div>
          </div>
          <aside className="tdw-ag-rail">
            <ChatThreadList />
          </aside>
        </TadweenScope>
      </PropertiesContext.Provider>
    </AgentWorkspaceContext.Provider>
  );
};
