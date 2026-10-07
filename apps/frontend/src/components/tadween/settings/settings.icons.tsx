'use client';

import { FC, ReactNode } from 'react';

// Line icons for the Tadween settings screens (24px grid, 1.75 stroke), drawn
// inline like tadween/empty.state.tsx so no icon package is needed.
const paths: Record<string, ReactNode> = {
  settings: (
    <>
      <path d="M10.3 3.6a1.7 1.7 0 0 1 3.4 0l.1.7a1.7 1.7 0 0 0 2.5 1l.6-.3a1.7 1.7 0 0 1 2.4 2.4l-.3.6a1.7 1.7 0 0 0 1 2.5l.7.1a1.7 1.7 0 0 1 0 3.4l-.7.1a1.7 1.7 0 0 0-1 2.5l.3.6a1.7 1.7 0 0 1-2.4 2.4l-.6-.3a1.7 1.7 0 0 0-2.5 1l-.1.7a1.7 1.7 0 0 1-3.4 0l-.1-.7a1.7 1.7 0 0 0-2.5-1l-.6.3a1.7 1.7 0 0 1-2.4-2.4l.3-.6a1.7 1.7 0 0 0-1-2.5l-.7-.1a1.7 1.7 0 0 1 0-3.4l.7-.1a1.7 1.7 0 0 0 1-2.5l-.3-.6a1.7 1.7 0 0 1 2.4-2.4l.6.3a1.7 1.7 0 0 0 2.5-1l.1-.7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  signature: (
    <>
      <path d="m21 17-2.16-1.73a2 2 0 0 0-2.5 0l-.68.55a2 2 0 0 1-2.5 0L12 15" />
      <path d="M3 21c1.5-3 3.5-6 6-8.5 2-2 3.5-2.5 4.5-1.5s.5 2.5-1.5 4.5C9.5 18 6 20 3 21Z" />
      <path d="M3 21h18" />
    </>
  ),
  layers: (
    <>
      <path d="m12.83 2.18 8.6 3.91a1 1 0 0 1 0 1.83l-8.58 3.9a2 2 0 0 1-1.66 0L2.6 7.92a1 1 0 0 1 0-1.83l8.58-3.9a2 2 0 0 1 1.65 0Z" />
      <path d="m22 12.5-9.17 4.17a2 2 0 0 1-1.66 0L2 12.5" />
      <path d="m22 17-9.17 4.17a2 2 0 0 1-1.66 0L2 17" />
    </>
  ),
  rss: (
    <>
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </>
  ),
  webhook: (
    <>
      <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
      <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
      <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
    </>
  ),
  key: (
    <>
      <path d="M2.59 18.41A2 2 0 0 0 2 19.83V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.17a2 2 0 0 0 1.42-.59l.81-.81a6.5 6.5 0 1 0-4.17-4.17Z" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </>
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </>
  ),
  'user-plus': (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>
  ),
  crown: (
    <>
      <path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.28-3.66a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.72H5.8a1 1 0 0 1-.96-.72L2.01 6.03a.5.5 0 0 1 .8-.52l4.28 3.66a1 1 0 0 0 1.52-.3Z" />
      <path d="M5 21h14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  send: (
    <>
      <path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.03.94l7.93 3.18a2 2 0 0 1 1.11 1.11Z" />
      <path d="m21.85 2.15-10.94 10.94" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
};

export type SettingsIconName = keyof typeof paths;

export const SettingsIcon: FC<{ name: SettingsIconName; size?: number }> = ({
  name,
  size = 16,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths[name]}
  </svg>
);
