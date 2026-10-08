'use client';

// The board's own bar, Jira style: search, filter pickers, Group by, the
// period (week / month) and card density. Data-agnostic: every control is a
// prop. Styles: app/tadween/board.scss.
import React, { FC } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Icon,
  IconButton,
  IconName,
  SegmentedControl,
  SegmentOption,
  Select,
  SelectOption,
} from '@gitroom/frontend/components/tadween/ui';

export interface BoardFilter {
  key: string;
  label: string;
  icon: IconName;
  value: string;
  options: SelectOption<string>[];
  onChange: (value: string) => void;
  // The value that means "no filter"
  emptyValue?: string;
}

export const BoardToolbar: FC<{
  search: string;
  onSearch: (value: string) => void;
  filters?: BoardFilter[];
  groupBy: string;
  groupByOptions: SelectOption<string>[];
  onGroupBy: (value: string) => void;
  period?: 'week' | 'month';
  onPeriod?: (value: 'week' | 'month') => void;
  // Phones: the workspace bar hides its arrows, so the board steps the period
  onPrevious?: () => void;
  onNext?: () => void;
  density: 'comfortable' | 'compact';
  onDensity: (value: 'comfortable' | 'compact') => void;
  // e.g. "12 posts"
  summary?: string;
  onClear?: () => void;
}> = ({
  search,
  onSearch,
  filters = [],
  groupBy,
  groupByOptions,
  onGroupBy,
  period,
  onPeriod,
  onPrevious,
  onNext,
  density,
  onDensity,
  summary,
  onClear,
}) => {
  const t = useT();
  const periods: SegmentOption<'week' | 'month'>[] = [
    { value: 'week', label: t('week', 'Week') },
    { value: 'month', label: t('month', 'Month') },
  ];
  return (
    <div className="tdw-board-bar" role="toolbar" aria-label={t('tdw_board_tools', 'Board tools')}>
      <label className={clsx('tdw-board-search', !!search && 'has-value')}>
        <Icon name="search" size={15} />
        <input
          type="search"
          value={search}
          placeholder={t('tdw_board_search', 'Search posts')}
          aria-label={t('tdw_board_search', 'Search posts')}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onSearch('');
          }}
        />
        {!!search && (
          <button type="button" className="tdw-board-search-clear" aria-label={t('tdw_board_clear_search', 'Clear search')} onClick={() => onSearch('')}>
            <Icon name="x" size={13} />
          </button>
        )}
      </label>

      {filters.map((filter) => (
        <div
          key={filter.key}
          className={clsx('tdw-board-filter', filter.value !== (filter.emptyValue ?? '') && 'is-on')}
        >
          <Select<string>
            size="sm"
            icon={filter.icon}
            aria-label={filter.label}
            value={filter.value}
            options={filter.options}
            onChange={filter.onChange}
          />
        </div>
      ))}

      {onClear && (
        <button type="button" className="tdw-board-clear" onClick={onClear}>
          {t('tdw_board_clear_filters', 'Clear filters')}
        </button>
      )}

      <span className="tdw-board-grow" />

      {summary && (
        <span className="tdw-board-summary" aria-live="polite">
          {summary}
        </span>
      )}

      <div className="tdw-board-groupby">
        <Select<string>
          size="sm"
          icon="layers"
          aria-label={t('tdw_board_group_by', 'Group by')}
          value={groupBy}
          options={groupByOptions}
          onChange={onGroupBy}
        />
      </div>

      {period && onPeriod && (
        <div className="tdw-board-period">
          {onPrevious && (
            <IconButton icon="chevron-left" size="sm" className="tdw-ws-flip tdw-board-step" label={t('previous', 'Previous')} onClick={onPrevious} />
          )}
          <SegmentedControl<'week' | 'month'>
            size="sm"
            label={t('tdw_board_period', 'Period')}
            value={period}
            onChange={onPeriod}
            options={periods}
          />
          {onNext && (
            <IconButton icon="chevron-right" size="sm" className="tdw-ws-flip tdw-board-step" label={t('next', 'Next')} onClick={onNext} />
          )}
        </div>
      )}

      <IconButton
        icon={density === 'compact' ? 'layout-list' : 'list'}
        size="sm"
        className="tdw-board-density"
        aria-pressed={density === 'compact'}
        label={
          density === 'compact'
            ? t('tdw_board_comfortable', 'Comfortable cards')
            : t('tdw_board_compact', 'Compact cards')
        }
        onClick={() => onDensity(density === 'compact' ? 'comfortable' : 'compact')}
      />
    </div>
  );
};
