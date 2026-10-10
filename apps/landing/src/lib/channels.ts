// The networks Tadween publishes to, as facts that don't change with the language.
// Every number here comes from the app's provider code, so the site never promises more
// than the app does:
//   limit    → maxLength() in libraries/nestjs-libraries/src/integrations/social/<provider>.provider.ts
//   comments → the provider implements comment() (and the editor doesn't switch comments off)
//   settings → the provider's settings DTO in libraries/nestjs-libraries/src/dtos/posts/providers-settings
// The words (titles, rules, FAQ) live in content/channels.en.ts and content/channels.ar.ts.

/** How the page's mini preview draws a post on this network. */
export type PreviewKind = 'linkedin' | 'feed' | 'photo' | 'video' | 'short' | 'chat' | 'article';

export type ChannelGroup = 'professional' | 'social' | 'video';

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

/** The networks with their own page under /channels: the five Tadween focuses on, LinkedIn
    first (profile and company pages are two pages). Every `related` slug must be one of these
    (lib/redirects.ts checks). */
export const CHANNELS: ChannelFacts[] = [
  { slug: 'linkedin', providers: ['linkedin'], name: 'LinkedIn', icon: P('linkedin'), group: 'professional', limit: 3000, editor: 'normal', comments: true, preview: 'linkedin', accent: '#0a66c2', related: ['linkedin-page', 'instagram', 'youtube'] },
  { slug: 'linkedin-page', providers: ['linkedin-page'], name: 'LinkedIn Page', icon: P('linkedin-page'), group: 'professional', limit: 3000, editor: 'normal', comments: true, preview: 'linkedin', accent: '#0a66c2', related: ['linkedin', 'facebook', 'youtube'] },
  { slug: 'instagram', providers: ['instagram', 'instagram-standalone'], name: 'Instagram', icon: P('instagram'), group: 'social', limit: 2200, editor: 'normal', comments: 'text-only', preview: 'photo', accent: '#d62976', related: ['facebook', 'threads', 'linkedin'] },
  { slug: 'facebook', providers: ['facebook'], name: 'Facebook', icon: P('facebook'), group: 'social', limit: 63206, editor: 'normal', comments: true, preview: 'feed', accent: '#0866ff', related: ['instagram', 'linkedin-page', 'threads'] },
  { slug: 'threads', providers: ['threads'], name: 'Threads', icon: P('threads'), group: 'social', limit: 500, editor: 'normal', comments: true, preview: 'feed', accent: '#000000', related: ['instagram', 'linkedin', 'facebook'] },
  { slug: 'youtube', providers: ['youtube'], name: 'YouTube', icon: P('youtube'), group: 'video', limit: 5000, editor: 'normal', comments: false, preview: 'video', accent: '#ff0000', related: ['linkedin', 'instagram', 'facebook'] },
];

/** Networks the overview lists under "Also supported", with no page of their own. Their old
    pages redirect to their tile on /channels (lib/redirects.ts). `name` is the brand spelling;
    content/channels.<lang>.ts `others` gives a local spelling where there is one. */
export const OTHER_CHANNELS: { slug: string; name: string; icon: string }[] = [
  { slug: 'x', name: 'X', icon: P('x') },
  { slug: 'tiktok', name: 'TikTok', icon: P('tiktok') },
  { slug: 'pinterest', name: 'Pinterest', icon: P('pinterest') },
  { slug: 'bluesky', name: 'Bluesky', icon: P('bluesky') },
  { slug: 'mastodon', name: 'Mastodon', icon: P('mastodon') },
  { slug: 'reddit', name: 'Reddit', icon: P('reddit') },
  { slug: 'telegram', name: 'Telegram', icon: P('telegram') },
  { slug: 'discord', name: 'Discord', icon: P('discord') },
  { slug: 'slack', name: 'Slack', icon: P('slack') },
  { slug: 'google-business', name: 'Google Business Profile', icon: P('gmb') },
  { slug: 'medium', name: 'Medium', icon: P('medium') },
  { slug: 'devto', name: 'Dev.to', icon: P('devto') },
  { slug: 'hashnode', name: 'Hashnode', icon: P('hashnode') },
  { slug: 'wordpress', name: 'WordPress', icon: P('wordpress') },
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
