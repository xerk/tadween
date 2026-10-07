'use client';

// Tadween UI kit: data and layout (design system layout.tsx + the settings
// Section/Row pieces from pages.tsx).
import React, {
  FC,
  ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cx, Icon, IconName, Skeleton } from './primitives';

/* Table — sticky header; loading and empty states */
export interface TableColumn<R> {
  key: string;
  label: ReactNode;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  render?: (row: R) => ReactNode;
}

export function Table<R>({
  columns,
  rows,
  rowKey,
  loading,
  empty = 'Nothing here yet',
  dense,
}: {
  columns: TableColumn<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  loading?: boolean;
  empty?: ReactNode;
  dense?: boolean;
}) {
  return (
    <div className={cx('pz-table-wrap', dense && 'is-dense')}>
      <table className="pz-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width, textAlign: c.align }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key}>
                    <Skeleton height={12} width="70%" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length ? (
            rows.map((r) => (
              <tr key={rowKey(r)}>
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align }}>
                    {c.render
                      ? c.render(r)
                      : ((r as Record<string, unknown>)[c.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="pz-td-empty">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* Pagination — Previous · pages with ellipsis · Next (controlled) */
export const Pagination: FC<{
  page: number;
  pages: number;
  onChange: (page: number) => void;
}> = ({ page, pages, onChange }) => {
  if (pages <= 1) return null;
  const nums: (number | '…')[] =
    pages <= 7
      ? Array.from({ length: pages }, (_, i) => i + 1)
      : [
          1,
          ...(page > 3 ? (['…'] as const) : []),
          ...[page - 1, page, page + 1].filter((n) => n > 1 && n < pages),
          ...(page < pages - 2 ? (['…'] as const) : []),
          pages,
        ];
  return (
    <nav className="pz-pages" aria-label="Pagination">
      <button
        type="button"
        className="pz-page-btn pz-page-nav"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <Icon name="chevron-left" size={14} />
        Previous
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={'e' + i} className="pz-page-gap">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            className={cx('pz-page-btn', n === page && 'is-current')}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        )
      )}
      <button
        type="button"
        className="pz-page-btn pz-page-nav"
        disabled={page === pages}
        onClick={() => onChange(page + 1)}
      >
        Next
        <Icon name="chevron-right" size={14} />
      </button>
    </nav>
  );
};

/* Banner — page-wide notice; neutral surface, only the icon carries colour */
export const Banner: FC<{
  tone?: 'info' | 'warning' | 'error' | 'success' | 'smart';
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}> = ({ tone = 'info', icon, title, children, action }) => {
  const ic =
    icon ||
    {
      info: 'info',
      warning: 'triangle-alert',
      error: 'circle-x',
      success: 'circle-check',
      smart: 'sparkles',
    }[tone];
  return (
    <div
      className={cx('pz-banner', `pz-banner-${tone}`)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon name={ic} className="pz-banner-icon" />
      <div className="pz-banner-main">
        <strong>{title}</strong>
        {children ? <span> {children}</span> : null}
      </div>
      {action}
    </div>
  );
};

/* RadioGroup — card-style choices */
export interface RadioOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  icon?: IconName;
}

export function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  columns = 1,
}: {
  options: RadioOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  columns?: number;
}) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="pz-radios"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <label key={o.value} className={cx('pz-radio', o.value === value && 'is-on')}>
          <input
            type="radio"
            className="pz-sr"
            name={name}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          <span className="pz-radio-dot" aria-hidden="true" />
          <span className="pz-check-text">
            <span className="pz-radio-label">
              {o.icon ? <Icon name={o.icon} size={15} /> : null}
              {o.label}
            </span>
            {o.description ? (
              <span className="pz-check-desc">{o.description}</span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  );
}

/* UsageMeter — limits; turns warning at 80%, destructive at 100% */
export const UsageMeter: FC<{
  label: ReactNode;
  used: number;
  limit: number;
  hint?: ReactNode;
}> = ({ label, used, limit, hint }) => {
  const unlimited = !isFinite(limit) || limit < 0;
  const pct = unlimited ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  const tone = pct >= 100 ? 'is-over' : pct >= 80 ? 'is-near' : '';
  return (
    <div className={cx('pz-usage', tone)}>
      <div className="pz-usage-row">
        <span className="pz-usage-label">{label}</span>
        <span className="time pz-usage-num">
          {used} <span className="pz-muted">/ {unlimited ? '∞' : limit}</span>
        </span>
      </div>
      <span className="pz-progress" role="progressbar" aria-valuenow={used}>
        <span style={{ width: unlimited ? '6%' : `${pct}%` }} />
      </span>
      {hint ? <span className="caption pz-muted">{hint}</span> : null}
    </div>
  );
};

/* Settings section card and row (SettingsLayout) */
export const Section: FC<{
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}> = ({ title, description, action, children }) => (
  <section className="pz-set-sec">
    <header className="pz-set-sec-head">
      <div>
        <h3 className="headline">{title}</h3>
        {description ? <p className="pz-set-desc">{description}</p> : null}
      </div>
      {action}
    </header>
    {children ? <div className="pz-set-sec-body">{children}</div> : null}
  </section>
);

export const Row: FC<{
  label: ReactNode;
  description?: ReactNode;
  control: ReactNode;
}> = ({ label, description, control }) => (
  <div className="pz-set-row">
    <div className="pz-check-text">
      <span className="pz-set-label">{label}</span>
      {description ? <span className="pz-check-desc">{description}</span> : null}
    </div>
    <div className="pz-set-control">{control}</div>
  </div>
);

/* Tabs — underline indicator slides on the spring curve; arrow keys move between tabs */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: ReactNode; count?: number; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState({ x: 0, w: 0 });
  useLayoutEffect(() => {
    const el = bar.current?.querySelector(
      `[data-v="${value}"]`
    ) as HTMLElement | null;
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value, tabs.length]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = tabs.length;
    let j = i;
    if (e.key === 'ArrowRight') j = (i + 1) % n;
    else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
    else return;
    e.preventDefault();
    onChange(tabs[j].value);
    (bar.current?.querySelectorAll('[role="tab"]')[j] as HTMLElement)?.focus();
  };
  return (
    <div className="pz-tabs pz-tabs-line">
      <div ref={bar} role="tablist" className="pz-tabs-bar">
        {tabs.map((t, i) => (
          <button
            key={t.value}
            data-v={t.value}
            role="tab"
            type="button"
            aria-selected={t.value === value}
            tabIndex={t.value === value ? 0 : -1}
            className="pz-tab"
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.icon ? <Icon name={t.icon} size={15} /> : null}
            {t.label}
            {t.count !== undefined ? (
              <span className="pz-tab-count">{t.count}</span>
            ) : null}
          </button>
        ))}
        <span
          className="pz-tabs-ind"
          style={{ transform: `translateX(${ind.x}px)`, width: ind.w }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
