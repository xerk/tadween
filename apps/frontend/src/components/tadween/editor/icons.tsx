'use client';

import { FC, ReactNode, SVGProps } from 'react';

// Line icons for the post editor (lucide geometry, 24px grid, currentColor).
const paths: Record<string, ReactNode> = {
  pencil: (
    <>
      <path d="M21.17 6.81a2.83 2.83 0 0 0-4-4L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5Z" />
      <path d="m15 5 4 4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  type: <path d="M4 7V4h16v3M9 20h6M12 4v16" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  send: (
    <>
      <path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.03.93l7.93 3.18a2 2 0 0 1 1.11 1.11Z" />
      <path d="m21.85 2.15-10.94 10.94" />
    </>
  ),
};

export const TadweenIcon: FC<
  { name: keyof typeof paths; size?: number } & SVGProps<SVGSVGElement>
> = ({ name, size = 16, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {paths[name]}
  </svg>
);
