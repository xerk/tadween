'use client';

// The workspace toolbar: one floating bar of translucent material holding the
// date title, navigation, the Channels control, the view switch and Create.
// It drives Postiz's own calendar state through useCalendarNavigation (the
// same functions <Filters /> uses), so nothing about loading changes. The
// channels themselves (chips, filters, menus, customers, Add channel) live in
// the "All channels" sheet the Channels control opens.
import React, { FC, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useCalendarNavigation } from '@gitroom/frontend/components/launches/filters';
import { NewPost } from '@gitroom/frontend/components/launches/new.post';
import { GeneratorComponent } from '@gitroom/frontend/components/launches/generator/generator';
import { useChannelSelection } from '@gitroom/frontend/components/launches/select.channels';
import { Button, Icon, IconButton, SegmentedControl } from '@gitroom/frontend/components/tadween/ui';

type View = 'day' | 'week' | 'month' | 'list';

const useTitle = () => {
  const t = useT();
  // The board (display=list) is titled like the week or month it spans
  const { calendar, rangeUnit: display } = useCalendarNavigation();
  const { startDate, endDate } = calendar;
  return useMemo(() => {
    const start = newDayjs(startDate);
    const end = newDayjs(endDate);
    const sameMonth = start.month() === end.month();
    const title = sameMonth ? start.format('MMMM') : `${start.format('MMM')} – ${end.format('MMM')}`;
    const range =
      display === 'day'
        ? start.format('dddd, D MMMM')
        : display === 'week'
        ? `${sameMonth ? start.format('D') : start.format('D MMM')} – ${end.format('D MMM')} · ${t('tdw_ws_week_number', 'Week {{number}}', { number: start.isoWeek() })}`
        : t('tdw_ws_weeks_range', 'Weeks {{from}} – {{to}}', {
            from: start.startOf('isoWeek').isoWeek(),
            to: end.isoWeek(),
          });
    return { title, year: end.format('YYYY'), range };
  }, [startDate, endDate, display, t]);
};

// One small mark per network the workspace posts to (LinkedIn and LinkedIn
// Page count once), in the order the channels are listed
const useNetworkMarks = (channels: { identifier: string }[]) =>
  useMemo(() => {
    const seen = new Map<string, string>();
    channels.forEach((c) => {
      const network = c.identifier.split('-')[0];
      if (!seen.has(network)) seen.set(network, c.identifier);
    });
    return Array.from(seen.values());
  }, [channels]);

export const WorkspaceToolbar: FC<{
  hasChannels: boolean;
  showGenerator: boolean;
  onAddChannel: () => void;
  onOpenChannels: (anchor: DOMRect) => void;
  sideOpen: boolean;
  onToggleSide: () => void;
}> = ({ hasChannels, showGenerator, onAddChannel, onOpenChannels, sideOpen, onToggleSide }) => {
  const t = useT();
  const bar = useRef<HTMLElement>(null);
  const nav = useCalendarNavigation();
  const { calendar } = nav;
  const { title, year, range } = useTitle();
  const { channels, selectedIds, allSelected } = useChannelSelection();
  const marks = useNetworkMarks(channels);
  const shown = channels.filter((c) => selectedIds.includes(c.id)).length;
  const needsReconnect = channels.some((c) => c.refreshNeeded || c.inBetweenSteps);

  const views: { value: View; label: string }[] = [
    { value: 'day', label: t('day', 'Day') },
    { value: 'week', label: t('week', 'Week') },
    { value: 'month', label: t('month', 'Month') },
    { value: 'list', label: t('tdw_ws_board', 'Board') },
  ];
  const changeView = (view: View) =>
    view === 'day'
      ? nav.setDay()
      : view === 'week'
      ? nav.setWeek()
      : view === 'month'
      ? nav.setMonth()
      : nav.setList();

  const openChannels = () => bar.current && onOpenChannels(bar.current.getBoundingClientRect());
  const channelsLabel = allSelected
    ? t('tdw_ws_channels_count', '{{count}} channels', { count: channels.length })
    : t('tdw_ws_channels_shown_count', '{{shown}} of {{total}} channels shown', {
        shown,
        total: channels.length,
      });

  return (
    <header ref={bar} className="tdw-ui tdw-ws-bar">
      <div className="tdw-ws-bar-row">
        <div className="tdw-ws-title" aria-live="polite">
          <h1>
            {title} {!!year && <span>{year}</span>}
          </h1>
          <span className="tdw-ws-range">{range}</span>
        </div>

        <div className="tdw-ws-nav">
          <IconButton
            icon="chevron-left"
            size="sm"
            className="tdw-ws-flip tdw-ws-arrow"
            label={t('previous', 'Previous')}
            onClick={nav.previous}
          />
          <Button size="sm" onClick={nav.setToday}>
            {t('today', 'Today')}
          </Button>
          <IconButton
            icon="chevron-right"
            size="sm"
            className="tdw-ws-flip tdw-ws-arrow"
            label={t('next', 'Next')}
            onClick={nav.next}
          />
        </div>

        <span className="tdw-ws-grow" />

        {/* Channels: the networks in use and how many channels are shown */}
        <button
          type="button"
          className={clsx('tdw-ws-channels', !allSelected && 'is-filtered')}
          onClick={openChannels}
          aria-haspopup="dialog"
          aria-label={`${t('tdw_ws_all_channels', 'All channels')} · ${channelsLabel}`}
        >
          {marks.length ? (
            <span className="tdw-ws-marks" aria-hidden="true">
              {marks.map((identifier) => (
                <img
                  key={identifier}
                  src={
                    identifier === 'youtube'
                      ? '/icons/platforms/youtube.svg'
                      : `/icons/platforms/${identifier}.png`
                  }
                  alt=""
                />
              ))}
            </span>
          ) : (
            <Icon name="plug" size={15} />
          )}
          <span className="tdw-ws-count-label" aria-hidden="true">
            {allSelected
              ? channels.length
              : t('tdw_ws_n_of_m', '{{shown}} of {{total}}', { shown, total: channels.length })}
          </span>
          <Icon name="chevron-down" size={14} />
          {needsReconnect && (
            <i
              className="tdw-ws-alert-dot"
              title={t('channel_disconnected_click_to_reconnect', 'Channel disconnected, click to reconnect.')}
            />
          )}
        </button>

        <div className="tdw-ws-views">
          <SegmentedControl<View>
            size="sm"
            label={t('tdw_ws_view', 'View')}
            value={calendar.display as View}
            onChange={changeView}
            options={views}
          />
        </div>

        <div className="tdw-ws-create">
          {showGenerator && hasChannels && (
            <span className="tdw-ws-gen" data-tooltip-id="tooltip" data-tooltip-content={t('generate_posts', 'Generate posts')}>
              <GeneratorComponent />
            </span>
          )}
          {hasChannels ? (
            <span className="tdw-ws-new">
              <NewPost />
            </span>
          ) : (
            <Button variant="primary" icon="plus" onClick={onAddChannel}>
              {t('add_channel', 'Add Channel')}
            </Button>
          )}
        </div>

        {!sideOpen && (
          <IconButton
            icon="panel-right"
            className="tdw-ws-sidebtn tdw-ws-flip"
            label={t('tdw_ws_show_panel', 'Show side panel')}
            onClick={onToggleSide}
          />
        )}
      </div>
    </header>
  );
};
