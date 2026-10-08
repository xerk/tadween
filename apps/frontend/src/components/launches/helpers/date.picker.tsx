import { ChangeEvent, FC, KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import { isUSCitizen } from './isuscitizen.utils';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { CalendarIcon } from '@gitroom/frontend/components/ui/icons';

// Tadween schedule picker: month grid, a typed time field for any minute and a
// 15-minute quick list, replacing Mantine's Calendar / TimeInput. Same props
// and output as Postiz's picker.
const STEP = 15;

type Segment = 'hour' | 'minute';

// hour : minute (: AM/PM in 12h) segments, like Mantine's TimeInput but without
// the native control. `minutes` is minutes since midnight.
const TimeField: FC<{
  minutes: number;
  us: boolean;
  labelledBy: string;
  onCommit: (minutes: number) => void;
}> = (props) => {
  const { minutes, us, labelledBy, onCommit } = props;
  const t = useT();
  const [draft, setDraft] = useState<{ segment: Segment; text: string } | null>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const periodRef = useRef<HTMLButtonElement>(null);

  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const pm = hour24 >= 12;
  const range = { hour: us ? [1, 12] : [0, 23], minute: [0, 59] };
  const shown = { hour: us ? hour24 % 12 || 12 : hour24, minute };
  // same formatting as the quick list, so both always show the same AM / PM text
  const period = dayjs().startOf('day').add(minutes, 'minute').format('A');

  const save = (segment: Segment, value: number, isPm = pm) => {
    const h = segment === 'hour' ? (us ? (value % 12) + (isPm ? 12 : 0) : value) : hour24;
    const next = h * 60 + (segment === 'minute' ? value : minute);
    if (next !== minutes) onCommit(next);
  };
  const valid = (segment: Segment, text: string) => {
    const n = Number(text);
    return text !== '' && n >= range[segment][0] && n <= range[segment][1];
  };
  // next frame: the blur this causes must see the draft already cleared
  const focus = (el: HTMLInputElement | HTMLButtonElement | null) =>
    requestAnimationFrame(() => {
      el?.focus();
      if (el instanceof HTMLInputElement) el.select();
    });
  // left / right by on-screen position: in RTL the AM/PM sits left of the time
  const move = (from: HTMLElement, by: number) => {
    const order = [hourRef.current, minuteRef.current, us ? periodRef.current : null]
      .filter((el): el is HTMLInputElement | HTMLButtonElement => !!el)
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    focus(order[order.indexOf(from as HTMLInputElement) + by] || null);
  };
  const select = (el: HTMLInputElement) => requestAnimationFrame(() => el.select());

  // A typed draft is kept until it is a whole value: two digits, or one digit
  // that can't start a two-digit value (3-9 for 24h hours, 6-9 for minutes).
  const type = (segment: Segment) => (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.nativeEvent as InputEvent;
    if (input.inputType?.startsWith('delete')) return setDraft({ segment, text: '' });
    const digit = (input.data ?? e.target.value).replace(/\D/g, '').slice(-1);
    if (!digit) return;
    let text = (draft?.segment === segment ? draft.text : '') + digit;
    if (text.length === 2 && !valid(segment, text)) text = digit;
    if ((text.length === 2 || Number(text) * 10 > range[segment][1]) && valid(segment, text)) {
      setDraft(null);
      save(segment, Number(text));
      if (segment === 'hour') return focus(minuteRef.current);
      if (us) return focus(periodRef.current);
      return select(e.target);
    }
    setDraft({ segment, text });
  };

  const finish = (segment: Segment) => {
    if (draft?.segment !== segment) return;
    if (valid(segment, draft.text)) save(segment, Number(draft.text));
    setDraft(null);
  };

  const keys = (segment: Segment) => (e: KeyboardEvent<HTMLInputElement>) => {
    const [min, max] = range[segment];
    const size = max - min + 1;
    const step = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (step) {
      e.preventDefault();
      setDraft(null);
      save(segment, ((shown[segment] - min + step) % size + size) % size + min);
      select(e.currentTarget);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setDraft(null);
      save(segment, e.key === 'Home' ? min : max);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      finish(segment);
      move(e.currentTarget, e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      finish(segment);
    } else if (e.key === 'Escape' && draft) {
      e.stopPropagation();
      setDraft(null);
    } else if (us && /^[ap]$/i.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      save('hour', shown.hour, e.key.toLowerCase() === 'p');
    }
  };

  const periodKeys = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      save('hour', shown.hour, !pm);
    } else if (/^[ap]$/i.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      save('hour', shown.hour, e.key.toLowerCase() === 'p');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      move(e.currentTarget, e.key === 'ArrowLeft' ? -1 : 1);
    }
  };

  const segment = (name: Segment, ref: typeof hourRef, label: string) => {
    const editing = draft?.segment === name;
    const text = editing ? draft.text : String(shown[name]).padStart(2, '0');
    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={3}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={range[name][0]}
        aria-valuemax={range[name][1]}
        aria-valuenow={shown[name]}
        aria-valuetext={String(shown[name]).padStart(2, '0')}
        className="tdw-dp-seg"
        value={text}
        placeholder="--"
        onFocus={(e) => e.currentTarget.select()}
        onChange={type(name)}
        onKeyDown={keys(name)}
        onBlur={() => finish(name)}
      />
    );
  };

  return (
    <div className="tdw-dp-field" role="group" aria-labelledby={labelledBy}>
      {segment('hour', hourRef, t('hour', 'Hour'))}
      <span className="tdw-dp-colon" aria-hidden="true">:</span>
      {segment('minute', minuteRef, t('tdw_dp_minute', 'Minute'))}
      {us && (
        <button
          ref={periodRef}
          type="button"
          className="tdw-dp-period"
          aria-label={`${t('tdw_dp_am_pm', 'AM/PM')}, ${period}`}
          onClick={() => save('hour', shown.hour, !pm)}
          onKeyDown={periodKeys}
        >
          {period}
        </button>
      )}
    </div>
  );
};

// the calendar and the time, in the desktop popover or in the mobile sheet
export const DatePickerPanel: FC<{
  date: dayjs.Dayjs;
  onChange: (day: dayjs.Dayjs) => void;
  sheet?: boolean;
  open?: boolean;
  onDone?: () => void;
}> = (props) => {
  const { date, onChange, sheet, open = true, onDone } = props;
  const t = useT();
  const [month, setMonth] = useState(() => date.startOf('month'));
  // Read after mount: localStorage / navigator don't exist during SSR.
  const [us, setUs] = useState(false);
  useEffect(() => setUs(isUSCitizen()), []);
  const timeRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const timeLabel = useId();
  const [announce, setAnnounce] = useState('');

  const set = useCallback(
    (day: string, time: string) => onChange(newDayjs(day + ' ' + time)),
    [onChange]
  );
  const pickDay = (d: dayjs.Dayjs) => {
    set(d.format('YYYY-MM-DD'), date.format('HH:mm:ss'));
    if (!d.isSame(month, 'month')) setMonth(d.startOf('month'));
  };
  const pickTime = (minutes: number) =>
    set(
      date.format('YYYY-MM-DD'),
      `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`
    );

  const weekStart = us ? 0 : 1;
  const days = useMemo(() => {
    const first = month.startOf('month');
    const lead = (first.day() - weekStart + 7) % 7;
    const start = first.subtract(lead, 'day');
    return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'));
  }, [month, weekStart]);
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dayjs().day((i + weekStart) % 7).format('dd')),
    [weekStart]
  );

  const current = date.hour() * 60 + date.minute();
  const slots = useMemo(() => {
    const list = Array.from({ length: (24 * 60) / STEP }, (_, i) => i * STEP);
    if (!list.includes(current)) list.push(current);
    return list.sort((a, b) => a - b);
  }, [current]);

  // centre the picked slot on open, and when a typed time moves it out of view
  useEffect(() => {
    const list = timeRef.current;
    const el = list?.querySelector('[aria-selected="true"]') as HTMLElement | null;
    if (!open || !list || !el) return;
    if (el.offsetTop >= list.scrollTop && el.offsetTop + el.clientHeight <= list.scrollTop + list.clientHeight) return;
    list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
  }, [open, current]);

  const today = newDayjs();
  const label = (m: number) =>
    dayjs().startOf('day').add(m, 'minute').format(us ? 'h:mm A' : 'HH:mm');

  const onGridKey = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const d = date.add(document.dir === 'rtl' && Math.abs(step) === 1 ? -step : step, 'day');
    pickDay(d);
    requestAnimationFrame(() =>
      (gridRef.current?.querySelector('.tdw-dp-day[aria-pressed="true"]') as HTMLElement | null)?.focus()
    );
  };

  const quick = [
    { label: t('today', 'Today'), d: today },
    { label: t('tomorrow', 'Tomorrow'), d: today.add(1, 'day') },
    { label: t('next_week', 'Next week'), d: today.add(7, 'day') },
  ];

  return (
    <div className={clsx('tdw-dp-panel', sheet && 'tdw-dp--sheet')}>
      <div className="tdw-dp-cal">
        <div className="tdw-dp-head">
          <span className="tdw-dp-month">{month.format('MMMM YYYY')}</span>
          <button type="button" className="tdw-dp-nav" aria-label={t('previous_month', 'Previous month')} onClick={() => setMonth(month.subtract(1, 'month'))}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="tdw-dp-nav" aria-label={t('next_month', 'Next month')} onClick={() => setMonth(month.add(1, 'month'))}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="tdw-dp-grid" role="grid" ref={gridRef} onKeyDown={onGridKey}>
          {weekdays.map((w, i) => (
            <span key={i} className="tdw-dp-wd" role="columnheader">{w}</span>
          ))}
          {days.map((d) => {
            const sel = d.isSame(date, 'day');
            return (
              <button
                key={d.valueOf()}
                type="button"
                tabIndex={sel ? 0 : -1}
                aria-pressed={sel}
                aria-label={d.format('dddd, D MMMM YYYY')}
                data-outside={!d.isSame(month, 'month') || undefined}
                data-today={d.isSame(today, 'day') || undefined}
                data-past={d.isBefore(today, 'day') || undefined}
                className="tdw-dp-day"
                onClick={() => pickDay(d)}
              >
                {d.date()}
              </button>
            );
          })}
        </div>
        <div className="tdw-dp-quick">
          {quick.map((q) => (
            <button key={q.label} type="button" className="tdw-dp-chip" onClick={() => pickDay(q.d)}>
              {q.label}
            </button>
          ))}
        </div>
      </div>
      <div className="tdw-dp-time">
        <div className="tdw-dp-time-head" id={timeLabel}>{t('time', 'Time')}</div>
        <TimeField
          minutes={current}
          us={us}
          labelledBy={timeLabel}
          onCommit={(m) => {
            pickTime(m);
            setAnnounce(`${t('time', 'Time')}: ${label(m)}`);
          }}
        />
        <span className="sr-only" aria-live="polite">{announce}</span>
        <div className="tdw-dp-slots" ref={timeRef} role="listbox" aria-label={t('time', 'Time')}>
          {slots.map((m) => (
            <button
              key={m}
              type="button"
              role="option"
              aria-selected={m === current}
              className="tdw-dp-slot"
              onClick={() => pickTime(m)}
            >
              {label(m)}
            </button>
          ))}
        </div>
        {!!onDone && (
          <button type="button" className="tdw-dp-done" onClick={onDone}>
            {t('done', 'Done')}
          </button>
        )}
      </div>
    </div>
  );
};

export const DatePicker: FC<{
  date: dayjs.Dayjs;
  onChange: (day: dayjs.Dayjs) => void;
  // opens a picker somewhere else instead of the popover
  onOpen?: () => void;
}> = (props) => {
  const { date, onChange, onOpen } = props;
  const [open, setOpen] = useState(false);
  const t = useT();
  // Read after mount: localStorage / navigator don't exist during SSR.
  const [us, setUs] = useState(false);
  useEffect(() => setUs(isUSCitizen()), []);

  const changeShow = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);
  const ref = useClickOutside<HTMLDivElement>(() => {
    setOpen(false);
  });

  return (
    <div
      className="tdw-dp-trigger px-[16px] border border-newTextColor/10 mobile:border-newTextColor/[0.08] rounded-[8px] mobile:rounded-[6px] justify-center flex gap-[8px] items-center relative h-[44px] mobile:h-[34px] text-[15px] mobile:text-[13px] whitespace-nowrap font-[600] ml-[7px] mobile:ml-0 select-none flex-1 mobile:min-w-0"
      ref={ref}
    >
      <button
        type="button"
        className="flex gap-[8px] items-center cursor-pointer outline-none min-w-0"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onOpen || changeShow}
      >
        <CalendarIcon />
        <span className="tabular-nums mobile:hidden">
          {date.format(us ? 'MM/DD/YYYY hh:mm A' : 'DD/MM/YYYY HH:mm')}
        </span>
        <span className="tabular-nums hidden mobile:block truncate">
          {date.format(us ? 'MMM D, h:mm A' : 'D MMM, HH:mm')}
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('pick_date_and_time', 'Pick date and time')}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className="tdw-dp absolute bottom-[100%] mb-[12px] start-[50%] -translate-x-[50%] rtl:translate-x-[50%] mobile:start-0 mobile:translate-x-0 z-[300]"
        >
          <DatePickerPanel
            date={date}
            onChange={onChange}
            open={open}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
