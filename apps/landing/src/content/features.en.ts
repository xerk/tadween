import type { FeatureCopy } from './types';
import type { FeatureSlug } from '@/lib/routes';

// English copy for the sections of /features, one per tool. Every claim follows the app's code
// (see the PR description for which open PR each surface comes from): no best-time
// recommendations, no approval workflow, and the agent can't delete posts.
export const featuresEn: Record<FeatureSlug, FeatureCopy> = {
  calendar: {
    nav: { label: 'Calendar', blurb: 'Day, week and month, every channel side by side' },
    title: 'The whole week, on one calm calendar',
    body: 'Day, week and month views with every channel side by side. Drag a post to move it, rest on it to read it, and let Tadween find the next free slot.',
    points: [
      'Read a post without opening it',
      'Zoom out to the month, in to the day',
      'Start the day on Today',
      'Plan from your phone',
    ],
    faq: { title: 'Which calendar views are there?', content: 'Day, week and month, plus the Board, which shows the same posts in columns by status, channel or day.' },
  },
  board: {
    nav: { label: 'Board', blurb: 'Drafts, scheduled, published and failed, in columns' },
    title: 'Every post, by status, on one board',
    body: 'Drafts, scheduled, published and failed, side by side. Group by channel or by day when that is the question you are asking.',
    points: [
      'Group the board three ways',
      'Find any post quickly',
      'Fix a failed post in one move',
    ],
    faq: { title: 'Can I drag a draft to Scheduled?', content: 'Not on the board. Open the draft and add it to the calendar, so you choose its time. The board only moves failed posts back to Scheduled.' },
  },
  composer: {
    nav: { label: 'Composer and previews', blurb: 'Write once, adjust per network, preview it' },
    title: 'Write once. See it the way each network will.',
    body: 'One editor for every channel, a version per network when you need it, and previews that match the feed. In English or Arabic, on desktop or phone.',
    points: [
      'One post, a version per network',
      'Arabic, right to left',
      'Comments that follow the post',
      'A link anyone can comment on',
    ],
    faq: { title: 'Which networks have their own preview?', content: 'LinkedIn, Facebook, Instagram, YouTube, Pinterest and TikTok have previews drawn like their feeds. Every other network shows a general preview of the text and media.' },
  },
  'media-library': {
    nav: { label: 'Media library', blurb: 'Folders, an upload dock and alt text' },
    title: 'A media library you can actually find things in',
    body: 'Folders inside folders, uploads that keep going while you work, and details for every file: alt text, size and the posts that use it.',
    points: [
      'Folders, the way you think',
      'Every file’s details',
      'Uploads that don’t make you wait',
    ],
    faq: { title: 'Which files can I upload?', content: 'Images up to 30 MB each and MP4 videos up to 1 GB, five files at a time. Each network’s own media rules are checked when you schedule.' },
  },
  analytics: {
    nav: { label: 'Analytics', blurb: 'Network numbers and what you published' },
    title: 'Numbers you can read in a minute',
    body: 'The figures each network shares, next to what you actually published from Tadween. Pick a period, compare it with the last one, export it.',
    points: [
      'What you published, over a year',
      'The network’s own numbers',
    ],
    faq: { title: 'Does LinkedIn analytics work for personal profiles?', content: 'LinkedIn shares page analytics with apps like Tadween, not profile analytics. For profiles you still get “Published from Tadween”.' },
  },
  collaboration: {
    nav: { label: 'Team, clients and alerts', blurb: 'Roles, customers, preview links and notifications' },
    title: 'Work together, and know when something needs you',
    body: 'Invite teammates, keep every client in their own group, collect comments on a link and get a clear notification when a post goes out or something goes wrong.',
    points: [
      'Notifications that say what to do',
      'One workspace, many clients',
      'Feedback on a link',
      'Roles that stay simple',
    ],
    faq: { title: 'Is there an approval step before a post goes out?', content: 'Not yet. Teams share the post’s preview link and collect comments before scheduling it. We’ll announce approvals if we build them.' },
  },
  'auto-post': {
    nav: { label: 'Auto-post and plugs', blurb: 'RSS feeds, auto-repost and webhooks' },
    title: 'Let your blog post for you',
    body: 'Point Tadween at an RSS feed and every new item becomes a post on your next free slot. Plugs repost or reply when a post takes off, and webhooks tell your own tools.',
    points: [
      'RSS to posts, every hour',
      'Plugs: act when a post takes off',
      'Webhooks for your own tools',
    ],
    faq: { title: 'How often is the feed checked?', content: 'Every hour. Each new item is scheduled on the next free slot of the channels you chose.' },
  },
  'signatures-sets': {
    nav: { label: 'Signatures and sets', blurb: 'Your sign-off and your usual channel groups' },
    title: 'Stop retyping the same things',
    body: 'A signature adds your sign-off to every new post. A set picks the channels you always use together and starts the text for you.',
    points: [
      'A signature on every new post, in either language',
      'Sets: your usual channels, picked in one click',
    ],
    faq: { title: 'Can I have a signature in Arabic and one in English?', content: 'Yes. Save both and insert the one that matches the post. Only one can be added automatically.' },
  },
};
