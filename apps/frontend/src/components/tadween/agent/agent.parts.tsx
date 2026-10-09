'use client';

import { FC, ReactNode, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { groupBy } from 'lodash';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import {
  Icon,
  IconButton,
  IconName,
  LinkButton,
  Skeleton,
  cx,
} from '@gitroom/frontend/components/tadween/ui';
import {
  AgentChannel,
  useAgentChannels,
  useAgentNetworks,
  useAgentWorkspace,
} from './agent.hooks';

// Pieces of the agent chat, reusable by any CopilotKit chat in Tadween
// (docs/tadween/analytics-agent.md). Styles: app/tadween/agent.scss.

type T = ReturnType<typeof useT>;

// ── User bubble ─────────────────────────────────────────────────────────────
// The composer appends media and channel blocks to what the user typed (the
// agent reads them, see agent.chat.tsx); the bubble shows the text and the
// media as thumbnails and drops the channel block.
const MEDIA_BLOCK = /\[--Media--\]([\s\S]*?)\[--Media--\]/g;
const INTEGRATIONS_BLOCK = /\[--integrations--\][\s\S]*?\[--integrations--\]/g;

export const parseUserMessage = (raw: string) => {
  const media: { type: 'image' | 'video'; url: string }[] = [];
  const text = raw
    .replace(INTEGRATIONS_BLOCK, '')
    .replace(MEDIA_BLOCK, (_, block: string) => {
      block.split('\n').forEach((line) => {
        const m = line.trim().match(/^(Image|Video): (https?:\/\/\S+)$/);
        if (m) {
          media.push({ type: m[1] === 'Video' ? 'video' : 'image', url: m[2] });
        }
      });
      return '';
    })
    // history from before the media block: "Image: url" lines on their own
    .replace(/^(Image|Video): (https?:\/\/\S+)$/gm, (_, kind, url) => {
      media.push({ type: kind === 'Video' ? 'video' : 'image', url });
      return '';
    })
    .trim();
  return { text, media };
};

export const ChatBubble: FC<{ raw: string }> = ({ raw }) => {
  const { text, media } = useMemo(() => parseUserMessage(raw), [raw]);
  return (
    <div className="tdw-ag-user">
      <div className="tdw-ag-bubble" dir="auto">
        {media.length ? (
          <div className="tdw-ag-bubble-media">
            {media.map((m) =>
              m.type === 'video' ? (
                <video key={m.url} src={m.url} controls preload="metadata" />
              ) : (
                <img key={m.url} src={m.url} alt="" />
              )
            )}
          </div>
        ) : null}
        {text ? <div className="tdw-ag-bubble-text">{text}</div> : null}
      </div>
    </div>
  );
};

// ── Tool cards ──────────────────────────────────────────────────────────────
// One card per tool the agent ran. Known tools get a sentence and a preview;
// anything else shows its name and the raw input/output under "Details".

type ToolStatus = 'inProgress' | 'executing' | 'complete';

interface SchedulePostArgs {
  socialPost?: {
    integrationId: string;
    date: string;
    type?: 'draft' | 'schedule' | 'now';
    postsAndComments?: { content: string; attachments?: string[] }[];
  }[];
}

interface SchedulePostResult {
  output?: { postId: string; integration: string; previewUrl: string }[] | { errors: string };
}

const parseResult = (result: unknown) => {
  if (typeof result !== 'string') {
    return result;
  }
  try {
    return JSON.parse(result);
  } catch (e) {
    return result;
  }
};

const isScheduleTool = (name: string) => /schedulePost/i.test(name);

const toolCopy = (
  name: string,
  done: boolean,
  t: T,
  args: Record<string, any>,
  result: any
): { icon: IconName; title: string } => {
  if (isScheduleTool(name)) {
    const n = (args as SchedulePostArgs).socialPost?.length || 0;
    const types = (args as SchedulePostArgs).socialPost?.map((p) => p.type) || [];
    const failed = result?.output && !Array.isArray(result.output);
    if (failed) {
      return { icon: 'triangle-alert', title: t('tdw_ag_tool_schedule_failed', "Couldn't schedule the posts") };
    }
    const drafts = types.length > 0 && types.every((p) => p === 'draft');
    return {
      icon: 'calendar-days',
      title: done
        ? drafts
          ? t('tdw_ag_tool_drafted', 'Saved {{count}} drafts', { count: n })
          : t('tdw_ag_tool_scheduled', 'Scheduled {{count}} posts', { count: n })
        : t('tdw_ag_tool_scheduling', 'Scheduling {{count}} posts…', { count: n }),
    };
  }
  switch (name) {
    case 'postsListTool':
      return { icon: 'layout-list', title: done ? t('tdw_ag_tool_posts', 'Looked up your posts') : t('tdw_ag_tool_posts_running', 'Looking up your posts…') };
    case 'integrationList':
      return { icon: 'users', title: done ? t('tdw_ag_tool_channels', 'Checked your channels') : t('tdw_ag_tool_channels_running', 'Checking your channels…') };
    case 'integrationSchema':
      return { icon: 'shield-check', title: done ? t('tdw_ag_tool_rules', "Read the network's posting rules") : t('tdw_ag_tool_rules_running', "Reading the network's posting rules…") };
    case 'postSettingsTool':
      return { icon: 'settings', title: done ? t('tdw_ag_tool_settings', 'Updated post settings') : t('tdw_ag_tool_settings_running', 'Updating post settings…') };
    case 'generateImageTool':
      return { icon: 'image', title: done ? t('tdw_ag_tool_image', 'Generated an image') : t('tdw_ag_tool_image_running', 'Generating an image…') };
    case 'generateVideoTool':
    case 'videoFunctionTool':
    case 'videoStatusTool':
      return { icon: 'play', title: done ? t('tdw_ag_tool_video', 'Worked on a video') : t('tdw_ag_tool_video_running', 'Working on a video…') };
    case 'groupList':
      return { icon: 'building-2', title: done ? t('tdw_ag_tool_customers', 'Checked your customers') : t('tdw_ag_tool_customers_running', 'Checking your customers…') };
    default:
      return {
        icon: 'zap',
        title: done
          ? t('tdw_ag_tool_used', 'Used {{name}}', { name })
          : t('tdw_ag_tool_using', 'Using {{name}}…', { name }),
      };
  }
};

// post HTML to text, paragraph breaks kept (same as Today)
const plainText = (html: string) =>
  stripHtmlValidation(
    'none',
    html.replace(/<\/p>\s*<p/gi, '</p>\n<p'),
    false,
    true,
    false
  ).trim();

const firstImage = (value: any): string | undefined => {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  return text.match(/https?:\/\/[^"'\s]+\.(?:png|jpe?g|webp|gif)/i)?.[0];
};

const SchedulePreview: FC<{
  args: SchedulePostArgs;
  result?: SchedulePostResult;
  channels: AgentChannel[];
  t: T;
}> = ({ args, result, channels, t }) => {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || 'en').replace('_', '-');
  const whenText = (d: dayjs.Dayjs) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };
    try {
      return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : lang, options).format(d.toDate());
    } catch (e) {
      return new Intl.DateTimeFormat('en', options).format(d.toDate());
    }
  };
  const outputs = Array.isArray(result?.output) ? result!.output : [];
  const posts = args.socialPost || [];
  const first = posts
    .map((p) => dayjs.utc(p.date))
    .filter((d) => d.isValid())
    .sort((a, b) => a.valueOf() - b.valueOf())[0];
  return (
    <>
      <ul className="tdw-ag-tool-posts">
        {posts.map((post, i) => {
          const channel = channels.find((c) => c.id === post.integrationId);
          const when = dayjs.utc(post.date).local();
          const text = plainText(post.postsAndComments?.[0]?.content || '');
          const preview = outputs.find((o) => o.integration === post.integrationId) || outputs[i];
          return (
            <li key={i} className="tdw-ag-tool-post">
              {channel ? <TadweenChannelAvatar integration={channel} size={28} /> : <span className="tdw-ag-tool-dot" />}
              <div className="tdw-ag-tool-post-copy">
                <div className="tdw-ag-tool-post-meta">
                  <span className="tdw-ag-tool-post-ch">{channel?.name || t('tdw_ag_channel', 'Channel')}</span>
                  {when.isValid() ? <span>{whenText(when)}</span> : null}
                  {post.type === 'draft' ? <span className="tdw-pill">{t('draft', 'Draft')}</span> : null}
                </div>
                {text ? <p className="tdw-ag-tool-post-text" dir="auto">{text}</p> : null}
              </div>
              {preview?.previewUrl ? (
                <a className="tdw-ag-tool-open" href={preview.previewUrl} target="_blank" rel="noopener noreferrer" aria-label={t('preview', 'Preview')} title={t('preview', 'Preview')}>
                  <Icon name="eye" size={15} />
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
      {outputs.length && first ? (
        <div className="tdw-ag-tool-actions">
          <LinkButton
            size="sm"
            icon="calendar"
            href={`/launches?startDate=${first.local().startOf('isoWeek').format('YYYY-MM-DD')}&endDate=${first.local().endOf('isoWeek').format('YYYY-MM-DD')}&display=week`}
          >
            {t('today_open_in_calendar', 'Open in calendar')}
          </LinkButton>
        </div>
      ) : null}
    </>
  );
};

/* ToolCard: what the agent did, with a preview when the tool is known */
export const ToolCard: FC<{
  name: string;
  args: Record<string, any>;
  status: ToolStatus;
  result?: unknown;
}> = ({ name, args, status, result }) => {
  const t = useT();
  const { channels } = useAgentChannels();
  const done = status === 'complete';
  const parsed = useMemo(() => parseResult(result), [result]);
  const copy = toolCopy(name, done, t, args || {}, parsed);
  const failed = isScheduleTool(name) && parsed?.output && !Array.isArray(parsed.output);
  const image = done && name === 'generateImageTool' ? firstImage(parsed) : undefined;

  return (
    <div className={cx('tdw-ag-tool', !done && 'is-running', failed && 'is-failed')} role="status">
      <div className="tdw-ag-tool-h">
        <span className="tdw-ag-tool-icon" aria-hidden="true">
          <Icon name={done ? copy.icon : 'loader-circle'} size={15} />
        </span>
        <span className="tdw-ag-tool-title">{copy.title}</span>
        {done && !failed ? <Icon name="check" size={14} className="tdw-ag-tool-ok" /> : null}
      </div>
      {isScheduleTool(name) && args?.socialPost?.length ? (
        failed ? (
          <p className="tdw-ag-tool-error">{String(parsed.output.errors)}</p>
        ) : (
          <SchedulePreview args={args as SchedulePostArgs} result={parsed as SchedulePostResult} channels={channels} t={t} />
        )
      ) : null}
      {image ? <img className="tdw-ag-tool-image" src={image} alt="" /> : null}
      {done && !isScheduleTool(name) ? (
        <details className="tdw-ag-tool-details">
          <summary>{t('tdw_ag_details', 'Details')}</summary>
          <pre dir="ltr">{JSON.stringify({ input: args, output: parsed }, null, 2).slice(0, 4000)}</pre>
        </details>
      ) : null}
    </div>
  );
};

// ── Channels ────────────────────────────────────────────────────────────────
// Like Postiz's agent page: every connected channel, multi-select, and the
// ticked ones go to the agent with each message (agent.chat.tsx). The panel is
// the only control that changes the selection.

const ChannelState: FC<{ channel: AgentChannel }> = ({ channel }) => {
  const t = useT();
  if (channel.disabled) {
    return <span className="tdw-ag-ch-state">{t('tdw_an_disabled', 'Disabled')}</span>;
  }
  if (channel.inBetweenSteps) {
    return (
      <span className="tdw-ag-ch-state is-warn">
        <Icon name="info" size={12} />
        {t('tdw_an_finish_setup', 'Finish setup')}
      </span>
    );
  }
  if (channel.refreshNeeded) {
    return (
      <span className="tdw-ag-ch-state is-bad">
        <Icon name="refresh-cw" size={12} />
        {t('tdw_an_reconnect_needed', 'Reconnect needed')}
      </span>
    );
  }
  return null;
};

// the search field shows from this many channels
const CHANNEL_SEARCH_FROM = 6;

/* ChannelPanel: the workspace's channel list (desktop panel and phone sheet).
   `onCollapse` adds the collapse button; `collapsed` shows avatars only. */
export const ChannelPanel: FC<{
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}> = ({ collapsed, onCollapse }) => {
  const t = useT();
  const { selected, setSelected } = useAgentWorkspace();
  const { channels, isLoading } = useAgentChannels();
  const { data: networks } = useAgentNetworks();
  const [query, setQuery] = useState('');
  const [customer, setCustomer] = useState<string>();

  const networkName = useMemo(() => {
    const names = new Map((networks?.social || []).map((s) => [s.identifier, s.name]));
    return (identifier: string) => names.get(identifier) || identifier;
  }, [networks]);

  const customers = useMemo(
    () =>
      Object.values(
        groupBy(
          channels.filter((c) => c.customer?.id),
          (c) => c.customer!.id
        )
      ).map((list) => ({ id: list[0].customer!.id, name: list[0].customer!.name })),
    [channels]
  );

  // a customer whose channels are gone stops filtering
  const activeCustomer = customers.some((c) => c.id === customer) ? customer : undefined;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return channels.filter(
      (c) =>
        (!activeCustomer || c.customer?.id === activeCustomer) &&
        (!q ||
          c.name.toLowerCase().includes(q) ||
          networkName(c.identifier).toLowerCase().includes(q))
    );
  }, [channels, activeCustomer, query, networkName]);

  const isOn = (c: AgentChannel) => selected.some((p) => p.id === c.id);
  const toggle = (c: AgentChannel) =>
    setSelected(isOn(c) ? selected.filter((p) => p.id !== c.id) : [...selected, c]);
  // disabled channels can't be posted to, so they are never selected
  const selectable = visible.filter((c) => !c.disabled);
  const allOn = selectable.length > 0 && selectable.every(isOn);
  const selectAll = () => setSelected([...selected, ...selectable.filter((c) => !isOn(c))]);

  const count = t('tdw_ag_channels_count', '{{selected}} of {{total}} selected', {
    selected: selected.length,
    total: channels.filter((c) => !c.disabled).length,
  });

  if (collapsed) {
    return (
      <div className="tdw-ag-channels-body is-collapsed">
        <IconButton
          icon="chevron-right"
          label={t('tdw_ag_expand_channels', 'Show channel names')}
          className="tdw-ag-ch-toggle"
          aria-expanded={false}
          onClick={() => onCollapse?.(false)}
        />
        <span className="tdw-ag-ch-count-mini" title={count} aria-label={count}>
          {selected.length}
        </span>
        <div className="tdw-ag-ch-mini-list" role="group" aria-label={t('channels', 'Channels')}>
          {channels.map((c) => {
            const on = isOn(c);
            const label = [
              c.name,
              networkName(c.identifier),
              c.refreshNeeded || c.inBetweenSteps
                ? t('tdw_an_reconnect_needed', 'Reconnect needed')
                : '',
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={label}
                title={label}
                disabled={c.disabled}
                className={cx('tdw-ag-ch-mini', on && 'is-on')}
                onClick={() => toggle(c)}
              >
                <TadweenChannelAvatar integration={c} size={36} />
                {on ? (
                  <span className="tdw-ag-ch-mini-tick" aria-hidden="true">
                    <Icon name="check" size={10} />
                  </span>
                ) : null}
                {c.refreshNeeded || c.inBetweenSteps ? (
                  <span className="tdw-ag-ch-mini-warn" aria-hidden="true">
                    !
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="tdw-ag-channels-body">
      <div className="tdw-ag-ch-head">
        <div className="tdw-ag-ch-heading">
          {/* the phone sheet has its own title */}
          {onCollapse ? <h2 className="tdw-ag-ch-title">{t('channels', 'Channels')}</h2> : null}
          <span className="tdw-ag-ch-count" aria-live="polite">
            {count}
          </span>
        </div>
        {onCollapse ? (
          <IconButton
            icon="chevron-left"
            label={t('tdw_ag_collapse_channels', 'Hide channel names')}
            className="tdw-ag-ch-toggle"
            aria-expanded={true}
            onClick={() => onCollapse(true)}
          />
        ) : null}
      </div>
      <p className="tdw-ag-ch-help">
        {t('tdw_ag_channels_help', 'The agent posts only to the channels you tick. They go with every message you send.')}
      </p>
      {channels.length >= CHANNEL_SEARCH_FROM ? (
        <label className="tdw-ag-search">
          <Icon name="search" size={15} />
          <span className="sr-only">{t('tdw_ag_search_channels', 'Search channels')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tdw_ag_search_channels', 'Search channels')}
          />
        </label>
      ) : null}
      {customers.length > 1 ? (
        <div className="tdw-ag-ch-customers" role="group" aria-label={t('select_customer', 'Select customer')}>
          <button
            type="button"
            className={cx('tdw-ag-chip is-small', !activeCustomer && 'is-on')}
            aria-pressed={!activeCustomer}
            onClick={() => setCustomer(undefined)}
          >
            {t('tdw_ag_all_customers', 'All customers')}
          </button>
          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cx('tdw-ag-chip is-small', activeCustomer === c.id && 'is-on')}
              aria-pressed={activeCustomer === c.id}
              onClick={() => setCustomer(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}
      {channels.length ? (
        <div className="tdw-ag-ch-actions">
          <button type="button" className="tdw-ag-ch-link" disabled={allOn} onClick={selectAll}>
            {t('tdw_ag_select_all', 'Select all')}
          </button>
          <button type="button" className="tdw-ag-ch-link" disabled={!selected.length} onClick={() => setSelected([])}>
            {t('tdw_ag_clear', 'Clear')}
          </button>
        </div>
      ) : null}
      {isLoading ? (
        <div className="tdw-ag-ch-list" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tdw-ag-ch">
              <Skeleton width={36} height={36} radius={10} />
              <span className="tdw-ag-ch-copy">
                <Skeleton width={110} height={12} />
                <Skeleton width={70} height={10} className="mt-[6px]" />
              </span>
            </div>
          ))}
        </div>
      ) : !channels.length ? (
        <div className="tdw-ag-ch-empty">
          <p>{t('tdw_ag_no_channels', 'No channels yet. Connect one from the calendar and it shows up here.')}</p>
          <LinkButton href="/launches" size="sm" icon="plus">
            {t('tdw_ag_add_channel', 'Add a channel')}
          </LinkButton>
        </div>
      ) : visible.length ? (
        <div className="tdw-ag-ch-list" role="group" aria-label={t('channels', 'Channels')}>
          {visible.map((c) => {
            const on = isOn(c);
            return (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={c.disabled}
                className={cx('tdw-ag-ch', on && 'is-on')}
                onClick={() => toggle(c)}
              >
                <TadweenChannelAvatar integration={c} size={36} />
                <span className="tdw-ag-ch-copy">
                  <span className="tdw-ag-ch-name">{c.name}</span>
                  <span className="tdw-ag-ch-meta">{networkName(c.identifier)}</span>
                  <ChannelState channel={c} />
                </span>
                <span className={cx('tdw-ag-check', on && 'is-on')} aria-hidden="true">
                  {on ? <Icon name="check" size={12} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="tdw-ag-ch-empty">
          {query.trim()
            ? t('tdw_ag_no_channel_match', 'No channels match "{{query}}"', { query })
            : t('tdw_ag_no_customer_channels', 'This customer has no channels.')}
        </p>
      )}
    </div>
  );
};

// ── Suggested prompts ───────────────────────────────────────────────────────
export const usePromptSuggestions = () => {
  const t = useT();
  return [
    {
      icon: 'pencil' as IconName,
      title: t('tdw_ag_s1_title', 'Write a LinkedIn post'),
      prompt: t('tdw_ag_s1', 'Write a LinkedIn post announcing our new feature. Keep it under 150 words, end with a question, and schedule it for Tuesday at 10:00.'),
    },
    {
      icon: 'calendar-days' as IconName,
      title: t('tdw_ag_s2_title', 'Plan my week'),
      prompt: t('tdw_ag_s2', 'Plan a week of LinkedIn posts about our product launch: one post every weekday at 9:00, each with a different angle. Save them as drafts.'),
    },
    {
      icon: 'languages' as IconName,
      title: t('tdw_ag_s3_title', 'English and Arabic'),
      prompt: t('tdw_ag_s3', 'Write the same LinkedIn post in English and in Arabic (Egyptian business tone) about hiring for our team.'),
    },
    {
      icon: 'layout-list' as IconName,
      title: t('tdw_ag_s4_title', "What's coming up"),
      prompt: t('tdw_ag_s4', 'What is scheduled for next week? List the posts by day and channel.'),
    },
  ];
};

export const SuggestedPrompts: FC<{
  onPick: (prompt: string) => void;
  footer?: ReactNode;
}> = ({ onPick, footer }) => {
  const t = useT();
  const suggestions = usePromptSuggestions();
  return (
    <div className="tdw-ag-hero">
      <span className="tdw-ag-hero-mark" aria-hidden="true">
        <Icon name="sparkles" size={22} />
      </span>
      <h2 className="tdw-ag-hero-title">{t('tdw_ag_hero_title', 'What should we post?')}</h2>
      {/* the channel panel is a side panel on desktop and a sheet on phones */}
      <p className="tdw-ag-hero-sub tdw-ag-desktop-only">
        {t('tdw_ag_hero_sub', 'Select the channels I should use from the Channels panel on the left, then ask me to draft, schedule or review posts. I can schedule to several channels at once and generate images and videos. Your past chats are on the right.')}
      </p>
      <p className="tdw-ag-hero-sub tdw-ag-phone-only">
        {t('tdw_ag_hero_sub_phone', 'Tap Channels at the top to select the channels I should use, then ask me to draft, schedule or review posts. I can schedule to several channels at once and generate images and videos.')}
      </p>
      <div className="tdw-ag-prompts">
        {suggestions.map((s) => (
          <button key={s.title} type="button" className="tdw-ag-prompt" onClick={() => onPick(s.prompt)}>
            <span className="tdw-ag-prompt-h">
              <Icon name={s.icon} size={15} />
              {s.title}
            </span>
            <span className="tdw-ag-prompt-text" dir="auto">{s.prompt}</span>
          </button>
        ))}
      </div>
      {footer}
    </div>
  );
};
