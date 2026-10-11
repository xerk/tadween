'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { CalendarDemoCopy } from '@/content/types';
import { Icon, cx } from './Icon';
import { Segmented } from './Segmented';

// The home page's calendar, as a small working demo instead of a screenshot: a focused week
// with posts you can read (hover, tap or Enter), drag to another hour (mouse, touch or the
// arrow keys), filter by network, and see as a month or a board. It follows the app's
// calendar rules: past hours are striped and refuse drops, and published posts don't move.
// The week is fixed (Mon 12 to Fri 16 October 2026, "now" on Wednesday at 11:20) so the
// server and the browser draw the same thing. The brands are the hero showcase's made-up
// ones, and post bodies stay in their own language, like the showcase.

type Net = 'linkedin' | 'instagram' | 'facebook' | 'threads' | 'youtube';
type Status = 'draft' | 'scheduled' | 'published';
type View = 'week' | 'month' | 'board';

interface DemoPost {
  id: string;
  net: Net;
  brand: string;
  initials: string;
  color: string;
  lang: 'en' | 'ar';
  text: string;
  tag: string;
  status: Status;
  /** Column of the week (0 = Monday) and the hour it goes out. */
  day: number;
  hour: number;
}

const DEMO_NETS: Net[] = ['linkedin', 'instagram', 'facebook', 'threads', 'youtube'];
const DAYS = 5;
const FIRST_HOUR = 9;
const HOURS = 6;
const TODAY = 2;
const NOW = 11 + 20 / 60;
/** The month view starts on Monday 28 September, so Monday 12 October is cell 14. */
const WEEK_CELL = 14;
const STATUSES: Status[] = ['draft', 'scheduled', 'published'];

const POSTS: DemoPost[] = [
  { id: 'nile', net: 'linkedin', brand: 'Nile Studio', initials: 'NS', color: '#0b7062', lang: 'en', status: 'published', day: 0, hour: 9, tag: 'Launch', text: 'Nile Studio is hosting its first open studio night on 22 October. Short talks on writing for two audiences, Arabic and English, and an hour of portfolio reviews. Seats are free, but limited.' },
  { id: 'maadi', net: 'linkedin', brand: 'Maadi Lane Homes', initials: 'ML', color: '#0e7490', lang: 'ar', status: 'published', day: 1, hour: 10, tag: 'تسليم', text: 'بدأنا النهاردة تسليم المرحلة الأولى في المعادي: ٤٨ شقة بتشطيب كامل وإطلالة على الحديقة. شكرًا لكل عميل وثق فينا.' },
  { id: 'bunn', net: 'threads', brand: 'Bunn Café', initials: 'B', color: '#7c2d12', lang: 'en', status: 'published', day: 1, hour: 13, tag: 'Menu', text: 'Quiet tables, loud flavour. A new single origin from Harar is on the bar in Zamalek this week.' },
  { id: 'qolla', net: 'instagram', brand: 'Qolla Ceramics', initials: 'Q', color: '#b45309', lang: 'ar', status: 'scheduled', day: 2, hour: 12, tag: 'تشكيلة', text: 'تشكيلة الجليز الجديدة: أخضر النيل ولون الرمل. الحجز يبدأ الخميس من الموقع.' },
  { id: 'felucca', net: 'instagram', brand: 'Felucca Hours', initials: 'FH', color: '#0369a1', lang: 'en', status: 'scheduled', day: 3, hour: 10, tag: 'Weekend', text: 'Sunset sail from Garden City, tea on board. Friday and Saturday, 5 pm. #Cairo #Nile' },
  { id: 'sett', net: 'facebook', brand: 'مطبخ ستّ الحُسن', initials: 'س', color: '#be123c', lang: 'ar', status: 'scheduled', day: 3, hour: 13, tag: 'عرض', text: 'كشري الجمعة رجع. التوصيل متاح من ١٢ الظهر لحد ١٢ بالليل في مدينة نصر والتجمع.' },
  { id: 'rakeeza', net: 'youtube', brand: 'Rakeeza', initials: 'R', color: '#1f2937', lang: 'en', status: 'scheduled', day: 4, hour: 11, tag: 'Tutorial', text: 'Arabic-first invoices in Rakeeza: right-to-left PDFs and Hijri dates in 3 minutes.' },
  { id: 'nile-ar', net: 'linkedin', brand: 'Nile Studio', initials: 'NS', color: '#0b7062', lang: 'ar', status: 'draft', day: 4, hour: 14, tag: 'فعالية', text: 'ليلة الاستوديو المفتوح في ٢٢ أكتوبر: كتابة لجمهورين بالعربية والإنجليزية، وساعة لمراجعة الأعمال. الدخول مجاني والأماكن محدودة.' },
];

/** The rest of October in the month view, as dots: the date, the network and the hour. */
const MONTH_MORE: { date: number; net: Net; hour: number }[] = [
  { date: 1, net: 'linkedin', hour: 9 },
  { date: 2, net: 'instagram', hour: 13 },
  { date: 5, net: 'linkedin', hour: 10 },
  { date: 6, net: 'facebook', hour: 12 },
  { date: 7, net: 'threads', hour: 9 },
  { date: 7, net: 'linkedin', hour: 11 },
  { date: 7, net: 'youtube', hour: 14 },
  { date: 8, net: 'linkedin', hour: 11 },
  { date: 9, net: 'youtube', hour: 14 },
  { date: 19, net: 'linkedin', hour: 9 },
  { date: 20, net: 'instagram', hour: 12 },
  { date: 21, net: 'threads', hour: 10 },
  { date: 22, net: 'linkedin', hour: 9 },
  { date: 22, net: 'facebook', hour: 13 },
  { date: 22, net: 'instagram', hour: 15 },
  { date: 23, net: 'youtube', hour: 11 },
  { date: 26, net: 'linkedin', hour: 10 },
  { date: 27, net: 'instagram', hour: 9 },
  { date: 28, net: 'linkedin', hour: 12 },
  { date: 29, net: 'threads', hour: 13 },
  { date: 30, net: 'facebook', hour: 10 },
];

const icon = (net: Net) => `/channels/${net}.png`;
const isPast = (day: number, hour: number) => day < TODAY || (day === TODAY && hour < NOW);
const byTime = (a: DemoPost, b: DemoPost) => a.day - b.day || a.hour - b.hour;
const STATUS_ICON: Record<Status, 'pencil' | 'clock' | 'circle-check'> = { draft: 'pencil', scheduled: 'clock', published: 'circle-check' };

const Avatar = ({ post, size }: { post: DemoPost; size: number }) => (
  <span className="sc-avatar" style={{ width: size, height: size, background: post.color }}>
    <span style={{ fontSize: Math.round(size * 0.38) }}>{post.initials}</span>
    <img className="sc-network" src={icon(post.net)} alt="" width={16} height={16} />
  </span>
);

export function CalendarDemo({ c, calloutA, calloutB, numberLocale, netNames }: { c: CalendarDemoCopy; calloutA: string; calloutB: string; numberLocale: string; netNames: Record<string, string> }) {
  const [posts, setPosts] = useState(POSTS);
  const [view, setView] = useState<View>('week');
  const [shown, setShown] = useState<Net[]>(DEMO_NETS);
  const [open, setOpen] = useState<string | null>(null);
  const [pop, setPop] = useState<CSSProperties>({ visibility: 'hidden' });
  const [target, setTarget] = useState<{ day: number; hour: number; ok: boolean } | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<{ open?: number; close?: number; note?: number }>({});
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean; el: HTMLElement; touch: boolean } | null>(null);
  const flip = useRef<{ id: string; left: number; top: number } | null>(null);

  const num = new Intl.NumberFormat(numberLocale, { minimumIntegerDigits: 2, useGrouping: false });
  const day = new Intl.NumberFormat(numberLocale, { useGrouping: false });
  const time = (hour: number) => `${num.format(hour)}:${num.format(0)}`;
  const when = (p: { day: number; hour: number }) => `${c.days[p.day].long} · ${time(p.hour)}`;
  const visible = (p: { net: Net }) => shown.includes(p.net);
  const chipOf = (id: string) => rootRef.current?.querySelector<HTMLElement>(`[data-post="${id}"]`) ?? null;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const say = (ok: boolean, text: string) => {
    window.clearTimeout(timers.current.note);
    setNote({ ok, text });
    timers.current.note = window.setTimeout(() => setNote(null), 2800);
  };

  /** Why a post can't go to a slot, or null when it can. A taken slot or its own slot just
      snaps back without a message. */
  const refusal = (post: DemoPost, d: number, h: number): string | null | false => {
    if (post.status === 'published') return c.refusedPublished;
    if (isPast(d, h)) return c.refusedPast;
    if ((post.day === d && post.hour === h) || posts.some((p) => p.id !== post.id && p.day === d && p.hour === h)) return false;
    return null;
  };

  /** Moves a post and lets the chip glide from where it was (or where it was dropped) to its
      new cell. */
  const moveTo = (post: DemoPost, d: number, h: number) => {
    const why = refusal(post, d, h);
    if (why !== null) {
      if (why) say(false, why);
      return false;
    }
    const el = chipOf(post.id);
    if (el) {
      const r = el.getBoundingClientRect();
      flip.current = { id: post.id, left: r.left, top: r.top };
    }
    setPosts((all) => all.map((p) => (p.id === post.id ? { ...p, day: d, hour: h } : p)));
    say(true, c.moved.replace('{when}', when({ day: d, hour: h })));
    return true;
  };

  useLayoutEffect(() => {
    const f = flip.current;
    flip.current = null;
    const el = f && chipOf(f.id);
    if (!f || !el) return;
    el.style.transition = 'none';
    el.style.translate = '';
    const r = el.getBoundingClientRect();
    if (reduced()) {
      el.style.transition = '';
      return;
    }
    el.style.translate = `${f.left - r.left}px ${f.top - r.top}px`;
    el.getBoundingClientRect();
    el.style.transition = '';
    el.style.translate = '';
  }, [posts]);

  // The preview card sits beside its post (below it on narrow screens), inside the demo.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const card = popRef.current;
    const el = open ? chipOf(open) : null;
    if (!root || !card || !el) return;
    const box = root.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const rtl = getComputedStyle(root).direction === 'rtl';
    const clamp = (v: number, max: number) => Math.max(8, Math.min(v, max - 8));
    let left: number;
    let top: number;
    if (box.width < 700) {
      left = clamp(r.left - box.left + r.width / 2 - w / 2, box.width - w);
      top = r.bottom - box.top + 8;
      if (top + h > box.height && r.top - box.top - h - 8 > 0) top = r.top - box.top - h - 8;
    } else {
      const after = r.right - box.left + 12;
      const before = r.left - box.left - 12 - w;
      const fitsAfter = after + w <= box.width - 8;
      const fitsBefore = before >= 8;
      left = rtl ? (fitsBefore ? before : after) : fitsAfter ? after : before;
      top = clamp(r.top - box.top - 8, box.height - h);
    }
    setPop({ left, top });
  }, [open, view]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.cd-pop') && !t.closest('[data-post]')) setOpen(null);
    };
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        chipOf(open)?.focus();
        setOpen(null);
      }
    };
    const scroller = scrollRef.current;
    const off = () => setOpen(null);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    scroller?.addEventListener('scroll', off, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
      scroller?.removeEventListener('scroll', off);
    };
  }, [open]);

  // Phones see three days at a time; start on the day before today.
  useEffect(() => {
    const s = scrollRef.current;
    if (!s || view !== 'week' || s.scrollWidth <= s.clientWidth) return;
    const col = s.querySelector<HTMLElement>('[data-day="1"]');
    if (!col) return;
    const rtl = getComputedStyle(s).direction === 'rtl';
    s.scrollLeft = rtl ? -(s.querySelector<HTMLElement>('[data-day="0"]')!.offsetWidth) : col.offsetLeft - s.querySelector<HTMLElement>('.cd-hour')!.offsetWidth;
  }, [view]);

  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), []);

  const hoverIn = (id: string) => {
    window.clearTimeout(timers.current.close);
    window.clearTimeout(timers.current.open);
    if (drag.current) return;
    timers.current.open = window.setTimeout(() => setOpen(id), open ? 0 : 140);
  };
  const hoverOut = () => {
    window.clearTimeout(timers.current.open);
    window.clearTimeout(timers.current.close);
    timers.current.close = window.setTimeout(() => setOpen(null), 160);
  };

  const onDown = (e: PointerEvent<HTMLElement>, post: DemoPost) => {
    if (e.button !== 0) return;
    drag.current = { id: post.id, x: e.clientX, y: e.clientY, moved: false, el: e.currentTarget, touch: e.pointerType !== 'mouse' };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent<HTMLElement>, post: DemoPost) => {
    const d = drag.current;
    if (!d || d.id !== post.id) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 5 || view !== 'week') return;
      d.moved = true;
      d.el.dataset.drag = '';
      window.clearTimeout(timers.current.open);
      setOpen(null);
    }
    d.el.style.translate = `${dx}px ${dy}px`;
    // The chip is under the pointer, so look through it for the cell.
    const cell = document.elementsFromPoint(e.clientX, e.clientY).find((n): n is HTMLElement => n instanceof HTMLElement && 'cell' in n.dataset);
    const next = cell ? { day: Number(cell.dataset.d), hour: Number(cell.dataset.h) } : null;
    setTarget((t) => {
      if (!next) return null;
      if (t && t.day === next.day && t.hour === next.hour) return t;
      return { ...next, ok: refusal(post, next.day, next.hour) === null };
    });
  };

  const onUp = (e: PointerEvent<HTMLElement>, post: DemoPost, cancel?: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== post.id) return;
    if (!d.moved) {
      if (cancel) return;
      // A tap opens or closes the card; a mouse click keeps it open (hover already opened it).
      window.clearTimeout(timers.current.open);
      setOpen((o) => (d.touch && o === post.id ? null : post.id));
      return;
    }
    delete d.el.dataset.drag;
    const t = target;
    setTarget(null);
    if (!cancel && t && moveTo(post, t.day, t.hour)) return;
    d.el.style.translate = '';
  };

  const onKey = (e: KeyboardEvent<HTMLElement>, post: DemoPost) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((o) => (o === post.id ? null : post.id));
      return;
    }
    if (view !== 'week') return;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const step: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [rtl ? 1 : -1, 0], ArrowRight: [rtl ? -1 : 1, 0] };
    const s = step[e.key];
    if (!s) return;
    e.preventDefault();
    const d = post.day + s[0];
    const h = post.hour + s[1];
    if (d < 0 || d >= DAYS || h < FIRST_HOUR || h >= FIRST_HOUR + HOURS) return;
    setOpen(null);
    moveTo(post, d, h);
  };

  const toggleNet = (net: Net) => {
    setOpen(null);
    setShown((s) => (s.includes(net) ? s.filter((n) => n !== net) : DEMO_NETS.filter((n) => n === net || s.includes(n))));
  };

  const chipProps = (post: DemoPost) => ({
    'data-post': post.id,
    tabIndex: visible(post) ? 0 : -1,
    'aria-hidden': visible(post) ? undefined : true,
    'aria-expanded': open === post.id,
    'aria-label': `${post.brand}, ${netNames[post.net]}, ${when(post)}, ${c.status[post.status]}`,
    onPointerEnter: (e: PointerEvent<HTMLElement>) => e.pointerType === 'mouse' && hoverIn(post.id),
    onPointerLeave: (e: PointerEvent<HTMLElement>) => e.pointerType === 'mouse' && hoverOut(),
    onPointerDown: (e: PointerEvent<HTMLElement>) => onDown(e, post),
    onPointerMove: (e: PointerEvent<HTMLElement>) => onMove(e, post),
    onPointerUp: (e: PointerEvent<HTMLElement>) => onUp(e, post),
    onPointerCancel: (e: PointerEvent<HTMLElement>) => onUp(e, post, true),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => onKey(e, post),
    onFocus: () => open && open !== post.id && setOpen(null),
  });

  const status = (s: Status) => (
    <span className={cx('cd-status', `is-${s}`)}>
      <Icon name={STATUS_ICON[s]} size={13} />
      {c.status[s]}
    </span>
  );

  const openPost = posts.find((p) => p.id === open);
  const upNext = posts.filter((p) => p.status === 'scheduled' && !isPast(p.day, p.hour) && visible(p)).sort(byTime).slice(0, 3);
  const hours = Array.from({ length: HOURS }, (_, i) => FIRST_HOUR + i);

  const week = (
    <div className="cd-scroll" ref={scrollRef}>
      <div className="cd-grid" role="group" aria-label={c.range} aria-describedby="cd-hint">
        <span className="cd-corner cd-hour" aria-hidden="true" />
        {c.days.map((d, i) => (
          <span key={i} className={cx('cd-dayhead', i === TODAY && 'is-today')} data-day={i} style={{ gridColumn: i + 2 }} aria-hidden="true">
            {d.short}
            {i === TODAY ? <em>{c.today}</em> : null}
          </span>
        ))}
        {hours.map((h, r) => (
          <span key={h} className="cd-hour" style={{ gridRow: r + 2 }} aria-hidden="true">
            {time(h)}
          </span>
        ))}
        {hours.map((h, r) =>
          c.days.map((_, i) => (
            <span
              key={`${i}-${h}`}
              data-cell=""
              data-d={i}
              data-h={h}
              className={cx('cd-cell', isPast(i, h) && 'is-past', i === TODAY && 'is-today', target?.day === i && target.hour === h && (target.ok ? 'is-target' : 'is-refused'))}
              style={{ gridColumn: i + 2, gridRow: r + 2 }}
              aria-hidden="true"
            />
          )),
        )}
        <span className="cd-now" style={{ gridColumn: TODAY + 2, gridRow: `2 / span ${HOURS}`, ['--now' as string]: (NOW - FIRST_HOUR) / HOURS }} aria-hidden="true">
          <i />
        </span>
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            className={cx('cd-chip', `is-${post.status}`, !visible(post) && 'is-off', isPast(post.day, post.hour) && 'is-past')}
            style={{ gridColumn: post.day + 2, gridRow: post.hour - FIRST_HOUR + 2 }}
            {...chipProps(post)}
          >
            <span className="cd-chip-top">
              <Avatar post={post} size={24} />
              <time>{time(post.hour)}</time>
              <Icon name={STATUS_ICON[post.status]} size={14} className="cd-chip-mark" />
            </span>
            <span className="cd-chip-text" lang={post.lang} dir={post.lang === 'ar' ? 'rtl' : 'ltr'}>
              {post.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  // October 2026 from Monday 28 September: 35 days, this week's posts on 12 to 16.
  const month = (
    <div className="cd-month" aria-label={c.month} role="group">
      {c.weekdays.map((w) => (
        <span key={w} className="cd-month-head" aria-hidden="true">
          {w}
        </span>
      ))}
      {Array.from({ length: 35 }, (_, i) => {
        const date = i < 3 ? 28 + i : i - 2 > 31 ? i - 33 : i - 2;
        const inMonth = i >= 3 && i <= 33;
        const fromWeek = posts.filter((p) => WEEK_CELL + p.day === i && visible(p)).sort(byTime);
        const items = [
          ...(inMonth ? MONTH_MORE.filter((m) => m.date === date && shown.includes(m.net)).map((m) => ({ key: `${date}-${m.net}-${m.hour}`, net: m.net, hour: m.hour, status: (date < 14 ? 'published' : 'scheduled') as Status })) : []),
          ...fromWeek.map((p) => ({ key: p.id, net: p.net, hour: p.hour, status: p.status })),
        ];
        return (
          <div key={i} className={cx('cd-mday', !inMonth && 'is-out', i === WEEK_CELL + TODAY && 'is-today', i < WEEK_CELL + TODAY && 'is-past')}>
            <span className="cd-mdate">{day.format(date)}</span>
            {items.slice(0, 2).map((m) => (
              <span key={m.key} className={cx('cd-mchip', `is-${m.status}`)}>
                <img src={icon(m.net)} alt={netNames[m.net]} width={14} height={14} />
                <time>{time(m.hour)}</time>
              </span>
            ))}
            {items.length > 2 ? <span className="cd-mmore">{c.more.replace('{n}', day.format(items.length - 2))}</span> : null}
          </div>
        );
      })}
    </div>
  );

  const board = (
    <div className="cd-board">
      {STATUSES.map((s) => {
        const list = posts.filter((p) => p.status === s && visible(p)).sort(byTime);
        return (
          <section key={s} className="cd-col" aria-label={c.status[s]}>
            <h3>
              {status(s)}
              <span>{day.format(list.length)}</span>
            </h3>
            {list.map((post) => (
              <button key={post.id} type="button" className={cx('cd-card', `is-${post.status}`)} {...chipProps(post)}>
                <span className="cd-chip-top">
                  <Avatar post={post} size={28} />
                  <span className="cd-card-who">
                    <strong>{post.brand}</strong>
                    <time>{when(post)}</time>
                  </span>
                </span>
                <span className="cd-chip-text" lang={post.lang} dir={post.lang === 'ar' ? 'rtl' : 'ltr'}>
                  {post.text}
                </span>
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );

  return (
    <div className="cd" ref={rootRef} role="region" aria-label={c.label}>
      <span className={cx('pz-callout is-a')}>
        <Icon name="eye" size={16} />
        {calloutA}
      </span>
      <div className="cd-frame">
        <div className="cd-bar">
          <div className="cd-title">
            <strong>{view === 'week' ? c.range : c.month}</strong>
            <span className="cd-today">{c.today}</span>
          </div>
          <Segmented
            label={c.views.label}
            value={view}
            onChange={(v) => {
              setOpen(null);
              setView(v);
            }}
            options={(['week', 'month', 'board'] as View[]).map((v) => ({ value: v, label: c.views[v] }))}
          />
        </div>
        <div className="cd-filters" role="group" aria-label={c.filtersLabel}>
          {DEMO_NETS.map((net) => (
            <button key={net} type="button" className="cd-pill" aria-pressed={shown.includes(net)} onClick={() => toggleNet(net)}>
              <img src={icon(net)} alt="" width={18} height={18} />
              {netNames[net]}
            </button>
          ))}
        </div>
        <div className="cd-body">
          <div key={view} className="cd-view">
            {view === 'week' ? week : view === 'month' ? month : board}
          </div>
          <aside className="cd-next" aria-label={c.upNext}>
            <h3>{c.upNext}</h3>
            <ol>
              {upNext.map((p) => (
                <li key={p.id}>
                  <img src={icon(p.net)} alt={netNames[p.net]} width={20} height={20} />
                  <span>
                    <strong>{p.brand}</strong>
                    <time>{when(p)}</time>
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
        <p id="cd-hint" className="cd-sr">
          {c.keyboardHint}
        </p>
      </div>
      <span className={cx('pz-callout is-b is-smart', note && 'is-note', note && !note.ok && 'is-refused')} aria-live="polite">
        <Icon name={note ? (note.ok ? 'circle-check' : 'circle-alert') : 'mouse-pointer-2'} size={16} />
        {note ? note.text : calloutB}
      </span>
      {openPost ? (
        <div className="cd-pop" ref={popRef} style={pop} role="dialog" aria-label={openPost.brand} onPointerEnter={(e) => e.pointerType === 'mouse' && hoverIn(openPost.id)} onPointerLeave={(e) => e.pointerType === 'mouse' && hoverOut()}>
          <div className="cd-pop-head">
            <Avatar post={openPost} size={40} />
            <span>
              <strong>{openPost.brand}</strong>
              <time>{when(openPost)}</time>
            </span>
            {status(openPost.status)}
          </div>
          <p lang={openPost.lang} dir={openPost.lang === 'ar' ? 'rtl' : 'ltr'}>
            {openPost.text}
          </p>
          <span className="cd-tag" lang={openPost.lang}>
            {openPost.tag}
          </span>
          <div className="cd-pop-actions" aria-hidden="true">
            <span className="pz-btn pz-btn-primary">
              <Icon name="pencil" size={15} />
              {c.actions.edit}
            </span>
            <span className="cd-pop-icons">
              <span title={c.actions.duplicate}>
                <Icon name="copy" size={17} />
              </span>
              <span title={c.actions.preview}>
                <Icon name="eye" size={17} />
              </span>
              <span title={c.actions.delete} className="is-danger">
                <Icon name="trash-2" size={17} />
              </span>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
