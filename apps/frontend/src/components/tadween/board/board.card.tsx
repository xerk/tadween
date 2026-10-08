'use client';

// A board card, Jira-issue style: channel marks, the post's first lines, when,
// labels, and quick actions on hover (the ⋯ menu holds every action). Enter
// or a click opens it. Styles: app/tadween/board.scss.
import React, { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Icon } from '@gitroom/frontend/components/tadween/ui';
import {
  ChipAction,
  ChipMoreMenu,
} from '@gitroom/frontend/components/tadween/workspace/chip.more.menu';
import type { BoardTone } from '@gitroom/frontend/components/tadween/board/board';

export interface BoardCardChannel {
  id: string;
  name: string;
  picture?: string | null;
  // Provider identifier, e.g. linkedin, linkedin-page, x
  identifier: string;
}

export interface BoardCardTag {
  name: string;
  color?: string | null;
}

// Marks shown before "+N"
const MAX_MARKS = 4;

const ChannelMark: FC<{ channel: BoardCardChannel; size: number }> = ({ channel, size }) => (
  <span className="tdw-bcard-mark" style={{ width: size, height: size }} title={channel.name}>
    <img
      className="tdw-bcard-avatar"
      src={channel.picture || '/no-picture.jpg'}
      alt=""
      onError={(e) => {
        e.currentTarget.src = '/no-picture.jpg';
      }}
    />
    <img className="tdw-bcard-network" src={`/icons/platforms/${channel.identifier}.png`} alt="" />
  </span>
);

export const BoardCard: FC<{
  tone: BoardTone;
  channels: BoardCardChannel[];
  text: string;
  // Formatted date/time for the chip, and its full form for the tooltip
  when?: string;
  whenTitle?: string;
  tags?: BoardCardTag[];
  customer?: string;
  error?: string;
  // Extra marks on the card (e.g. how the post was created)
  badge?: ReactNode;
  // Inline quick actions (shown on hover); `actions` all go in the ⋯ menu
  quickActions?: ChipAction[];
  actions: ChipAction[];
  onOpen: () => void;
  openLabel: string;
  density?: 'comfortable' | 'compact';
}> = ({
  tone,
  channels,
  text,
  when,
  whenTitle,
  tags = [],
  customer,
  error,
  badge,
  quickActions = [],
  actions,
  onOpen,
  openLabel,
  density = 'comfortable',
}) => {
  const t = useT();
  const shown = channels.slice(0, MAX_MARKS);
  const more = channels.length - shown.length;
  return (
    <article
      className={clsx('tdw-bcard', density === 'compact' && 'is-compact')}
      data-tone={tone}
      tabIndex={0}
      aria-label={openLabel}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="tdw-bcard-top">
        <span className="tdw-bcard-marks">
          {shown.map((channel) => (
            <ChannelMark key={channel.id} channel={channel} size={density === 'compact' ? 20 : 24} />
          ))}
          {more > 0 && <span className="tdw-bcard-more">+{more}</span>}
          {channels.length === 1 && <span className="tdw-bcard-channel">{channels[0].name}</span>}
        </span>
        {when && (
          <span className="tdw-bcard-when" title={whenTitle}>
            <Icon name="clock" size={12} />
            {when}
          </span>
        )}
      </div>

      <p className="tdw-bcard-text" dir="auto">
        {text || <span className="tdw-bcard-empty">{t('no_content', 'no content')}</span>}
      </p>

      {tone === 'failed' && (
        <p className="tdw-bcard-error" dir="auto">
          <Icon name="triangle-alert" size={12} />
          <span>{error || t('tdw_board_failed_generic', 'An error occurred while publishing this post')}</span>
        </p>
      )}

      {(!!tags.length || customer || badge) && (
        <div className="tdw-bcard-foot">
          {tags.map((tag) => (
            <span
              key={tag.name}
              className="tdw-bcard-tag"
              style={{ ['--tag' as string]: tag.color || 'var(--tdw-muted-foreground)' }}
            >
              {tag.name}
            </span>
          ))}
          {customer && (
            <span className="tdw-bcard-customer">
              <Icon name="user" size={12} />
              {customer}
            </span>
          )}
          {badge}
        </div>
      )}

      <div className="tdw-bcard-acts" onClick={(e) => e.stopPropagation()}>
        {quickActions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={clsx('tdw-bcard-act', action.danger && 'is-danger')}
            aria-label={action.label}
            title={action.label}
            onClick={action.onClick}
          >
            {action.icon}
          </button>
        ))}
        <ChipMoreMenu actions={actions} className="tdw-bcard-act" />
      </div>
    </article>
  );
};
