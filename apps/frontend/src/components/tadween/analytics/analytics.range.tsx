'use client';

import {
  FC,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Button,
  Icon,
  Popover,
  TadweenScope,
  cx,
} from '@gitroom/frontend/components/tadween/ui';
import {
  TadweenSheet,
  TadweenSheetButton,
  usePhoneLayout,
} from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';
import {
  DayRange,
  YMD,
  isYmd,
  lastDays,
  rangeLength,
  todayYmd,
  useFormatters,
} from './analytics.hooks';

// FROM–TO range picker of the analytics page: quick ranges, a two-month
// calendar (one month in the phone sheet), typed dates, Apply / Cancel. The
// month grid reuses the schedule picker's look (.tdw-dp-* in ui-kit.scss);
// range styles: app/tadween/analytics.scss (.tdw-an-rp-*).

type Formatters = ReturnType<typeof useFormatters>;

interface Draft {
  from: string | null;
  to: string | null;
}

// what a day can be picked for: nothing after today, nothing before `min`
interface Limits {
  min?: string;
  max: string;
  // the longest range the view can load
  maxDays: number;
  // why a day before `min` can't be picked
  minReason?: string;
}

const outOfBounds = (day: string, limits: Limits) =>
  day > limits.max || (!!limits.min && day < limits.min);

/* MonthGrid: one month of days; picks, previews and highlights the range */
const MonthGrid: FC<{
  month: string;
  draft: Draft;
  hover: string | null;
  focus: string;
  limits: Limits;
  fmt: Formatters;
  head: ReactNode;
  onPick: (day: string) => void;
  onHover: (day: string | null) => void;
  onKey: (e: KeyboardEvent) => void;
}> = ({ month, draft, hover, focus, limits, fmt, head, onPick, onHover, onKey }) => {
  const t = useT();
  const first = dayjs(month).startOf('month');
  const lead = (first.day() - fmt.weekStart + 7) % 7;
  const cells = useMemo(
    () =>
      Array.from({ length: lead + first.daysInMonth() }, (_, i) =>
        i < lead ? null : first.add(i - lead, 'day').format(YMD)
      ),
    [month, lead]
  );
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        fmt.weekday(first.subtract(lead, 'day').add(i, 'day').format(YMD))
      ),
    [month, lead, fmt]
  );

  // while the end isn't picked yet, the hovered day previews it
  const end = draft.from && !draft.to && hover ? hover : draft.to;
  const [low, high] =
    draft.from && end
      ? draft.from <= end
        ? [draft.from, end]
        : [end, draft.from]
      : [draft.from, draft.from];
  const preview = !!draft.from && !draft.to;
  const today = todayYmd();

  return (
    <div className="tdw-an-rp-month">
      {head}
      <div className="tdw-dp-grid tdw-an-rp-grid" role="grid" onKeyDown={onKey}>
        {weekdays.map((w, i) => (
          <span key={i} className="tdw-dp-wd" role="columnheader">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) {
            return <span key={`blank-${i}`} aria-hidden="true" />;
          }
          const off = outOfBounds(day, limits);
          const edge = day === low || day === high;
          const inside = !!low && !!high && day > low && day < high;
          return (
            <button
              key={day}
              type="button"
              data-day={day}
              tabIndex={day === focus ? 0 : -1}
              aria-pressed={edge}
              aria-disabled={off || undefined}
              aria-label={fmt.fullDay(day)}
              title={
                off
                  ? day > limits.max
                    ? t('tdw_an_rp_future', 'No numbers for days that haven’t happened yet')
                    : limits.minReason
                  : undefined
              }
              data-today={day === today || undefined}
              data-range={
                edge && low !== high
                  ? day === low
                    ? 'start'
                    : 'end'
                  : inside
                  ? 'mid'
                  : undefined
              }
              data-preview={preview && (edge || inside) ? true : undefined}
              className="tdw-dp-day tdw-an-rp-day"
              onClick={() => !off && onPick(day)}
              onPointerEnter={() => !off && onHover(day)}
            >
              {dayjs(day).date()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* DateInput: a typed YYYY-MM-DD day, applied when it's a real day in bounds */
const DateInput: FC<{
  id: string;
  label: string;
  value: string | null;
  limits: Limits;
  onChange: (day: string) => void;
}> = ({ id, label, value, limits, onChange }) => {
  const [text, setText] = useState(value || '');
  useEffect(() => setText(value || ''), [value]);
  const invalid = !!text && (!isYmd(text) || outOfBounds(text, limits));
  const commit = () => {
    if (text && isYmd(text) && !outOfBounds(text, limits) && text !== value) {
      onChange(text);
    }
  };
  return (
    <label className="tdw-an-rp-field" htmlFor={id}>
      <span className="tdw-an-rp-field-label">{label}</span>
      <input
        id={id}
        className="pz-input tdw-an-rp-input"
        dir="ltr"
        inputMode="numeric"
        placeholder="YYYY-MM-DD"
        autoComplete="off"
        maxLength={10}
        value={text}
        aria-invalid={invalid || undefined}
        onChange={(e) => setText(e.target.value.trim())}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
};

/* RangePanel: quick ranges, calendar, typed dates and the footer */
const RangePanel: FC<{
  value: DayRange;
  presets: number[];
  limits: Limits;
  months: 1 | 2;
  onApply: (range: DayRange) => void;
  onCancel?: () => void;
  // the phone sheet applies from its own button
  onDraft?: (range: DayRange | null) => void;
}> = ({ value, presets, limits, months, onApply, onCancel, onDraft }) => {
  const t = useT();
  const fmt = useFormatters();
  const [draft, setDraft] = useState<Draft>(value);
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState(value.to);
  // the last month shown: the range's end month (with two months, the one
  // before it shows too)
  const [view, setView] = useState(() =>
    dayjs(value.to).startOf('month').format(YMD)
  );
  const gridsRef = useRef<HTMLDivElement>(null);

  const visible = Array.from({ length: months }, (_, i) =>
    dayjs(view).subtract(months - 1 - i, 'month').format(YMD)
  );

  const show = (day: string) => {
    const m = dayjs(day).startOf('month');
    const firstShown = dayjs(visible[0]);
    const lastShown = dayjs(visible[visible.length - 1]);
    if (m.isBefore(firstShown)) setView(m.add(months - 1, 'month').format(YMD));
    else if (m.isAfter(lastShown)) setView(m.format(YMD));
  };

  const complete: DayRange | null = draft.from
    ? { from: draft.from, to: draft.to || draft.from }
    : null;
  const tooLong = !!complete && rangeLength(complete) > limits.maxDays;

  useEffect(() => {
    onDraft?.(complete && !tooLong ? complete : null);
  }, [complete?.from, complete?.to, tooLong]);

  const pick = (day: string) => {
    setFocus(day);
    if (!draft.from || draft.to) {
      setDraft({ from: day, to: null });
      return;
    }
    setDraft(day < draft.from ? { from: day, to: draft.from } : { from: draft.from, to: day });
    setHover(null);
  };

  const setRange = (range: DayRange) => {
    setDraft(range);
    setFocus(range.to);
    setView(dayjs(range.to).startOf('month').format(YMD));
  };

  // arrows move between days (mirrored in RTL), Home / End to the week's ends
  const onKey = (e: KeyboardEvent) => {
    const rtl = document.dir === 'rtl';
    const steps: Record<string, number> = {
      ArrowLeft: rtl ? 1 : -1,
      ArrowRight: rtl ? -1 : 1,
      ArrowUp: -7,
      ArrowDown: 7,
      PageUp: -30,
      PageDown: 30,
    };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    const next = dayjs(focus).add(step, 'day').format(YMD);
    setFocus(next);
    show(next);
    if (!outOfBounds(next, limits)) setHover(next);
    requestAnimationFrame(() =>
      (gridsRef.current?.querySelector(`[data-day="${next}"]`) as HTMLElement | null)?.focus()
    );
  };

  const today = limits.max;
  const startOfMonth = dayjs(today).startOf('month');
  const quick = [
    { key: 'today', label: t('today', 'Today'), range: { from: today, to: today } },
    {
      key: 'yesterday',
      label: t('tdw_an_rp_yesterday', 'Yesterday'),
      range: {
        from: dayjs(today).subtract(1, 'day').format(YMD),
        to: dayjs(today).subtract(1, 'day').format(YMD),
      },
    },
    ...presets.map((days) => ({
      key: `last-${days}`,
      label: t('tdw_an_last_n_days', 'Last {{days}} days', { days }),
      range: lastDays(days, today),
    })),
    {
      key: 'this-month',
      label: t('tdw_an_rp_this_month', 'This month'),
      range: { from: startOfMonth.format(YMD), to: today },
    },
    {
      key: 'last-month',
      label: t('tdw_an_rp_last_month', 'Last month'),
      range: {
        from: startOfMonth.subtract(1, 'month').format(YMD),
        to: startOfMonth.subtract(1, 'day').format(YMD),
      },
    },
    {
      key: 'this-year',
      label: t('tdw_an_rp_this_year', 'This year'),
      range: { from: dayjs(today).startOf('year').format(YMD), to: today },
    },
  ].map((q) => ({
    ...q,
    off:
      outOfBounds(q.range.from, limits) || rangeLength(q.range) > limits.maxDays,
  }));

  const navButton = (dir: -1 | 1) => (
    <button
      type="button"
      className="tdw-dp-nav"
      disabled={dir > 0 && dayjs(view).isSame(today, 'month')}
      aria-label={
        dir < 0 ? t('previous_month', 'Previous month') : t('next_month', 'Next month')
      }
      onClick={() => setView(dayjs(view).add(dir, 'month').format(YMD))}
    >
      <Icon name={dir < 0 ? 'chevron-left' : 'chevron-right'} size={16} />
    </button>
  );

  return (
    <div className={cx('tdw-an-rp', months === 1 && 'is-single')}>
      <div className="tdw-an-rp-quick" role="group" aria-label={t('tdw_an_quick_ranges', 'Quick ranges')}>
        {quick.map((q) => {
          const active =
            !!complete && complete.from === q.range.from && complete.to === q.range.to;
          return (
            <button
              key={q.key}
              type="button"
              className={cx('tdw-dp-chip tdw-an-rp-chip', active && 'is-active')}
              aria-pressed={active}
              aria-disabled={q.off || undefined}
              title={q.off ? limits.minReason : undefined}
              onClick={() => !q.off && setRange(q.range)}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      <div className="tdw-an-rp-body">
        <div className="tdw-an-rp-months" ref={gridsRef} onPointerLeave={() => setHover(null)}>
          {visible.map((month, i) => (
            <MonthGrid
              key={month}
              month={month}
              draft={draft}
              hover={hover}
              focus={focus}
              limits={limits}
              fmt={fmt}
              onPick={pick}
              onHover={setHover}
              onKey={onKey}
              head={
                <div className="tdw-dp-head tdw-an-rp-head">
                  {i === 0 ? navButton(-1) : <span className="tdw-an-rp-nav-gap" />}
                  <span className="tdw-dp-month">{fmt.month(month)}</span>
                  {i === visible.length - 1 ? navButton(1) : <span className="tdw-an-rp-nav-gap" />}
                </div>
              }
            />
          ))}
        </div>

        <div className="tdw-an-rp-fields">
          <DateInput
            id="tdw-an-rp-from"
            label={t('tdw_an_rp_from', 'From')}
            value={draft.from}
            limits={limits}
            onChange={(day) =>
              setRange(
                draft.to && day <= draft.to
                  ? { from: day, to: draft.to }
                  : { from: day, to: day }
              )
            }
          />
          <span className="tdw-an-rp-dash" aria-hidden="true">
            –
          </span>
          <DateInput
            id="tdw-an-rp-to"
            label={t('tdw_an_rp_to', 'To')}
            value={draft.to || draft.from}
            limits={limits}
            onChange={(day) =>
              setRange(
                draft.from && day >= draft.from
                  ? { from: draft.from, to: day }
                  : { from: day, to: day }
              )
            }
          />
        </div>

        <div className="tdw-an-rp-foot">
          <p className={cx('tdw-an-rp-note', tooLong && 'is-error')} aria-live="polite">
            {tooLong
              ? t('tdw_an_rp_too_long', 'Pick up to {{max}} days.', { max: limits.maxDays })
              : !complete || !draft.to
              ? t('tdw_an_rp_pick_end', 'Now pick the last day')
              : complete.from === complete.to
              ? fmt.range(complete.from, complete.to)
              : t('tdw_an_rp_summary', '{{range}} · {{days}} days', {
                  range: fmt.range(complete.from, complete.to),
                  days: rangeLength(complete),
                })}
            {limits.minReason && !tooLong ? (
              <span className="tdw-an-rp-limit">
                <Icon name="info" size={12} />
                {limits.minReason}
              </span>
            ) : null}
          </p>
          {onCancel ? (
            <div className="tdw-an-rp-actions">
              <Button size="sm" variant="ghost" onClick={onCancel}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!complete || tooLong}
                onClick={() => complete && onApply(complete)}
              >
                {t('tdw_an_apply', 'Apply')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* DateRangePicker: the trigger with the current range, and its panel (a
   popover on desktop, a bottom sheet on phones). `children` sit before the
   trigger and the popover lines up with them. */
export const DateRangePicker: FC<{
  value: DayRange;
  onChange: (range: DayRange) => void;
  // "Last N days" quick ranges (the network's own when it has analytics)
  presets: number[];
  maxDays: number;
  // oldest day the view can load, and why
  min?: string;
  minReason?: string;
  children?: ReactNode;
}> = ({ value, onChange, presets, maxDays, min, minReason, children }) => {
  const t = useT();
  const fmt = useFormatters();
  const phone = usePhoneLayout();
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // two months side by side when the screen has room for them
  const [months, setMonths] = useState<1 | 2>(2);
  const [sheetDraft, setSheetDraft] = useState<DayRange | null>(null);
  const limits: Limits = { min, max: todayYmd(), maxDays, minReason };
  const label = fmt.range(value.from, value.to);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const apply = (range: DayRange) => {
    onChange(range);
    close();
  };

  return (
    <div className="pz-anchor tdw-an-range" ref={anchor}>
      {children}
      <button
        ref={trigger}
        type="button"
        className="pz-btn pz-btn-secondary pz-btn-sm tdw-an-range-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('tdw_an_date_range', 'Date range')}: ${label}`}
        onClick={() => {
          setMonths(window.innerWidth >= 1280 ? 2 : 1);
          setOpen(!open);
        }}
      >
        <Icon name="calendar" size={15} />
        <span className="tdw-an-range-label">{label}</span>
        <Icon name="chevron-down" size={14} className="tdw-an-range-caret" />
      </button>
      {phone ? (
        <TadweenSheet
          open={open}
          onClose={close}
          title={t('tdw_an_date_range', 'Date range')}
          footer={
            <TadweenSheetButton
              label={t('tdw_an_apply', 'Apply')}
              disabled={!sheetDraft}
              onClick={() => sheetDraft && apply(sheetDraft)}
            />
          }
        >
          <TadweenScope className="tdw-an-rp-sheet">
            <RangePanel
              value={value}
              presets={presets}
              limits={limits}
              months={1}
              onApply={apply}
              onDraft={setSheetDraft}
            />
          </TadweenScope>
        </TadweenSheet>
      ) : (
        <Popover open={open} onClose={() => setOpen(false)} anchor={anchor} className="tdw-an-rp-pop">
          <div role="dialog" aria-label={t('tdw_an_date_range', 'Date range')}>
            {open ? (
              <RangePanel
                value={value}
                presets={presets}
                limits={limits}
                months={months}
                onApply={apply}
                onCancel={close}
              />
            ) : null}
          </div>
        </Popover>
      )}
    </div>
  );
};
