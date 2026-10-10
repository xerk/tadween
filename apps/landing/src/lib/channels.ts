// The networks Tadween publishes to, as facts that don't change with the language.
// Every number here comes from the app's provider code, so the site never promises more
// than the app does:
//   limit    → maxLength() in libraries/nestjs-libraries/src/integrations/social/<provider>.provider.ts
//   comments → the provider implements comment() (and the editor doesn't switch comments off)
//   settings → the provider's settings DTO in libraries/nestjs-libraries/src/dtos/posts/providers-settings
// The words (titles, rules, FAQ) live in content/channels.en.ts and content/channels.ar.ts.

/** How the page's mini preview draws a post on this network. */
export type PreviewKind = 'linkedin' | 'feed' | 'photo' | 'video' | 'short' | 'chat' | 'article';

export type ChannelGroup = 'professional' | 'social' | 'video' | 'community' | 'blog';

export interface ChannelFacts {
  slug: string;
  /** Provider identifiers in the app that this page covers. */
  providers: string[];
  name: string;
  /** In /public/channels. */
  icon: string;
  group: ChannelGroup;
  /** Characters per post (the common case; the copy explains any variants). */
  limit: number;
  /** The editor the app gives this network: plain text, Markdown or HTML. */
  editor: 'normal' | 'markdown' | 'html';
  /** Follow-up comments or thread posts after the main post. */
  comments: boolean | 'text-only';
  preview: PreviewKind;
  /** The network's own accent for the preview chrome (a preview shows the destination). */
  accent: string;
  related: string[];
}

const P = (slug: string) => `/channels/${slug}.png`;

/** The networks with their own page under /channels. */
export const CHANNELS: ChannelFacts[] = [
  { slug: 'linkedin', providers: ['linkedin'], name: 'LinkedIn', icon: P('linkedin'), group: 'professional', limit: 3000, editor: 'normal', comments: true, preview: 'linkedin', accent: '#0a66c2', related: ['linkedin-page', 'x', 'instagram'] },
  { slug: 'linkedin-page', providers: ['linkedin-page'], name: 'LinkedIn Page', icon: P('linkedin-page'), group: 'professional', limit: 3000, editor: 'normal', comments: true, preview: 'linkedin', accent: '#0a66c2', related: ['linkedin', 'facebook', 'x'] },
  { slug: 'x', providers: ['x'], name: 'X', icon: P('x'), group: 'social', limit: 280, editor: 'html', comments: true, preview: 'feed', accent: '#1d9bf0', related: ['linkedin', 'instagram', 'facebook'] },
  { slug: 'instagram', providers: ['instagram', 'instagram-standalone'], name: 'Instagram', icon: P('instagram'), group: 'social', limit: 2200, editor: 'normal', comments: 'text-only', preview: 'photo', accent: '#d62976', related: ['facebook', 'tiktok', 'x'] },
  { slug: 'facebook', providers: ['facebook'], name: 'Facebook', icon: P('facebook'), group: 'social', limit: 63206, editor: 'normal', comments: true, preview: 'feed', accent: '#0866ff', related: ['instagram', 'linkedin-page', 'tiktok'] },
  { slug: 'tiktok', providers: ['tiktok', 'tiktok-business'], name: 'TikTok', icon: P('tiktok'), group: 'video', limit: 2000, editor: 'normal', comments: false, preview: 'short', accent: '#fe2c55', related: ['instagram', 'facebook', 'x'] },
];

/** Networks the overview lists by group, with a one-line note (content/channels.<lang>.ts,
    `others`) but no page of their own. Their old pages redirect to /channels (lib/redirects.ts). */
export const OTHER_CHANNELS: { slug: string; name: string; icon: string; group: ChannelGroup }[] = [
  { slug: 'threads', name: 'Threads', icon: P('threads'), group: 'social' },
  { slug: 'youtube', name: 'YouTube', icon: P('youtube'), group: 'video' },
  { slug: 'pinterest', name: 'Pinterest', icon: P('pinterest'), group: 'social' },
  { slug: 'bluesky', name: 'Bluesky', icon: P('bluesky'), group: 'social' },
  { slug: 'mastodon', name: 'Mastodon', icon: P('mastodon'), group: 'social' },
  { slug: 'reddit', name: 'Reddit', icon: P('reddit'), group: 'community' },
  { slug: 'telegram', name: 'Telegram', icon: P('telegram'), group: 'community' },
  { slug: 'discord', name: 'Discord', icon: P('discord'), group: 'community' },
  { slug: 'slack', name: 'Slack', icon: P('slack'), group: 'community' },
  { slug: 'google-business', name: 'Google Business Profile', icon: P('gmb'), group: 'social' },
  { slug: 'medium', name: 'Medium', icon: P('medium'), group: 'blog' },
  { slug: 'devto', name: 'Dev.to', icon: P('devto'), group: 'blog' },
  { slug: 'hashnode', name: 'Hashnode', icon: P('hashnode'), group: 'blog' },
  { slug: 'wordpress', name: 'WordPress', icon: P('wordpress'), group: 'blog' },
];

/** More networks the app publishes to, listed by name on the overview. */
export const MORE_CHANNELS: { name: string; icon: string }[] = [
  { name: 'Tumblr', icon: P('tumblr') },
  { name: 'Lemmy', icon: P('lemmy') },
  { name: 'Dribbble', icon: P('dribbble') },
  { name: 'VK', icon: P('vk') },
  { name: 'Nostr', icon: P('nostr') },
  { name: 'Farcaster', icon: P('wrapcast') },
  { name: 'Twitch', icon: P('twitch') },
  { name: 'Kick', icon: P('kick') },
  { name: 'Whop', icon: P('whop') },
  { name: 'Skool', icon: P('skool') },
  { name: 'MeWe', icon: P('mewe') },
  { name: 'Listmonk', icon: P('listmonk') },
  { name: 'Moltbook', icon: P('moltbook') },
];

export const channelBySlug = (slug: string) => CHANNELS.find((c) => c.slug === slug);

/** Any network with a slug, with or without a page: for icons and names. */
export const networkBySlug = (slug: string) => channelBySlug(slug) ?? OTHER_CHANNELS.find((c) => c.slug === slug);
