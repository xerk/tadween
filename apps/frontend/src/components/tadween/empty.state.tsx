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
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
      <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
    </>
  ),
  media: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="m20.5 15.5-4.5-4.5-8.5 8.5" />
    </>
  ),
  webhook: (
    <>
      <path d="M18 16.5a3.5 3.5 0 1 1-3.1 5.1M9.5 8.3A3.5 3.5 0 1 1 15 6.2" />
      <path d="M6 16.5a3.5 3.5 0 1 0 3.4 4.3h6.1M12 6.5l-3.5 6.3M15 13l3 3.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.5A6.5 6.5 0 0 1 21.5 20" />
    </>
  ),
  sparkles: (
    <>
      <path d="M11 3.5 12.6 8a3 3 0 0 0 1.9 1.9L19 11.5l-4.5 1.6a3 3 0 0 0-1.9 1.9L11 19.5 9.4 15a3 3 0 0 0-1.9-1.9L3 11.5 7.5 9.9A3 3 0 0 0 9.4 8L11 3.5Z" />
      <path d="M19 3v4M17 5h4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8 12 3.5Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5" />
    </>
  ),
  signature: (
    <>
      <path d="M3.5 17.5c2.5 0 3.5-9 6-9s-1 9 1.5 9 2.5-3 4-3 1 3 2.5 3h3" />
      <path d="M3.5 21h17" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="m11.2 11.8 8.3-8.3M16.5 6.5l2.5 2.5M14 9l2 2" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.2 2.8 17.3A2 2 0 0 0 4.5 20.3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  comment: (
    <>
      <path d="M20.5 12a8 8 0 0 1-11.7 7.1L3.5 20.5l1.4-5.3A8 8 0 1 1 20.5 12Z" />
    </>
  ),
  rss: (
    <>
      <path d="M4.5 11a8.5 8.5 0 0 1 8.5 8.5M4.5 4.5a15 15 0 0 1 15 15" />
      <circle cx="5.5" cy="18.5" r="1.25" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
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
