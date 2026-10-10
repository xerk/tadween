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

export const CHANNELS: ChannelFacts[] = [
  { slug: 'linkedin', providers: ['linkedin'], name: 'LinkedIn', icon: P('linkedin'), group: 'professional', limit: 3000, editor: 'normal', comments: true, preview: 'linkedin', accent: '#0a66c2', related: ['linkedin-page', 'x', 'threads'] },
  { slug: 'linkedin-page', providers: ['linkedin-page'], name: 'LinkedIn Page', icon: P('linkedin-page'), group: 'professional', limit: 3000, editor: 'normal', comments: true, preview: 'linkedin', accent: '#0a66c2', related: ['linkedin', 'facebook', 'x'] },
  { slug: 'x', providers: ['x'], name: 'X', icon: P('x'), group: 'social', limit: 280, editor: 'html', comments: true, preview: 'feed', accent: '#1d9bf0', related: ['threads', 'bluesky', 'linkedin'] },
  { slug: 'instagram', providers: ['instagram', 'instagram-standalone'], name: 'Instagram', icon: P('instagram'), group: 'social', limit: 2200, editor: 'normal', comments: 'text-only', preview: 'photo', accent: '#d62976', related: ['facebook', 'threads', 'tiktok'] },
  { slug: 'facebook', providers: ['facebook'], name: 'Facebook', icon: P('facebook'), group: 'social', limit: 63206, editor: 'normal', comments: true, preview: 'feed', accent: '#0866ff', related: ['instagram', 'linkedin-page', 'threads'] },
  { slug: 'threads', providers: ['threads'], name: 'Threads', icon: P('threads'), group: 'social', limit: 500, editor: 'normal', comments: true, preview: 'feed', accent: '#101010', related: ['instagram', 'x', 'bluesky'] },
  { slug: 'tiktok', providers: ['tiktok', 'tiktok-business'], name: 'TikTok', icon: P('tiktok'), group: 'video', limit: 2000, editor: 'normal', comments: false, preview: 'short', accent: '#fe2c55', related: ['instagram', 'youtube', 'facebook'] },
  { slug: 'youtube', providers: ['youtube'], name: 'YouTube', icon: P('youtube'), group: 'video', limit: 5000, editor: 'normal', comments: false, preview: 'video', accent: '#ff0000', related: ['tiktok', 'instagram', 'linkedin'] },
  { slug: 'pinterest', providers: ['pinterest'], name: 'Pinterest', icon: P('pinterest'), group: 'social', limit: 500, editor: 'normal', comments: false, preview: 'photo', accent: '#e60023', related: ['instagram', 'facebook', 'wordpress'] },
  { slug: 'bluesky', providers: ['bluesky'], name: 'Bluesky', icon: P('bluesky'), group: 'social', limit: 300, editor: 'normal', comments: true, preview: 'feed', accent: '#1185fe', related: ['x', 'threads', 'mastodon'] },
  { slug: 'mastodon', providers: ['mastodon'], name: 'Mastodon', icon: P('mastodon'), group: 'social', limit: 500, editor: 'normal', comments: true, preview: 'feed', accent: '#6364ff', related: ['bluesky', 'threads', 'x'] },
  { slug: 'reddit', providers: ['reddit'], name: 'Reddit', icon: P('reddit'), group: 'community', limit: 10000, editor: 'normal', comments: true, preview: 'article', accent: '#ff4500', related: ['discord', 'x', 'medium'] },
  { slug: 'telegram', providers: ['telegram'], name: 'Telegram', icon: P('telegram'), group: 'community', limit: 4096, editor: 'html', comments: true, preview: 'chat', accent: '#2aabee', related: ['discord', 'slack', 'x'] },
  { slug: 'discord', providers: ['discord'], name: 'Discord', icon: P('discord'), group: 'community', limit: 1980, editor: 'markdown', comments: true, preview: 'chat', accent: '#5865f2', related: ['slack', 'telegram', 'reddit'] },
  { slug: 'slack', providers: ['slack'], name: 'Slack', icon: P('slack'), group: 'community', limit: 400000, editor: 'normal', comments: true, preview: 'chat', accent: '#4a154b', related: ['discord', 'telegram', 'linkedin-page'] },
  { slug: 'google-business', providers: ['gmb'], name: 'Google Business Profile', icon: P('gmb'), group: 'social', limit: 1500, editor: 'normal', comments: false, preview: 'feed', accent: '#1a73e8', related: ['facebook', 'instagram', 'wordpress'] },
  { slug: 'medium', providers: ['medium'], name: 'Medium', icon: P('medium'), group: 'blog', limit: 100000, editor: 'markdown', comments: false, preview: 'article', accent: '#111111', related: ['devto', 'hashnode', 'wordpress'] },
  { slug: 'devto', providers: ['devto'], name: 'Dev.to', icon: P('devto'), group: 'blog', limit: 100000, editor: 'markdown', comments: false, preview: 'article', accent: '#0a0a0a', related: ['hashnode', 'medium', 'wordpress'] },
  { slug: 'hashnode', providers: ['hashnode'], name: 'Hashnode', icon: P('hashnode'), group: 'blog', limit: 10000, editor: 'markdown', comments: false, preview: 'article', accent: '#2962ff', related: ['devto', 'medium', 'wordpress'] },
  { slug: 'wordpress', providers: ['wordpress'], name: 'WordPress', icon: P('wordpress'), group: 'blog', limit: 100000, editor: 'html', comments: false, preview: 'article', accent: '#21759b', related: ['medium', 'hashnode', 'linkedin'] },
];

/** Networks the app also publishes to that don't have their own page yet. */
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
