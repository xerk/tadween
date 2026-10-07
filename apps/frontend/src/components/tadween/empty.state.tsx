'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';

// Tadween empty state: a tinted icon tile with soft halo rings that draw in,
// one line saying what's missing, and the one next step. Styles: tadween/ui-kit.scss.
const paths: Record<string, ReactNode> = {
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17M8 14h3" />
    </>
  ),
  drafts: (
    <>
      <path d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9L14 3.5Z" />
      <path d="M14 3.5V9h5.5M8.5 13h7M8.5 16.5h4" />
    </>
  ),
  channels: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="12" cy="20.5" r="1.5" />
      <path d="m6.6 7.3 3 2.6M17.4 7.3l-3 2.6M12 15v4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="m7.5 15 3.5-4 3 2.5 5-6" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0V7ZM12 16v5" />
    </>
  ),
};

export const TadweenEmptyState: FC<{
  icon?: keyof typeof paths;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ icon = 'calendar', title, body, action, size = 'md', className }) => (
  <div className={clsx('tdw-empty', size === 'sm' && 'tdw-empty-sm', className)} role="status">
    <span className="tdw-empty-icon" aria-hidden="true">
      <span className="tdw-empty-halo" />
      <span className="tdw-empty-halo is-2" />
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {paths[icon]}
      </svg>
    </span>
    <div className="tdw-empty-copy">
      <h3 className="tdw-empty-title">{title}</h3>
      {body ? <p className="tdw-empty-body">{body}</p> : null}
    </div>
    {action ? <div className="tdw-empty-actions">{action}</div> : null}
  </div>
);
