'use client';

// Tadween UI kit: DataTable — the one list component of the super-admin console.
//
// Two modes, same props and look:
//   · server — pass `query` + `onQueryChange` (from useTableQuery) and the page
//     of `rows` plus `total` the backend returned. Paging, sorting, search and
//     filters are done by the API; the state lives in the URL (?page, size,
//     sort, order, q and one param per filter), so a view can be shared and the
//     back button walks through it.
//   · client — omit `query`; the table searches, filters, sorts and pages
//     `rows` itself. For short registries (channel types, plans) that are not
//     database lists.
// Plus: column visibility and density (remembered per `id` in localStorage),
// row selection with bulk actions, row click (open a detail drawer), skeleton,
// empty and error states, sticky header and CSV export.
// Docs: docs/tadween/admin-console.md
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button, cx, Icon, IconButton, Skeleton } from './primitives';
import { Input } from './forms';
import { Popover, Select } from './pickers';
import { Pagination, TableColumn } from './layout';

export interface DataColumn<R> extends TableColumn<R> {
  // Plain-text name for the column menu and the CSV header (defaults to label).
  title?: string;
  // The API's sort key is `key`. In client mode `sortValue` is compared.
  sortable?: boolean;
  sortValue?: (row: R) => string | number | null | undefined;
  // false keeps the column out of the Columns menu (always shown).
  hideable?: boolean;
  defaultHidden?: boolean;
  // Value written to the CSV; columns without one are not exported.
  csv?: (row: R) => string | number | boolean | null | undefined;
}

export interface DataFilter<R = unknown> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  // Client mode only.
  match?: (row: R, value: string) => boolean;
}

export interface TableQuery {
  page: number; // 0-based
  pageSize: number;
  sort: string;
  order: '' | 'asc' | 'desc';
  search: string;
  filters: Record<string, string>;
}

export const PAGE_SIZES = [20, 50, 100];

export const emptyQuery = (pageSize = PAGE_SIZES[0]): TableQuery => ({
  page: 0,
  pageSize,
  sort: '',
  order: '',
  search: '',
  filters: {},
});

// A change applied to a query: filters merge, anything but a page change goes
// back to the first page.
export const applyQueryPatch = (
  query: TableQuery,
  patch: Partial<TableQuery>
): TableQuery => ({
  ...query,
  ...patch,
  filters: { ...query.filters, ...(patch.filters || {}) },
  page: patch.page ?? 0,
});

// URL-backed query for a server-mode DataTable. Unrelated params (?open=…)
// are kept.
export const useTableQuery = (options: {
  filters?: string[];
  pageSize?: number;
}) => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filterKeys = options.filters || [];
  const raw = params?.toString() || '';

  const query = useMemo<TableQuery>(() => {
    const p = new URLSearchParams(raw);
    const size = parseInt(p.get('size') || '', 10);
    const order = p.get('order');
    return {
      page: Math.max(0, (parseInt(p.get('page') || '1', 10) || 1) - 1),
      pageSize: PAGE_SIZES.includes(size)
        ? size
        : options.pageSize || PAGE_SIZES[0],
      sort: p.get('sort') || '',
      order: order === 'asc' || order === 'desc' ? order : '',
      search: p.get('q') || '',
      filters: filterKeys.reduce(
        (all, key) => ({ ...all, [key]: p.get(key) || '' }),
        {} as Record<string, string>
      ),
    };
  }, [raw]);

  const setQuery = useCallback(
    (patch: Partial<TableQuery>) => {
      const next = applyQueryPatch(query, patch);
      const p = new URLSearchParams(raw);
      const put = (key: string, value: string | number, skip: unknown) =>
        value === skip || value === '' ? p.delete(key) : p.set(key, String(value));
      put('page', next.page + 1, 1);
      put('size', next.pageSize, options.pageSize || PAGE_SIZES[0]);
      put('sort', next.sort, '');
      put('order', next.order, '');
      put('q', next.search, '');
      filterKeys.forEach((key) => put(key, next.filters[key] || '', ''));
      const qs = p.toString();
      const href = `${pathname}${qs ? '?' + qs : ''}`;
      // Typing in search replaces; every other change is a history step.
      if (Object.keys(patch).length === 1 && 'search' in patch) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href, { scroll: false });
      }
    },
    [query, raw, pathname]
  );

  return { query, setQuery };
};

// The API side of a TableQuery: page is 0-based, empty values are dropped.
export const tableQueryString = (query: TableQuery) => {
  const p = new URLSearchParams();
  p.set('page', String(query.page));
  p.set('pageSize', String(query.pageSize));
  if (query.sort) p.set('sort', query.sort);
  if (query.order) p.set('order', query.order);
  if (query.search) p.set('search', query.search);
  Object.entries(query.filters).forEach(([k, v]) => v && p.set(k, v));
  return p.toString();
};

// ?open=<id> — the row whose detail drawer is open, so it survives a reload
// and can be linked.
export const useOpenRow = (param = 'open') => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params?.toString() || '';
  const open = new URLSearchParams(raw).get(param);
  const setOpen = useCallback(
    (id: string | null) => {
      const p = new URLSearchParams(raw);
      id ? p.set(param, id) : p.delete(param);
      const qs = p.toString();
      router.push(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
    },
    [raw, pathname]
  );
  return [open, setOpen] as const;
};

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const download = (filename: string, text: string) => {
  // BOM so Excel opens Arabic text as UTF-8.
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStored = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode / blocked storage: the setting just isn't remembered
  }
};

const textOf = (node: ReactNode) => (typeof node === 'string' ? node : '');

export interface DataTableProps<R> {
  // Remembers column visibility and density; also the CSV file name.
  id: string;
  columns: DataColumn<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  // Server mode (inferred when onQueryChange is given). A client-mode table
  // can still take a controlled `query` to know what the user searched.
  mode?: 'server' | 'client';
  query?: TableQuery;
  onQueryChange?: (patch: Partial<TableQuery>) => void;
  total?: number;
  // State
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  // Toolbar
  searchable?: boolean;
  searchPlaceholder?: string;
  searchText?: (row: R) => string; // client mode
  filters?: DataFilter<R>[];
  toolbar?: ReactNode;
  // Rows
  onRowClick?: (row: R) => void;
  activeKey?: string | null;
  selectable?: boolean;
  bulkActions?: (selected: R[], clear: () => void) => ReactNode;
  empty?: ReactNode;
  // CSV of the whole current query (server mode: fetch every page).
  exportAll?: () => Promise<R[]>;
  paginate?: boolean;
}

export function DataTable<R>({
  id,
  columns,
  rows,
  rowKey,
  mode,
  query: controlled,
  onQueryChange,
  total,
  loading,
  error,
  onRetry,
  searchable = true,
  searchPlaceholder,
  searchText,
  filters = [],
  toolbar,
  onRowClick,
  activeKey,
  selectable,
  bulkActions,
  empty,
  exportAll,
  paginate = true,
}: DataTableProps<R>) {
  const t = useT();
  const server = mode ? mode === 'server' : !!onQueryChange && !!controlled;
  const [local, setLocal] = useState<TableQuery>(() =>
    emptyQuery(paginate ? PAGE_SIZES[0] : 10000)
  );
  const query = controlled && onQueryChange ? controlled : local;
  const change = useCallback(
    (patch: Partial<TableQuery>) => {
      if (controlled && onQueryChange) {
        onQueryChange(patch);
        return;
      }
      setLocal((q) => applyQueryPatch(q, patch));
    },
    [controlled, onQueryChange]
  );

  // Remembered view settings
  const [hidden, setHidden] = useState<string[]>(() =>
    columns.filter((c) => c.defaultHidden).map((c) => c.key)
  );
  const [dense, setDense] = useState(false);
  useEffect(() => {
    setHidden(readStored(`tdw-dt:${id}:hidden`, hidden));
    setDense(readStored(`tdw-dt:${id}:dense`, false));
  }, [id]);
  const toggleColumn = (key: string) => {
    const next = hidden.includes(key)
      ? hidden.filter((k) => k !== key)
      : [...hidden, key];
    setHidden(next);
    writeStored(`tdw-dt:${id}:hidden`, next);
  };
  const toggleDense = () => {
    setDense(!dense);
    writeStored(`tdw-dt:${id}:dense`, !dense);
  };
  const shown = columns.filter((c) => !hidden.includes(c.key));

  // Search box: typed text goes to the query after a pause
  const [draft, setDraft] = useState(query.search);
  useEffect(() => setDraft(query.search), [query.search]);
  useEffect(() => {
    if (draft === query.search) return;
    const timer = setTimeout(() => change({ search: draft.trim() }), 300);
    return () => clearTimeout(timer);
  }, [draft]);

  // Client mode: search, filter, sort and page here
  const processed = useMemo(() => {
    if (server) return { page: rows, total: total ?? rows.length, all: rows };
    const q = query.search.toLowerCase();
    let list = rows.filter((r) => {
      if (q) {
        const hay = searchText
          ? searchText(r)
          : columns.map((c) => String(c.csv?.(r) ?? c.sortValue?.(r) ?? '')).join(' ');
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return filters.every(
        (f) => !query.filters[f.key] || !f.match || f.match(r, query.filters[f.key])
      );
    });
    const col = columns.find((c) => c.key === query.sort);
    if (col?.sortValue) {
      const dir = query.order === 'desc' ? -1 : 1;
      list = [...list].sort((a, b) => {
        const x = col.sortValue!(a) ?? '';
        const y = col.sortValue!(b) ?? '';
        return (x > y ? 1 : x < y ? -1 : 0) * dir;
      });
    }
    const start = query.page * query.pageSize;
    return {
      page: list.slice(start, start + query.pageSize),
      total: list.length,
      all: list,
    };
  }, [server, rows, total, query, columns, filters, searchText]);

  const pageRows = processed.page;
  const count = processed.total;
  const pages = Math.max(1, Math.ceil(count / query.pageSize));

  // Selection (cleared whenever the query changes)
  const [selected, setSelected] = useState<string[]>([]);
  const queryKey = JSON.stringify(query);
  useEffect(() => setSelected([]), [queryKey]);
  const pageKeys = pageRows.map(rowKey);
  const allOnPage = !!pageKeys.length && pageKeys.every((k) => selected.includes(k));
  const selectedRows = pageRows.filter((r) => selected.includes(rowKey(r)));
  const clearSelection = () => setSelected([]);

  const sortBy = (c: DataColumn<R>) => {
    if (!c.sortable) return;
    // asc → desc → default
    if (query.sort !== c.key) change({ sort: c.key, order: 'asc' });
    else if (query.order !== 'desc') change({ sort: c.key, order: 'desc' });
    else change({ sort: '', order: '' });
  };

  const [exporting, setExporting] = useState(false);
  const exportable = columns.filter((c) => c.csv && !hidden.includes(c.key));
  const runExport = async () => {
    setExporting(true);
    try {
      const data = server && exportAll ? await exportAll() : processed.all;
      const head = exportable.map((c) => csvCell(c.title || textOf(c.label) || c.key));
      const body = data.map((r) => exportable.map((c) => csvCell(c.csv!(r))).join(','));
      download(`${id}.csv`, [head.join(','), ...body].join('\r\n'));
    } finally {
      setExporting(false);
    }
  };

  const [menu, setMenu] = useState(false);
  const menuBtn = useRef<HTMLSpanElement>(null);
  const filtered =
    !!query.search || Object.values(query.filters).some(Boolean);
  const colSpan = shown.length + (selectable ? 1 : 0);
  const from = count ? query.page * query.pageSize + 1 : 0;
  const to = Math.min(count, (query.page + 1) * query.pageSize);

  return (
    <div className={cx('pz-dt', dense && 'is-dense')}>
      <div className="pz-dt-toolbar">
        {searchable ? (
          <Input
            aria-label={searchPlaceholder || t('tdw_dt_search', 'Search')}
            icon="search"
            placeholder={searchPlaceholder || t('tdw_dt_search', 'Search')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        ) : null}
        {filters.map((f) => (
          <Select
            key={f.key}
            size="sm"
            aria-label={f.label}
            value={query.filters[f.key] || ''}
            onChange={(v) => change({ filters: { [f.key]: String(v) } })}
            options={[
              { value: '', label: `${f.label}: ${t('tdw_dt_all', 'All')}` },
              ...f.options.map((o) => ({ value: o.value, label: `${f.label}: ${o.label}` })),
            ]}
          />
        ))}
        {filtered ? (
          <Button
            size="sm"
            variant="ghost"
            icon="x"
            onClick={() =>
              change({
                search: '',
                filters: filters.reduce((all, f) => ({ ...all, [f.key]: '' }), {}),
              })
            }
          >
            {t('tdw_dt_clear', 'Clear')}
          </Button>
        ) : null}
        <span className="pz-dt-spacer" />
        {toolbar}
        <span ref={menuBtn} className="relative inline-flex">
          <IconButton
            size="sm"
            icon="layers"
            label={t('tdw_dt_columns', 'Columns')}
            onClick={() => setMenu(!menu)}
          />
          <Popover open={menu} onClose={() => setMenu(false)} anchor={menuBtn} align="end" width={220}>
            <div className="pz-dt-menu" role="group" aria-label={t('tdw_dt_columns', 'Columns')}>
              <div className="caption pz-muted px-[8px] py-[4px]">{t('tdw_dt_columns', 'Columns')}</div>
              {columns
                .filter((c) => c.hideable !== false && (c.title || textOf(c.label)))
                .map((c) => (
                  <label key={c.key} className="pz-dt-menu-item">
                    <input
                      type="checkbox"
                      className="pz-dt-check"
                      checked={!hidden.includes(c.key)}
                      onChange={() => toggleColumn(c.key)}
                    />
                    {c.title || textOf(c.label)}
                  </label>
                ))}
            </div>
          </Popover>
        </span>
        <IconButton
          size="sm"
          icon={dense ? 'maximize-2' : 'minus'}
          label={dense ? t('tdw_dt_comfortable', 'Comfortable rows') : t('tdw_dt_compact', 'Compact rows')}
          onClick={toggleDense}
        />
        {exportable.length ? (
          <IconButton
            size="sm"
            icon="download"
            label={exporting ? t('tdw_dt_exporting', 'Exporting…') : t('tdw_dt_export', 'Export CSV')}
            disabled={exporting || !count}
            onClick={runExport}
          />
        ) : null}
      </div>

      <div className="pz-table-wrap pz-dt-scroll" aria-busy={loading || undefined}>
        <table className={cx('pz-table', loading && pageRows.length ? 'is-refreshing' : '')}>
          <thead>
            <tr>
              {selectable ? (
                <th className="pz-dt-select">
                  <input
                    type="checkbox"
                    className="pz-dt-check"
                    aria-label={t('tdw_dt_select_page', 'Select all on this page')}
                    checked={allOnPage}
                    disabled={!pageKeys.length}
                    onChange={() =>
                      setSelected(allOnPage ? [] : Array.from(new Set([...selected, ...pageKeys])))
                    }
                  />
                </th>
              ) : null}
              {shown.map((c) => {
                const active = query.sort === c.key && !!query.order;
                return (
                  <th
                    key={c.key}
                    style={{ width: c.width, textAlign: c.align }}
                    aria-sort={active ? (query.order === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {c.sortable ? (
                      <button type="button" className={cx('pz-dt-sort', active && 'is-active')} onClick={() => sortBy(c)}>
                        {c.label}
                        <Icon
                          name={active && query.order === 'desc' ? 'arrow-down' : 'arrow-up'}
                          size={12}
                          className="pz-dt-sort-icon"
                        />
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={colSpan} className="pz-td-empty">
                  <div className="pz-dt-state">
                    <Icon name="triangle-alert" size={20} />
                    <span>{t('tdw_dt_error', 'Couldn’t load this list.')}</span>
                    <span className="caption pz-muted">{error}</span>
                    {onRetry ? (
                      <Button size="sm" icon="refresh-cw" onClick={onRetry}>
                        {t('tdw_dt_retry', 'Try again')}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : loading && !pageRows.length ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {selectable ? <td /> : null}
                  {shown.map((c) => (
                    <td key={c.key}>
                      <Skeleton height={12} width="70%" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length ? (
              pageRows.map((r) => {
                const key = rowKey(r);
                const isSelected = selected.includes(key);
                return (
                  <tr
                    key={key}
                    className={cx(
                      onRowClick && 'is-clickable',
                      (isSelected || activeKey === key) && 'is-selected'
                    )}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(r);
                          }
                        : undefined
                    }
                  >
                    {selectable ? (
                      <td className="pz-dt-select" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="pz-dt-check"
                          aria-label={t('tdw_dt_select_row', 'Select row')}
                          checked={isSelected}
                          onChange={() =>
                            setSelected(isSelected ? selected.filter((k) => k !== key) : [...selected, key])
                          }
                        />
                      </td>
                    ) : null}
                    {shown.map((c) => (
                      <td key={c.key} style={{ textAlign: c.align }}>
                        {c.render ? c.render(r) : ((r as Record<string, unknown>)[c.key] as ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={colSpan} className="pz-td-empty">
                  <div className="pz-dt-state">
                    <Icon name="search" size={20} />
                    <span>
                      {filtered
                        ? t('tdw_dt_no_match', 'Nothing matches these filters.')
                        : empty || t('tdw_dt_empty', 'Nothing here yet.')}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {selectable && selectedRows.length ? (
          <div className="pz-table-bulk">
            <span>{t('tdw_dt_selected', '{{count}} selected', { count: selectedRows.length })}</span>
            <span className="pz-dt-spacer" />
            {bulkActions?.(selectedRows, clearSelection)}
            <button type="button" className="pz-link-btn" onClick={clearSelection}>
              {t('tdw_dt_clear_selection', 'Clear selection')}
            </button>
          </div>
        ) : null}
      </div>

      {paginate ? (
        <div className="pz-dt-foot">
          <span className="caption pz-muted">
            {t('tdw_dt_range', '{{from}}–{{to}} of {{total}}', {
              from: from.toLocaleString('en-US'),
              to: to.toLocaleString('en-US'),
              total: count.toLocaleString('en-US'),
            })}
          </span>
          <Select
            size="sm"
            aria-label={t('tdw_dt_page_size', 'Rows per page')}
            value={String(query.pageSize)}
            onChange={(v) => change({ pageSize: Number(v) })}
            options={PAGE_SIZES.map((n) => ({
              value: String(n),
              label: t('tdw_dt_per_page', '{{count}} per page', { count: n }),
            }))}
          />
          <span className="pz-dt-spacer" />
          <Pagination page={query.page + 1} pages={pages} onChange={(p) => change({ page: p - 1 })} />
        </div>
      ) : null}
    </div>
  );
}
