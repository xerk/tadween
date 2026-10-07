'use client';

// Tadween calendar workspace (/launches). The calendar is the canvas; chrome
// floats around it:
//   · WorkspaceToolbar — date, navigation, channel chips, view switch, Create
//   · the canvas — Postiz's own <Calendar /> (drag & drop, slots, previews,
//     statistics…), restyled in app/tadween/workspace.scss
//   · WorkspaceSidePanel — Up next, mini month, Drafts (≥ 1100px)
//   · ChannelsSheet — every channel feature from Postiz's old channel column
//   · phones: a week-day strip, swipe between days, a floating Create button
import React, { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import useCookie from 'react-use-cookie';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { Calendar } from '@gitroom/frontend/components/launches/calendar';
import { useCalendarNavigation } from '@gitroom/frontend/components/launches/filters';
import { NewPost } from '@gitroom/frontend/components/launches/new.post';
import { GeneratorComponent } from '@gitroom/frontend/components/launches/generator/generator';
import { SelectCustomer } from '@gitroom/frontend/components/launches/select.customer';
import { useAddProvider } from '@gitroom/frontend/components/launches/add.provider.component';
import { Icon } from '@gitroom/frontend/components/tadween/ui';
import { WorkspaceToolbar } from '@gitroom/frontend/components/tadween/workspace/toolbar';
import { ChannelsSheet } from '@gitroom/frontend/components/tadween/workspace/channels.sheet';
import {
  ChannelMenuHandlers,
  ChannelStrip,
} from '@gitroom/frontend/components/tadween/workspace/channel.strip';
import {
  useMonthPostDays,
  WorkspaceSidePanel,
} from '@gitroom/frontend/components/tadween/workspace/side.panel';

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Touch swipe on the day canvas: the page follows the finger 1:1, then either
// springs back or slides out and the next/previous day springs in.
const useDaySwipe = (enabled: boolean, onPrev: () => void, onNext: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const g = useRef<null | { x: number; y: number; t: number; dx: number; axis: '' | 'x' | 'y' }>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const setX = (x: number, transition = '') => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = x ? `translateX(${x}px)` : '';
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled || e.pointerType !== 'touch') return;
    g.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, axis: '' };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      s.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
    }
    if (s.axis !== 'x') return;
    s.dx = dx;
    setX(dx, 'none');
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    const s = g.current;
    g.current = null;
    if (!s || s.axis !== 'x') return;
    const width = ref.current?.offsetWidth || 1;
    const velocity = Math.abs(s.dx) / Math.max(1, e.timeStamp - s.t);
    const commit = Math.abs(s.dx) > width * 0.22 || velocity > 0.6;
    if (!commit) {
      setX(0, 'transform 420ms var(--tdw-ease-spring)');
      return;
    }
    const rtl = document.documentElement.dir === 'rtl';
    const forward = rtl ? s.dx > 0 : s.dx < 0;
    if (reducedMotion()) {
      setX(0, 'none');
      forward ? onNext() : onPrev();
      return;
    }
    const out = s.dx < 0 ? -width : width;
    setX(out, 'transform 180ms cubic-bezier(0.3, 0, 0.8, 0.15)');
    timer.current = window.setTimeout(() => {
      forward ? onNext() : onPrev();
      setX(-out * 0.35, 'none');
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setX(0, 'transform 480ms var(--tdw-ease-spring)'))
      );
    }, 170);
  };

  return {
    ref,
    handlers: enabled
      ? { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd }
      : {},
  };
};

const useMedia = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return matches;
};

// Phones, day view: the week as a scroll-snapped strip (previous · this ·
// next week). Tap a day to open it; swipe the strip to another week.
const DayStrip: FC = () => {
  const t = useT();
  const { calendar, goTo } = useCalendarNavigation();
  const selected = newDayjs(calendar.startDate);
  const weekStart = selected.startOf('isoWeek');
  const pages = [-1, 0, 1].map((w) =>
    Array.from({ length: 7 }, (_, i) => weekStart.add(w, 'week').add(i, 'day'))
  );
  const first = pages[0][0].format('YYYY-MM-DD');
  const last = pages[2][6].format('YYYY-MM-DD');
  const monthA = useMonthPostDays(newDayjs(first).startOf('month').format('YYYY-MM-DD'));
  const monthB = useMonthPostDays(newDayjs(last).startOf('month').format('YYYY-MM-DD'));
  const busy = (key: string) => monthA.has(key) || monthB.has(key);

  const scroller = useRef<HTMLDivElement>(null);
  const settle = useRef<number>(0);
  const today = newDayjs().format('YYYY-MM-DD');
  const current = selected.format('YYYY-MM-DD');

  // Keep this week (the middle page) centred; scrollLeft runs negative in RTL
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    el.scrollTo({ left: (rtl ? -1 : 1) * el.clientWidth, behavior: 'instant' as ScrollBehavior });
  }, [weekStart.format('YYYY-MM-DD')]);
  useEffect(() => () => window.clearTimeout(settle.current), []);

  // After a snap onto the previous/next week, open the same weekday there
  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = scroller.current;
      if (!el) return;
      const page = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
      if (page === 1) return;
      goTo('day', selected.add(page < 1 ? -1 : 1, 'week').format('YYYY-MM-DD'));
    }, 120);
  };

  return (
    <div
      ref={scroller}
      className="tdw-ws-daystrip"
      onScroll={onScroll}
      role="tablist"
      aria-label={t('tdw_ws_pick_day', 'Pick a day')}
    >
      {pages.map((days, p) => (
        <div key={p} className="tdw-ws-daypage">
          {days.map((day) => {
            const key = day.format('YYYY-MM-DD');
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={key === current}
                aria-label={day.format('dddd, LL')}
                className={clsx('tdw-ws-dayitem', key === current && 'is-on', key === today && 'is-today')}
                onClick={() => goTo('day', key)}
              >
                <em>{day.format('dd')}</em>
                <b>{day.date()}</b>
                <i className={clsx(busy(key) && 'has')} />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const CalendarWorkspace: FC<{
  handlers: ChannelMenuHandlers;
  hasChannels: boolean;
  showGenerator: boolean;
  onChannelAdded: () => void;
  // Postiz's channel list (Add Channel + invite, groups, rows with menus)
  channelsList: ReactNode;
}> = ({ handlers, hasChannels, showGenerator, onChannelAdded, channelsList }) => {
  const t = useT();
  const nav = useCalendarNavigation();
  const { calendar } = nav;
  const addProvider = useAddProvider(onChannelAdded);
  const [side, setSide] = useCookie('tdw-ws-side', '1');
  const [sheet, setSheet] = useState<null | DOMRect>(null);
  const isPhone = useMedia('(max-width: 768px)');
  // The side panel (and its requests) only exists where it's shown
  const showSide = useMedia('(min-width: 1100px)') && side === '1';

  const swipe = useDaySwipe(isPhone && calendar.display === 'day', nav.previous, nav.next);
  const closeSheet = useCallback(() => setSheet(null), []);

  return (
    <div className={clsx('tdw-ws', showSide && 'has-side', `is-${calendar.display}`)}>
      <div className="tdw-ws-main">
        <WorkspaceToolbar
          handlers={handlers}
          hasChannels={hasChannels}
          showGenerator={showGenerator}
          onAddChannel={addProvider}
          onOpenChannels={setSheet}
          sideOpen={showSide}
          onToggleSide={() => setSide(side === '1' ? '0' : '1')}
        />
        {isPhone && calendar.display === 'day' && <DayStrip />}
        <div className="tdw-ws-canvas">
          <div ref={swipe.ref} className="tdw-ws-cal" {...swipe.handlers}>
            <Calendar />
          </div>
        </div>
        <div className="tdw-ws-fab">
          {hasChannels && showGenerator && (
            <span className="tdw-ws-fab-gen">
              <GeneratorComponent />
            </span>
          )}
          {hasChannels ? (
            <NewPost />
          ) : (
            <button type="button" onClick={addProvider} aria-label={t('add_channel', 'Add Channel')}>
              <Icon name="plus" size={24} />
            </button>
          )}
        </div>
      </div>
      {showSide && <WorkspaceSidePanel onClose={() => setSide('0')} />}
      <ChannelsSheet open={!!sheet} anchor={isPhone ? null : sheet} onClose={closeSheet}>
        {hasChannels && (
          <div className="tdw-ws-sheet-filter">
            <div className="tdw-ws-label">{t('tdw_ws_show_on_calendar', 'Show on the calendar')}</div>
            <ChannelStrip handlers={handlers} onAddChannel={addProvider} wrap />
          </div>
        )}
        <div className="tdw-ws-sheet-customer">
          <span className="tdw-ws-label">{t('customers', 'Customers')}</span>
          <SelectCustomer
            customer={calendar.customer as string}
            onChange={(customer: string) => nav.setCustomer(customer)}
            integrations={calendar.integrations}
          />
        </div>
        <div className="tdw-ws-sheet-list">{channelsList}</div>
      </ChannelsSheet>
    </div>
  );
};
