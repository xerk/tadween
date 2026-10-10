'use client';

import { FC, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { useClickOutside } from '@mantine/hooks';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { countLength } from '@gitroom/helpers/utils/count.length';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import { TadweenIcon } from '@gitroom/frontend/components/tadween/editor/icons';
import { TadweenSheet } from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';

export interface EditorIssue {
  kind: 'empty' | 'too_long' | 'server';
  index: number;
  count?: number;
  limit?: number;
  // kind 'server': what `/posts/valid` said, and whether a setting is the cause
  message?: string;
  settings?: boolean;
}

// Read-only checks from what the editor already holds: the same "empty" and
// "too long" rules `/posts/valid` applies on save (stripHtmlValidation +
// countLength against the provider's maximum), run per block for every
// selected channel. Settings and media rules stay server-side; saving still
// goes through `/posts/valid` unchanged. Limits are the ones the counter
// uses (`chars`, from each provider's maximumCharacters).
// `blank` is a post nobody has started yet: no text or media anywhere, so the
// editor stays quiet instead of flagging every channel at once.
// What the last save got back from `/posts/valid` (serverChecks: settings
// errors and provider rules) joins the list for the channel it belongs to.
export const useEditorChecks = () => {
  const { selectedIntegrations, global, internal, chars, serverChecks } =
    useLaunchStore(
      useShallow((state) => ({
        selectedIntegrations: state.selectedIntegrations,
        global: state.global,
        internal: state.internal,
        chars: state.chars,
        serverChecks: state.serverChecks,
      }))
    );

  return useMemo(() => {
    const checks = selectedIntegrations
      .map(({ integration }) => {
        const values =
          internal.find((p) => p.integration.id === integration.id)
            ?.integrationValue || global;
        const limit = chars?.[integration.id] || 0;
        const issues: EditorIssue[] = [];
        values.forEach((value, index) => {
          const strip = stripHtmlValidation(
            'normal',
            value.content || '',
            true
          );
          const count = countLength(integration.identifier, strip);
          if (count === 0 && !(value.media || []).length) {
            issues.push({ kind: 'empty', index });
          }
          if (count > (limit || 1000000)) {
            issues.push({ kind: 'too_long', index, count, limit });
          }
        });
        serverChecks
          .filter((p) => p.id === integration.id)
          .forEach((p) =>
            issues.push({
              kind: 'server',
              index: 0,
              message: p.message,
              settings: p.settings,
            })
          );
        return { integration, issues, values };
      })
      .filter((p) => p.issues.length);

    const blank =
      !serverChecks.length &&
      checks.length === selectedIntegrations.length &&
      checks.every(
        (p) =>
          p.issues.filter((i) => i.kind === 'empty').length === p.values.length
      );

    return { checks: blank ? [] : checks, blank };
  }, [selectedIntegrations, global, internal, chars, serverChecks]);
};

const IssueLabel: FC<{ issue: EditorIssue }> = ({ issue }) => {
  const t = useT();
  if (issue.kind === 'server') {
    return <span>{issue.message}</span>;
  }

  const where =
    issue.index === 0
      ? t('tdw_the_post', 'The post')
      : `${t('tdw_comment', 'Comment')} ${issue.index}`;

  if (issue.kind === 'empty') {
    return (
      <span>
        {where}:{' '}
        {t('tdw_needs_text_or_media', 'needs text or an image')}
      </span>
    );
  }

  return (
    <span>
      {where}:{' '}
      {t('tdw_characters_over_limit', '{{n}} characters over the limit', {
        n: (issue.count! - issue.limit!).toLocaleString(),
      })}
    </span>
  );
};

// `onSettings` opens the channel settings, for an issue a setting causes;
// `onPickChannels` is where "Choose a channel" goes when none is selected.
export const EditorChecks: FC<{
  sheet?: boolean;
  onSettings?: () => void;
  onPickChannels?: () => void;
}> = ({ sheet, onSettings, onPickChannels }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const { checks, blank } = useEditorChecks();
  const { total, setCurrent, setHide } = useLaunchStore(
    useShallow((state) => ({
      total: state.selectedIntegrations.length,
      setCurrent: state.setCurrent,
      setHide: state.setHide,
    }))
  );

  const issueCount = checks.reduce((acc, p) => acc + p.issues.length, 0);

  // a new problem (like a rejected save) opens the list on its own
  const serverCount = checks.reduce(
    (acc, p) => acc + p.issues.filter((i) => i.kind === 'server').length,
    0
  );
  useEffect(() => {
    if (serverCount && !sheet) {
      setOpen(true);
    }
  }, [serverCount]);

  if (!total && onPickChannels && !sheet) {
    return (
      <div className="tdw-checks-anchor">
        <button
          type="button"
          className="tdw-checks is-issues"
          onClick={onPickChannels}
        >
          <TadweenIcon name="users" size={15} />
          <span className="tdw-checks-label">
            {t('tdw_choose_a_channel', 'Choose a channel')}
          </span>
        </button>
      </div>
    );
  }

  if (!total || blank) {
    return null;
  }

  const jump = (integration: Integrations, issue: EditorIssue) => {
    setOpen(false);
    setCurrent(integration.id);
    setHide(true);
    if (issue.settings) {
      onSettings?.();
    }
  };

  const label = issueCount
    ? t('tdw_n_to_fix', '{{count}} to fix', { count: issueCount })
    : t('tdw_ready_for_n', 'Ready for {{count}}', { count: total });

  // phones: a compact chip in the accessory bar, the list opens in a sheet
  if (sheet) {
    return (
      <>
        <button
          type="button"
          className={clsx(
            'tdw-checks tdw-cm-checks',
            issueCount ? 'is-issues' : 'is-ok'
          )}
          aria-label={label}
          aria-haspopup={issueCount ? 'dialog' : undefined}
          onClick={() => issueCount && setOpen(true)}
        >
          <TadweenIcon name={issueCount ? 'alert' : 'check'} size={16} />
          {!!issueCount && <span>{issueCount}</span>}
        </button>
        <TadweenSheet
          open={open && !!issueCount}
          onClose={() => setOpen(false)}
          title={t('tdw_fix_before_scheduling', 'Fix before scheduling')}
        >
          <p className="tdw-cm-sheet-hint">
            {t('tdw_tap_one_to_go_there', 'Tap one to go there.')}
          </p>
          <div className="tdw-cm-checks-list">
            <EditorChecksList checks={checks} onJump={jump} />
          </div>
        </TadweenSheet>
      </>
    );
  }

  return (
    <div
      ref={ref}
      className="tdw-checks-anchor"
      onKeyDown={(e) => {
        // Escape closes the list, not the composer behind it
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          // Next hydrates the whole document, so React and the modal's
          // Escape hotkey listen on the same node
          e.nativeEvent.stopImmediatePropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={clsx('tdw-checks', issueCount ? 'is-issues' : 'is-ok')}
        aria-label={label}
        aria-expanded={issueCount ? open : undefined}
        aria-haspopup={issueCount ? 'dialog' : undefined}
        onClick={() => issueCount && setOpen(!open)}
      >
        <TadweenIcon name={issueCount ? 'alert' : 'check'} size={15} />
        <span className="tdw-checks-label">{label}</span>
      </button>
      {open && !!issueCount && (
        <div className="tdw-checks-pop" role="dialog">
          <div className="tdw-checks-h">
            <b>{t('tdw_fix_before_scheduling', 'Fix before scheduling')}</b>
            <span>{t('tdw_tap_one_to_go_there', 'Tap one to go there.')}</span>
          </div>
          <EditorChecksList checks={checks} onJump={jump} />
        </div>
      )}
    </div>
  );
};

// Each channel with what to fix; tapping a line goes to that channel.
const EditorChecksList: FC<{
  checks: ReturnType<typeof useEditorChecks>['checks'];
  onJump: (integration: Integrations, issue: EditorIssue) => void;
}> = ({ checks, onJump }) => (
  <>
    {checks.map(({ integration, issues }) => (
      <div key={integration.id} className="tdw-checks-group">
        <div className="tdw-checks-who">
          <TadweenChannelAvatar integration={integration} size={20} />
          <span>{integration.name}</span>
        </div>
        {issues.map((issue, i) => (
          <button
            key={i}
            type="button"
            className="tdw-checks-item"
            onClick={() => onJump(integration, issue)}
          >
            <TadweenIcon name={issue.settings ? 'sliders' : 'type'} size={14} />
            <IssueLabel issue={issue} />
            <TadweenIcon name="chevron" size={14} className="tdw-checks-go" />
          </button>
        ))}
      </div>
    ))}
  </>
);
