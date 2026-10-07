'use client';

// The workspace toolbar: one floating bar of translucent material holding the
// date title, navigation, channel chips, customer picker, view switch and
// Create. It drives Postiz's own calendar state through useCalendarNavigation
// (the same functions <Filters /> uses), so nothing about loading changes.
import React, { FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useCalendarNavigation } from '@gitroom/frontend/components/launches/filters';
import { SelectCustomer } from '@gitroom/frontend/components/launches/select.customer';
import { NewPost } from '@gitroom/frontend/components/launches/new.post';
import { GeneratorComponent } from '@gitroom/frontend/components/launches/generator/generator';
import { useChannelSelection } from '@gitroom/frontend/components/launches/select.channels';
import { Button, Icon, IconButton, SegmentedControl } from '@gitroom/frontend/components/tadween/ui';
import {
  ChannelAvatar,
  ChannelMenuHandlers,
  ChannelStrip,
} from '@gitroom/frontend/components/tadween/workspace/channel.strip';

type View = 'day' | 'week' | 'month' | 'list';

// One chip; the strip's own padding + "+" + "All channels"; "Show all";
// the compact "Channels" button that replaces the strip
const CHIP_WIDTH = 34;
const STRIP_EXTRA = 116;
const RESET_WIDTH = 84;
const CHANNELS_BUTTON = 92;
const MAX_CHIPS = 8;
// Once tight, the bar must gain this much before the labels come back
// (tight itself narrows what's measured, so it needs hysteresis)
const TIGHT_RELEASE = 160;

const useTitle = () => {
  const t = useT();
  const { calendar } = useCalendarNavigation();
  const { startDate, endDate, display } = calendar;
  return useMemo(() => {
    const start = newDayjs(startDate);
    const end = newDayjs(endDate);
    if (display === 'list') {
      return { title: t('tdw_ws_all_posts', 'All posts'), year: '', range: '' };
    }
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

export const WorkspaceToolbar: FC<{
  handlers: ChannelMenuHandlers;
  hasChannels: boolean;
  showGenerator: boolean;
  onAddChannel: () => void;
  onOpenChannels: (anchor: DOMRect) => void;
  sideOpen: boolean;
  onToggleSide: () => void;
}> = ({ handlers, hasChannels, showGenerator, onAddChannel, onOpenChannels, sideOpen, onToggleSide }) => {
  const t = useT();
  const bar = useRef<HTMLElement>(null);
  const nav = useCalendarNavigation();
  const { calendar, isListView } = nav;
  const { title, year, range } = useTitle();
  const { channels, allSelected } = useChannelSelection();

  // Chips get whatever width the rest of the bar leaves (measured, since
  // labels change with the language and view); under three, one "Channels"
  // button takes their place and the sheet holds the full list.
  // When even the compact bar doesn't fit, it goes "tight": Create shows only
  // its "+" and the customer picker lives in the sheet.
  const [chipsMax, setChipsMax] = useState(0);
  const [tight, setTight] = useState(false);
  const tightAt = useRef(0);
  const measure = useCallback(() => {
    const row = bar.current?.firstElementChild as HTMLElement | null;
    if (!row) return;
    const width = row.clientWidth;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    let used = 0;
    for (const el of Array.from(row.children) as HTMLElement[]) {
      if (el.matches('.tdw-ws-strip-wrap, .tdw-ws-channels, .tdw-ws-grow')) continue;
      if (getComputedStyle(el).display === 'none') continue;
      used += el.offsetWidth + gap;
    }
    const strip = STRIP_EXTRA + (allSelected ? 0 : RESET_WIDTH);
    const next = Math.max(0, Math.min(MAX_CHIPS, Math.floor((width - used - strip - 8) / CHIP_WIDTH)));
    setChipsMax((current) => (current === next ? current : next));
    if (!tightAt.current && used + CHANNELS_BUTTON + gap > width) {
      tightAt.current = width;
      setTight(true);
    } else if (tightAt.current && width > tightAt.current + TIGHT_RELEASE) {
      tightAt.current = 0;
      setTight(false);
    }
  }, [allSelected]);
  useLayoutEffect(measure, [measure, title, range, isListView, sideOpen, hasChannels, showGenerator, channels.length, tight]);
  useEffect(() => {
    if (!bar.current) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(bar.current);
    return () => observer.disconnect();
  }, [measure]);
  const compact = chipsMax < Math.min(3, channels.length + 1);

  const views: { value: View; label: string }[] = [
    { value: 'day', label: t('day', 'Day') },
    { value: 'week', label: t('week', 'Week') },
    { value: 'month', label: t('month', 'Month') },
    { value: 'list', label: t('tdw_ws_list', 'List') },
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

  return (
    <header ref={bar} className={clsx('tdw-ui tdw-ws-bar', compact && 'is-compact', tight && 'is-tight')}>
      <div className="tdw-ws-bar-row">
        <div className="tdw-ws-title" aria-live="polite">
          <h1>
            {title} {!!year && <span>{year}</span>}
          </h1>
          {isListView ? (
            <span className="tdw-ws-range">
              {t('page', 'Page')} {calendar.listPage + 1} {t('of', 'of')}{' '}
              {Math.max(1, calendar.listTotalPages)}
            </span>
          ) : (
            <span className="tdw-ws-range">{range}</span>
          )}
        </div>

        <div className="tdw-ws-nav">
          {isListView ? (
            <>
              <IconButton
                icon="chevron-left"
                className="tdw-ws-flip"
                label={t('previous', 'Previous')}
                disabled={calendar.listPage <= 0}
                onClick={nav.previousPage}
              />
              <IconButton
                icon="chevron-right"
                className="tdw-ws-flip"
                label={t('next', 'Next')}
                disabled={calendar.listPage >= calendar.listTotalPages - 1}
                onClick={nav.nextPage}
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <span className="tdw-ws-grow" />

        {isListView && (
          <div className="tdw-ws-liststate">
            <SegmentedControl
              size="sm"
              label={t('tdw_ws_post_state', 'Post state')}
              value={calendar.listState}
              onChange={(v) => nav.setListStateFilter(v)()}
              options={nav.listStateOptions}
            />
          </div>
        )}

        <div className="tdw-ws-customer">
          <SelectCustomer
            customer={calendar.customer as string}
            onChange={(customer: string) => nav.setCustomer(customer)}
            integrations={calendar.integrations}
          />
        </div>

        <div className="tdw-ws-strip-wrap">
          <ChannelStrip handlers={handlers} onAddChannel={onAddChannel} onShowAll={openChannels} max={Math.max(1, chipsMax)} />
          <IconButton
            icon="layout-list"
            className="tdw-ws-allbtn"
            label={t('tdw_ws_all_channels', 'All channels')}
            onClick={openChannels}
          />
        </div>

        <button
          type="button"
          className={clsx('tdw-ws-channels', !allSelected && 'is-filtered')}
          onClick={openChannels}
          aria-label={t('tdw_ws_all_channels', 'All channels')}
          data-tooltip-id="tooltip"
          data-tooltip-content={t('tdw_ws_all_channels', 'All channels')}
        >
          <span className="tdw-ws-stack" aria-hidden="true">
            {channels.length ? (
              channels.slice(0, 3).map((c) => <ChannelAvatar key={c.id} channel={c} size={24} />)
            ) : (
              <Icon name="layout-list" size={16} />
            )}
          </span>
          <Icon name="chevron-down" size={14} />
          {!allSelected && <i className="tdw-ws-dot" aria-label={t('tdw_ws_filtered', 'Filtered')} />}
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

