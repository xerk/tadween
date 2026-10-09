'use client';

import React, { FC, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AssistantMessage as CopilotAssistantMessage,
  AssistantMessageProps,
  CopilotChat,
  InputProps,
  UserMessageProps,
} from '@copilotkit/react-ui';
import {
  CopilotKit,
  useCopilotChatInternal,
  useDefaultTool,
} from '@copilotkit/react-core';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useCopilotConnection } from '@gitroom/helpers/utils/custom.fetch';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { AiOnly } from '@gitroom/frontend/components/tadween/instance/ai.guard';
import { TadweenEmptyState } from '@gitroom/frontend/components/tadween/empty.state';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';
import AutoResizingTextarea from '@gitroom/frontend/components/agents/agent.textarea';
import {
  Hooks,
  LoadMessages,
} from '@gitroom/frontend/components/agents/agent.chat';
import { Icon, cx } from '@gitroom/frontend/components/tadween/ui';
import { AgentChannel, useAgentThreads, useAgentWorkspace } from './agent.hooks';
import { ChatBubble, SuggestedPrompts, ToolCard } from './agent.parts';

// The Tadween agent conversation (/agents/new and /agents/[id]), the middle of
// the workspace (agent.workspace.tsx: channels, top bar, chats). Same runtime
// as Postiz's agent page: CopilotKit on /copilot/agent with the "postiz" agent,
// the chat's history from /copilot/:id/list (LoadMessages) and the
// "manualPosting" action (Hooks). Tadween adds the bubbles, tool cards,
// suggested prompts and the composer. Styles: app/tadween/agent.scss.

// What the agent reads with every message (unchanged from Postiz's agent page):
// the text, the media as "Image:/Video: url" lines and the chosen channels.
const composeMessage = (
  text: string,
  media: { path: string; id: string }[],
  channels: AgentChannel[]
) =>
  text +
  (media.length > 0
    ? '\n[--Media--]' +
      media
        .map((m) =>
          hasExtension(m.path, 'mp4') ? `Video: ${m.path}` : `Image: ${m.path}`
        )
        .join('\n') +
      '\n[--Media--]'
    : '') +
  `
${
  channels.length
    ? `[--integrations--]
Use the following social media platforms: ${JSON.stringify(
        channels.map((p) => ({
          id: p.id,
          platform: p.identifier,
          profilePicture: p.picture,
          additionalSettings: p.additionalSettings,
        }))
      )}
[--integrations--]`
    : ``
}`;

const UserMessage: FC<UserMessageProps> = ({ message }) => {
  const content = message?.content || '';
  const raw =
    typeof content === 'string'
      ? content
      : content.map((p) => (p.type === 'text' ? p.text : '')).join('');
  return <ChatBubble raw={raw} />;
};

// Postiz's assistant message (markdown, tool UI, copy / regenerate) without
// the feedback buttons nothing listens to
const AssistantMessage: FC<AssistantMessageProps> = (props) => {
  const message = (
    <CopilotAssistantMessage
      {...props}
      onThumbsUp={undefined}
      onThumbsDown={undefined}
    />
  );
  // nothing to show yet (a run that just started): no mark either
  if (
    !props.message?.content &&
    !props.message?.generativeUI?.() &&
    !props.subComponent
  ) {
    return message;
  }
  return (
    <div className="tdw-ag-assistant">
      <span className="tdw-ag-avatar" aria-hidden="true">
        <Icon name="sparkles" size={14} />
      </span>
      <div className="tdw-ag-assistant-body">{message}</div>
    </div>
  );
};

const Thinking: FC = () => {
  const t = useT();
  return (
    <span className="tdw-ag-thinking" role="status">
      <span className="tdw-ag-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="tdw-ag-thinking-label">{t('tdw_ag_thinking', 'Thinking…')}</span>
    </span>
  );
};

/* Composer: text, attachments, channels, send / stop */
const Composer: FC<InputProps> = ({ inProgress, onSend, onStop, hideStopButton }) => {
  const t = useT();
  const { selected, draft } = useAgentWorkspace();
  const { interrupt } = useCopilotChatInternal();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ path: string; id: string }[]>([]);
  const [composing, setComposing] = useState(false);

  // a suggested prompt fills the composer; the user edits and sends it
  useEffect(() => {
    if (draft.at) {
      setText(draft.text);
      textareaRef.current?.focus();
    }
  }, [draft.at]);

  const canSend = !inProgress && !interrupt && text.trim().length > 0;
  const canStop = inProgress && !hideStopButton;

  const send = () => {
    if (!canSend) return;
    onSend(composeMessage(text, media, selected));
    setText('');
    setMedia([]);
    textareaRef.current?.focus();
  };

  return (
    <div className="tdw-ag-composer-wrap">
      <div
        className="tdw-ag-composer"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('button, a, input, textarea, [role="dialog"]')) {
            textareaRef.current?.focus();
          }
        }}
      >
        <AutoResizingTextarea
          ref={textareaRef}
          placeholder={t('tdw_ag_placeholder', 'Ask the agent to draft, schedule or review posts…')}
          maxRows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !composing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="tdw-ag-composer-bar">
          <div className="tdw-ag-composer-media editor rm-bg">
            <MultiMediaComponent
              allData={[{ content: text }]}
              text={text}
              label={t('attachments', 'Attachments')}
              description=""
              value={media}
              dummy={false}
              name="image"
              onChange={(e) => setMedia(e.target.value || [])}
              onOpen={() => {}}
              onClose={() => {}}
            />
          </div>
          <span className="flex-1" />
          <button
            type="button"
            className={cx('tdw-ag-send', canStop && 'is-stop')}
            disabled={!canSend && !canStop}
            onClick={canStop ? onStop : send}
            aria-label={canStop ? t('tdw_ag_stop', 'Stop') : t('tdw_ag_send', 'Send')}
            title={canStop ? t('tdw_ag_stop', 'Stop') : t('tdw_ag_send', 'Send')}
            data-copilotkit-in-progress={inProgress}
          >
            {canStop ? <span className="tdw-ag-stop" /> : <Icon name="arrow-up" size={18} />}
          </button>
        </div>
      </div>
      <p className="tdw-ag-composer-note">
        {t('tdw_ag_composer_note', 'Enter to send, Shift + Enter for a new line. The agent asks before it schedules anything.')}
      </p>
    </div>
  );
};

/* Every tool the agent runs shows as a card in the conversation */
const ToolRenderers: FC = () => {
  useDefaultTool({
    render: ({ name, args, status, result }) => (
      <ToolCard name={name} args={args as Record<string, any>} status={status} result={result} />
    ),
  });
  return null;
};

const ChatSurface: FC = () => {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const { messages, isLoading } = useCopilotChatInternal();
  const { setDraft } = useAgentWorkspace();
  const { mutate } = useAgentThreads();
  const empty = id === 'new' && !messages?.length && !isLoading;

  // the greeting sits between the header and the composer, which grows as
  // the user types: its height lives in a CSS variable
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const composer = surface.current?.querySelector<HTMLElement>(
      '.tdw-ag-composer-wrap'
    );
    if (!empty || !composer) return;
    const observer = new ResizeObserver(() =>
      surface.current?.style.setProperty(
        '--tdw-ag-composer-h',
        `${composer.offsetHeight}px`
      )
    );
    observer.observe(composer);
    return () => observer.disconnect();
  }, [empty]);

  return (
    <div ref={surface} className={cx('tdw-ag-chat', empty && 'is-empty')}>
      <CopilotChat
        className="tdw-ag-copilot"
        labels={{
          title: t('your_assistant', 'Your Assistant'),
          placeholder: t('tdw_ag_placeholder', 'Ask the agent to draft, schedule or review posts…'),
        }}
        icons={{ activityIcon: <Thinking /> }}
        UserMessage={UserMessage}
        AssistantMessage={AssistantMessage}
        Input={Composer}
        // a finished run may have created or renamed the chat
        onInProgress={(running) => {
          if (!running) mutate();
        }}
      />
      {/* an empty chat greets with suggested prompts above the composer */}
      {empty ? (
        <div className="tdw-ag-hero-layer">
          <SuggestedPrompts
            onPick={setDraft}
            footer={
              <p className="tdw-ag-hero-note">
                <Icon name="plug" size={13} />
                {t('tdw_ag_mcp_note', 'You can also use the agent as an MCP server: Settings → Public API.')}
              </p>
            }
          />
        </div>
      ) : null}
    </div>
  );
};

const AgentChatRuntime: FC = () => {
  const { backendUrl } = useVariables();
  const copilotConnection = useCopilotConnection();
  const params = useParams<{ id: string }>();
  const { selected, chatKey } = useAgentWorkspace();

  return (
    <CopilotKit
      // "New chat" while already on /agents/new starts over
      key={chatKey}
      {...(params.id === 'new' ? {} : { threadId: params.id })}
      {...copilotConnection}
      runtimeUrl={backendUrl + '/copilot/agent'}
      useSingleEndpoint={true}
      showDevConsole={false}
      enableInspector={false}
      agent="postiz"
      properties={{
        integrations: selected,
      }}
    >
      <Hooks />
      <LoadMessages id={params.id} />
      <ToolRenderers />
      <ChatSurface />
    </CopilotKit>
  );
};

/* The conversation when the server has no AI provider: the reason in place of
   the messages and a composer that can't send. The channel panel and the
   chats around it keep working. */
const AiNotConfigured: FC = () => {
  const t = useT();
  const user = useUser();
  return (
    <div className="tdw-ag-chat">
      <div className="tdw-ag-off">
        <TadweenEmptyState
          icon="plug"
          title={t('tdw_ai_not_configured', "AI isn't configured")}
          body={t(
            'tdw_ai_not_configured_description',
            'The agent needs an AI provider on this server. Ask your administrator to set it up.'
          )}
          action={
            (user as { admin?: boolean } | undefined)?.admin ? (
              <ol className="tdw-ag-steps">
                <li>
                  <span className="tdw-ag-step-n">1</span>
                  <span>
                    {t('tdw_ag_off_step1', 'Add an OpenAI API key to the backend environment as')}{' '}
                    <code dir="ltr">OPENAI_API_KEY</code>
                  </span>
                </li>
                <li>
                  <span className="tdw-ag-step-n">2</span>
                  <span>{t('tdw_ag_off_step2', 'Restart the backend so it picks the key up.')}</span>
                </li>
                <li>
                  <span className="tdw-ag-step-n">3</span>
                  <span>{t('tdw_ag_off_step3', 'Reload this page. The agent and the AI tools in the composer turn on by themselves.')}</span>
                </li>
              </ol>
            ) : null
          }
        />
      </div>
      <div className="tdw-ag-composer-wrap">
        <div className="tdw-ag-composer is-disabled">
          <textarea
            disabled
            rows={1}
            aria-label={t('tdw_ag_off_placeholder', "The agent can't reply until AI is configured")}
            placeholder={t('tdw_ag_off_placeholder', "The agent can't reply until AI is configured")}
          />
          <div className="tdw-ag-composer-bar">
            <span className="flex-1" />
            <button type="button" className="tdw-ag-send" disabled aria-label={t('tdw_ag_send', 'Send')}>
              <Icon name="arrow-up" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TadweenAgentChat: FC = () => (
  <AiOnly fallback={<AiNotConfigured />}>
    <AgentChatRuntime />
  </AiOnly>
);
