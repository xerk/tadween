// Product screenshots, taken from the real app with a fictional demo workspace (see
// docs/tadween/demo-data.md). Each one exists four times in public/product:
// <id>-<en|ar>-<light|dark>.webp, captured at 2x and sized to the width below. Alt text is
// per language, in content/en.ts and content/ar.ts (`shots`).

export type ShotFrame = 'browser' | 'bare' | 'phone';

export interface ShotSpec {
  /** Intrinsic size of the files, for width/height (no layout shift). */
  w: number;
  h: number;
  frame: ShotFrame;
  /** The app path shown in the browser frame's address bar. */
  path?: string;
}

export const SHOTS = {
  today: { w: 2400, h: 1500, frame: 'browser', path: '/today' },
  'calendar-week': { w: 2400, h: 1500, frame: 'browser', path: '/launches' },
  'calendar-month': { w: 2400, h: 1500, frame: 'browser', path: '/launches?display=month' },
  'calendar-preview': { w: 680, h: 568, frame: 'bare' },
  'preview-failed': { w: 680, h: 440, frame: 'bare' },
  'calendar-phone': { w: 780, h: 1688, frame: 'phone' },
  board: { w: 2400, h: 1500, frame: 'browser', path: '/launches?display=list' },
  'board-channel': { w: 2400, h: 1500, frame: 'browser', path: '/launches?display=list' },
  composer: { w: 2400, h: 1500, frame: 'browser', path: '/launches' },
  'composer-arabic': { w: 2400, h: 1500, frame: 'browser', path: '/launches' },
  'composer-phone': { w: 780, h: 1688, frame: 'phone' },
  'post-page': { w: 2400, h: 1500, frame: 'browser', path: '/p/…' },
  media: { w: 2400, h: 1500, frame: 'browser', path: '/media' },
  'media-details': { w: 2400, h: 1500, frame: 'browser', path: '/media' },
  'media-upload': { w: 2400, h: 1500, frame: 'browser', path: '/media' },
  notifications: { w: 840, h: 1240, frame: 'bare' },
  analytics: { w: 2400, h: 1500, frame: 'browser', path: '/analytics' },
  'analytics-channel': { w: 2400, h: 1500, frame: 'browser', path: '/analytics' },
  agent: { w: 2400, h: 1500, frame: 'browser', path: '/agents' },
  signatures: { w: 2400, h: 1500, frame: 'browser', path: '/settings?tab=signatures' },
  sets: { w: 2400, h: 1500, frame: 'browser', path: '/settings?tab=sets' },
  autopost: { w: 2400, h: 1500, frame: 'browser', path: '/settings?tab=autopost' },
  plugs: { w: 2400, h: 1500, frame: 'browser', path: '/plugs' },
  webhooks: { w: 2400, h: 1500, frame: 'browser', path: '/settings?tab=webhooks' },
  team: { w: 2400, h: 1500, frame: 'browser', path: '/settings?tab=teams' },
} as const satisfies Record<string, ShotSpec>;

export type ShotId = keyof typeof SHOTS;

export const shotSrc = (id: string, lang: 'en' | 'ar', theme: 'light' | 'dark') => `/product/${id}-${lang}-${theme}.webp`;

/** The composer with one network's preview, for that network's page:
    channel-<slug>-<en|ar>-<light|dark>.webp. */
export const CHANNEL_SHOT = { w: 2400, h: 1500 } as const;
export const channelShotSrc = (slug: string, lang: 'en' | 'ar', theme: 'light' | 'dark') => `/product/channel-${slug}-${lang}-${theme}.webp`;
