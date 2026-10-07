'use client';

// Tadween UI kit: feedback (design system feedback.tsx). EmptyState uses the
// icon-tile variant; spot illustrations can be ported from illustrations.tsx later.
import React, { FC, ReactNode } from 'react';
import Link from 'next/link';
import { cx, Icon, IconName, Skeleton } from './primitives';

/* EmptyState — says what's missing and the one next step */
export const EmptyState: FC<{
  icon?: IconName;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  secondary?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}> = ({ icon = 'calendar-days', title, body, action, secondary, size = 'md' }) => (
  <div className={cx('pz-empty', `pz-empty-${size}`)}>
    <span className="pz-empty-icon" aria-hidden="true">
      <span className="pz-empty-halo" />
      <span className="pz-empty-halo is-2" />
      <Icon name={icon} size={size === 'sm' ? 20 : 24} />
    </span>
    <div className="pz-empty-copy">
      <h3 className="pz-empty-title">{title}</h3>
      {body ? <p className="pz-empty-body">{body}</p> : null}
    </div>
    {action || secondary ? (
      <div className="pz-empty-actions">
        {secondary}
        {action}
      </div>
    ) : null}
  </div>
);

/* StatTile — one number and its label (AnalyticsTile without the sparkline) */
export const StatTile: FC<{
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  tone?: 'neutral' | 'warn' | 'bad';
  href?: string;
}> = ({ label, value, hint, loading, tone = 'neutral', href }) => {
  if (loading) {
    return (
      <div className="pz-tile" aria-busy="true">
        <Skeleton width={90} height={12} />
        <Skeleton width={80} height={28} className="mt-[10px]" />
      </div>
    );
  }
  const body = (
    <>
      <div className="pz-tile-label">{label}</div>
      <div className="pz-tile-row">
        <span
          className={cx(
            'metric',
            tone === 'warn' && 'text-[var(--tdw-warning)]',
            tone === 'bad' && 'text-[var(--tdw-destructive)]'
          )}
        >
          {value}
        </span>
      </div>
      {hint ? <div className="caption pz-muted mt-[4px]">{hint}</div> : null}
    </>
  );
  return href ? (
    <Link href={href} className="pz-tile no-underline !text-[var(--tdw-foreground)] hover:!shadow-[var(--tdw-shadow-md)]">
      {body}
    </Link>
  ) : (
    <div className="pz-tile">{body}</div>
  );
};
