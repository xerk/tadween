'use client';

// Channel chips for the calendar workspace toolbar and the channels sheet.
// A chip is the channel's avatar with its network badge: clicking it shows or
// hides the channel's posts (Postiz's own `selectedChannels` filter), the
// corner button opens Postiz's channel menu (launches/menu/menu.tsx, unchanged),
// and the red badge reconnects a channel that needs it.
import React, { FC } from 'react';
import clsx from 'clsx';
import { Integration } from '@prisma/client';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Menu } from '@gitroom/frontend/components/launches/menu/menu';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { useChannelSelection } from '@gitroom/frontend/components/launches/select.channels';
import { Icon } from '@gitroom/frontend/components/tadween/ui';

// What the channel menu needs; owned by LaunchesComponent.
export interface ChannelMenuHandlers {
  refreshChannel: (
    integration: Integration & { identifier: string }
  ) => () => void;
  continueIntegration: (integration: Integration) => () => void;
  mutate: () => void;
  update: (shouldReload: boolean) => void;
  totalNonDisabledChannels: number;
}

type WorkspaceChannel = Integrations & {
  refreshNeeded?: boolean;
};

export const ChannelAvatar: FC<{
  channel: Pick<Integrations, 'identifier' | 'picture' | 'name'>;
  size?: number;
}> = ({ channel, size = 30 }) => (
  <span className="tdw-ws-av" style={{ width: size, height: size }}>
    <ImageWithFallback
      fallbackSrc="/no-picture.jpg"
      src={channel.picture || '/no-picture.jpg'}
      className="tdw-ws-av-img"
      alt={channel.name}
      width={size}
      height={size}
    />
    <img
      className="tdw-ws-av-net"
      src={
        channel.identifier === 'youtube'
          ? '/icons/platforms/youtube.svg'
          : `/icons/platforms/${channel.identifier}.png`
      }
      alt=""
    />
  </span>
);

export const ChannelChip: FC<{
  channel: WorkspaceChannel;
  shown: boolean;
  onToggle: () => void;
  onSolo: () => void;
  handlers: ChannelMenuHandlers;
}> = ({ channel, shown, onToggle, onSolo, handlers }) => {
  const t = useT();
  const user = useUser();
  const needsAction = channel.refreshNeeded || channel.inBetweenSteps;
  const status = channel.refreshNeeded
    ? t('channel_disconnected_click_to_reconnect', 'Channel disconnected, click to reconnect.')
    : channel.disabled
    ? t('tdw_ws_channel_disabled', 'Disabled')
    : '';

  return (
    <div
      className={clsx(
        'tdw-ws-chip',
        !shown && 'is-off',
        channel.disabled && 'is-disabled',
        needsAction && 'is-alert'
      )}
    >
      <button
        type="button"
        className="tdw-ws-chip-av"
        aria-pressed={shown}
        aria-label={`${channel.name}${status ? ` · ${status}` : ''}`}
        data-tooltip-id="tooltip"
        data-tooltip-content={`${channel.name}${status ? ` · ${status}` : ''}`}
        onClick={(e) => (e.altKey ? onSolo() : onToggle())}
        onDoubleClick={onSolo}
      >
        <ChannelAvatar channel={channel} size={28} />
      </button>
      {needsAction && (
        <button
          type="button"
          className="tdw-ws-chip-alert"
          aria-label={t('tdw_ws_reconnect', 'Reconnect')}
          data-tooltip-id="tooltip"
          data-tooltip-content={t(
            'channel_disconnected_click_to_reconnect',
            'Channel disconnected, click to reconnect.'
          )}
          onClick={
            channel.refreshNeeded
              ? handlers.refreshChannel(channel as any)
              : handlers.continueIntegration(channel as any)
          }
        >
          !
        </button>
      )}
      <span
        className="tdw-ws-chip-menu"
        aria-label={t('tdw_ws_channel_menu', 'Channel menu')}
      >
        <Menu
          canChangeProfilePicture={channel.changeProfilePicture}
          canChangeNickName={channel.changeNickName}
          refreshChannel={handlers.refreshChannel}
          mutate={handlers.mutate}
          onChange={handlers.update}
          id={channel.id}
          canEnable={
            user?.totalChannels! > handlers.totalNonDisabledChannels &&
            !!channel.disabled
          }
          canDisable={!channel.disabled}
        />
      </span>
    </div>
  );
};

// The row of chips. `max` caps the toolbar; the rest open in the sheet.
export const ChannelStrip: FC<{
  handlers: ChannelMenuHandlers;
  onAddChannel: () => void;
  onShowAll?: () => void;
  max?: number;
  wrap?: boolean;
}> = ({ handlers, onAddChannel, onShowAll, max = Infinity, wrap }) => {
  const t = useT();
  const { channels, selectedIds, allSelected, toggle, setSelectedChannels } =
    useChannelSelection();
  const visible = channels.slice(0, max);
  const hidden = channels.length - visible.length;

  return (
    <div
      className={clsx('tdw-ws-strip', wrap && 'is-wrap')}
      role="group"
      aria-label={t('tdw_ws_channels_shown', 'Channels shown on the calendar')}
    >
      {visible.map((channel) => (
        <ChannelChip
          key={channel.id}
          channel={channel}
          shown={selectedIds.includes(channel.id)}
          onToggle={toggle(channel.id)}
          onSolo={() => setSelectedChannels([channel.id])}
          handlers={handlers}
        />
      ))}
      {hidden > 0 && onShowAll && (
        <button
          type="button"
          className="tdw-ws-chip-count"
          onClick={onShowAll}
          aria-label={t('tdw_ws_all_channels', 'All channels')}
        >
          +{hidden}
        </button>
      )}
      {!allSelected && (
        <button
          type="button"
          className="tdw-ws-strip-reset"
          onClick={() => setSelectedChannels(null)}
        >
          {t('tdw_ws_show_all', 'Show all')}
        </button>
      )}
      <button
        type="button"
        className="tdw-ws-chip-add"
        onClick={onAddChannel}
        aria-label={t('add_channel', 'Add Channel')}
        data-tooltip-id="tooltip"
        data-tooltip-content={t('add_channel', 'Add Channel')}
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
};
