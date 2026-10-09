'use client';

import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import {
  Button,
  Icon,
  Popover,
  SegmentedControl,
  Skeleton,
  cx,
} from '@gitroom/frontend/components/tadween/ui';
import { AnalyticsChannel } from './analytics.hooks';

// Building blocks of the analytics page, kept generic so other screens can use
// them (docs/tadween/analytics-agent.md). Styles: app/tadween/analytics.scss.

/* Sparkline: native SVG, the tile's trend at a glance */
const Sparkline: FC<{ values: number[] }> = ({ values }) => {
  const path = useMemo(() => {
    if (values.length < 2) {
      return '';
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 30 - ((v - min) / span) * 28 - 1;
        return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [values]);
  if (!path) {
    return null;
  }
  return (
    <svg className="pz-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} />
    </svg>
  );
};

/* KpiTile: one number, its change against the previous period, its trend */
export const KpiTile: FC<{
  label: ReactNode;
  value: ReactNode;
  // percent change vs the previous period; null when the data can't say
  delta?: number | null;
  deltaLabel?: string;
  hint?: ReactNode;
  trend?: number[];
  loading?: boolean;
}> = ({ label, value, delta, deltaLabel, hint, trend, loading }) => {
  const t = useT();
  if (loading) {
    return (
      <div className="pz-tile tdw-an-tile" aria-busy="true">
        <Skeleton width={96} height={12} />
        <Skeleton width={84} height={30} className="mt-[10px]" />
        <Skeleton width="100%" height={36} className="mt-[12px]" />
      </div>
    );
  }
  const hasDelta = typeof delta === 'number' && isFinite(delta);
  return (
    <div className="pz-tile tdw-an-tile">
      <div className="pz-tile-label">{label}</div>
      <div className="pz-tile-row">
        <span className="metric tdw-an-metric">{value}</span>
        {hasDelta ? (
          <span
            className={cx(
              'pz-tile-delta',
              delta! > 0 && 'is-up',
              delta! < 0 && 'is-down'
            )}
            title={deltaLabel}
          >
            {delta! > 0 ? '+' : delta! < 0 ? '−' : ''}
            {Math.abs(delta!).toFixed(Math.abs(delta!) < 10 ? 1 : 0)}%
            <span className="sr-only"> {deltaLabel}</span>
          </span>
        ) : null}
      </div>
      {hint ? (
        <div className="tdw-an-hint">{hint}</div>
      ) : hasDelta ? (
        <div className="tdw-an-hint">
          {deltaLabel || t('tdw_an_vs_previous', 'vs previous period')}
        </div>
      ) : null}
      {trend && trend.length > 1 ? <Sparkline values={trend} /> : null}
    </div>
  );
};

/* ChartCard: a titled card around one chart, with its total */
export const ChartCard: FC<{
  title: ReactNode;
  total?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  className?: string;
  children: ReactNode;
}> = ({ title, total, action, loading, className, children }) => (
  <section className={cx('tdw-an-card', className)}>
    <header className="tdw-an-card-h">
      <div className="min-w-0">
        <h3 className="tdw-an-card-title">{title}</h3>
        {total !== undefined ? (
          <div className="tdw-an-card-total">
            {loading ? <Skeleton width={70} height={22} /> : total}
          </div>
        ) : null}
      </div>
      {action}
    </header>
    {loading ? (
      <Skeleton width="100%" height={180} radius={10} />
    ) : (
      children
    )}
  </section>
);

/* RangePicker: preset day ranges plus "last N days" up to `max` */
export const RangePicker: FC<{
  presets: number[];
  max: number;
  value: number;
  onChange: (days: number) => void;
}> = ({ presets, max, value, onChange }) => {
  const t = useT();
  const anchor = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const isPreset = presets.includes(value);

  useEffect(() => {
    if (open) {
      setDraft(String(value));
    }
  }, [open]);

  const options = [
    ...presets.map((d) => ({
      value: String(d),
      label: t('tdw_an_days_short', '{{days}}d', { days: d }),
    })),
    {
      value: 'custom',
      label: isPreset
        ? t('tdw_an_custom', 'Custom')
        : t('tdw_an_last_n_days', 'Last {{days}} days', { days: value }),
    },
  ];

  const apply = () => {
    const days = Math.round(Number(draft));
    if (days >= 1) {
      onChange(Math.min(days, max));
      setOpen(false);
    }
  };

  return (
    <div className="pz-anchor tdw-an-range" ref={anchor}>
      <SegmentedControl
        size="sm"
        label={t('tdw_an_date_range', 'Date range')}
        options={options}
        value={isPreset ? String(value) : 'custom'}
        onChange={(v) => {
          if (v === 'custom') {
            setOpen(true);
            return;
          }
          onChange(Number(v));
        }}
      />
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        align="end"
        width={260}
      >
        <form
          className="tdw-an-custom"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <label className="tdw-an-custom-label" htmlFor="tdw-an-days">
            {t('tdw_an_show_last', 'Show the last')}
          </label>
          <div className="tdw-an-custom-row">
            <input
              id="tdw-an-days"
              className="pz-input tdw-an-custom-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
            />
            <span className="tdw-an-custom-unit">{t('tdw_an_days', 'days')}</span>
          </div>
          <p className="tdw-an-custom-help">
            {t('tdw_an_custom_max', 'Up to {{max}} days for this view.', { max })}
          </p>
          <Button type="submit" variant="primary" size="sm" className="w-full">
            {t('tdw_an_apply', 'Apply')}
          </Button>
        </form>
      </Popover>
    </div>
  );
};

export type ChannelStatus = 'ok' | 'reconnect' | 'disabled' | 'setup' | 'none';

export const channelStatus = (
  channel: AnalyticsChannel,
  hasAnalytics: boolean
): ChannelStatus => {
  if (channel.disabled) return 'disabled';
  if (channel.inBetweenSteps) return 'setup';
  if (channel.refreshNeeded) return 'reconnect';
  return hasAnalytics ? 'ok' : 'none';
};

const StatusLine: FC<{ status: ChannelStatus; maxDays?: number }> = ({
  status,
  maxDays,
}) => {
  const t = useT();
  switch (status) {
    case 'reconnect':
      return (
        <span className="tdw-an-status is-bad">
          <Icon name="refresh-cw" size={12} />
          {t('tdw_an_reconnect_needed', 'Reconnect needed')}
        </span>
      );
    case 'disabled':
      return (
        <span className="tdw-an-status">
          <Icon name="circle-x" size={12} />
          {t('tdw_an_disabled', 'Disabled')}
        </span>
      );
    case 'setup':
      return (
        <span className="tdw-an-status is-warn">
          <Icon name="info" size={12} />
          {t('tdw_an_finish_setup', 'Finish setup')}
        </span>
      );
    case 'none':
      return (
        <span className="tdw-an-status">
          {t('tdw_an_posts_only', 'Posts only')}
        </span>
      );
    default:
      return (
        <span className="tdw-an-status">
          {t('tdw_an_up_to_days', 'Up to {{days}} days', { days: maxDays })}
        </span>
      );
  }
};

/* ChannelList: "All channels" plus each channel, with its analytics status */
export const ChannelList: FC<{
  channels: AnalyticsChannel[];
  selected?: string;
  onSelect: (id?: string) => void;
  rangesFor: (identifier: string) => number[];
  loading?: boolean;
}> = ({ channels, selected, onSelect, rangesFor, loading }) => {
  const t = useT();
  return (
    <nav className="tdw-an-channels" aria-label={t('channels', 'Channels')}>
      <button
        type="button"
        className={cx('tdw-an-ch', !selected && 'is-active')}
        aria-current={!selected ? 'true' : undefined}
        onClick={() => onSelect(undefined)}
      >
        <span className="tdw-an-ch-all" aria-hidden="true">
          <Icon name="layers" size={16} />
        </span>
        <span className="tdw-an-ch-copy">
          <span className="tdw-an-ch-name">
            {t('tdw_an_all_channels', 'All channels')}
          </span>
          <span className="tdw-an-status">
            {t('tdw_an_published_from_tadween', 'Published from Tadween')}
          </span>
        </span>
      </button>
      <div className="tdw-an-ch-sep" role="presentation" />
      {loading
        ? [0, 1, 2].map((i) => (
            <div key={i} className="tdw-an-ch" aria-hidden="true">
              <Skeleton width={32} height={32} radius={10} />
              <span className="tdw-an-ch-copy">
                <Skeleton width={110} height={12} />
                <Skeleton width={70} height={10} className="mt-[6px]" />
              </span>
            </div>
          ))
        : channels.map((channel) => {
            const ranges = rangesFor(channel.identifier);
            const status = channelStatus(channel, ranges.length > 0);
            return (
              <button
                key={channel.id}
                type="button"
                className={cx(
                  'tdw-an-ch',
                  selected === channel.id && 'is-active',
                  status === 'disabled' && 'is-muted'
                )}
                aria-current={selected === channel.id ? 'true' : undefined}
                onClick={() => onSelect(channel.id)}
              >
                <TadweenChannelAvatar
                  integration={channel}
                  size={32}
                  className="tdw-an-ch-av"
                />
                <span className="tdw-an-ch-copy">
                  <span className="tdw-an-ch-name">{channel.name}</span>
                  <StatusLine
                    status={status}
                    maxDays={ranges[ranges.length - 1]}
                  />
                </span>
              </button>
            );
          })}
    </nav>
  );
};
