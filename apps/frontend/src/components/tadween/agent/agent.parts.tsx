'use client';

import { FC, ReactNode, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { groupBy } from 'lodash';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import {
  Icon,
  IconName,
  LinkButton,
  Popover,
  cx,
} from '@gitroom/frontend/components/tadween/ui';
import { AgentChannel, useAgentChannels } from './agent.hooks';

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

// ── Channel context picker ──────────────────────────────────────────────────
/* One row of small network logos and a count (never an avatar stack) */
const NetworkMarks: FC<{ channels: AgentChannel[] }> = ({ channels }) => {
  const networks = Object.keys(groupBy(channels, (c) => c.identifier)).slice(0, 4);
  return (
    <span className="tdw-ag-marks" aria-hidden="true">
      {networks.map((n) => (
        <img key={n} src={n === 'youtube' ? '/icons/platforms/youtube.svg' : `/icons/platforms/${n}.png`} alt="" />
      ))}
    </span>
  );
};

export const ChannelContextPicker: FC<{
  selected: AgentChannel[];
  onChange: (channels: AgentChannel[]) => void;
}> = ({ selected, onChange }) => {
  const t = useT();
  const anchor = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { channels } = useAgentChannels();
  const customers = useMemo(
    () =>
      Object.values(
        groupBy(
          channels.filter((c) => c.customer?.id),
          (c) => c.customer!.id
        )
      ).map((list) => ({ id: list[0].customer!.id, name: list[0].customer!.name, list })),
    [channels]
  );
  const isOn = (c: AgentChannel) => selected.some((p) => p.id === c.id);
  const toggle = (c: AgentChannel) =>
    onChange(isOn(c) ? selected.filter((p) => p.id !== c.id) : [...selected, c]);

  const label = selected.length
    ? t('tdw_ag_n_channels', '{{count}} channels', { count: selected.length })
    : t('tdw_ag_choose_channels', 'Choose channels');

  return (
    <div className="pz-anchor tdw-ag-picker" ref={anchor}>
      <button
        type="button"
        className={cx('tdw-ag-chip', selected.length && 'is-on')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {selected.length ? <NetworkMarks channels={selected} /> : <Icon name="users" size={15} />}
        <span>{label}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={anchor} width={300} className="tdw-ag-pop">
        <div className="tdw-ag-pop-h">
          <span>{t('tdw_ag_post_to', 'The agent can post to')}</span>
          {selected.length ? (
            <button type="button" className="tdw-ag-pop-clear" onClick={() => onChange([])}>
              {t('tdw_ag_clear', 'Clear')}
            </button>
          ) : null}
        </div>
        {customers.length > 1 ? (
          <div className="tdw-ag-pop-customers" role="group" aria-label={t('select_customer', 'Select customer')}>
            {customers.map((c) => (
              <button key={c.id} type="button" className="tdw-ag-chip is-small" onClick={() => onChange(c.list.filter((p) => !p.disabled))}>
                {c.name}
              </button>
            ))}
          </div>
        ) : null}
        <ul className="tdw-ag-pop-list" role="listbox" aria-multiselectable="true">
          {channels.map((c) => {
            const on = isOn(c);
            const warn = c.refreshNeeded || c.inBetweenSteps;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  disabled={c.disabled}
                  className={cx('tdw-ag-pop-row', on && 'is-on')}
                  onClick={() => toggle(c)}
                >
                  <TadweenChannelAvatar integration={c} size={26} />
                  <span className="tdw-ag-pop-name">{c.name}</span>
                  {warn ? (
                    <span className="tdw-ag-pop-warn" title={t('tdw_an_reconnect_needed', 'Reconnect needed')}>
                      <Icon name="triangle-alert" size={13} />
                    </span>
                  ) : null}
                  <span className={cx('tdw-ag-check', on && 'is-on')} aria-hidden="true">
                    {on ? <Icon name="check" size={12} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="tdw-ag-pop-help">
          {t('tdw_ag_channels_help', 'Sent with your next message, so the agent knows where to post.')}
        </p>
      </Popover>
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
      <p className="tdw-ag-hero-sub">
        {t('tdw_ag_hero_sub', 'Choose channels below, then ask me to draft, schedule or review posts. I can also generate images and videos.')}
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
