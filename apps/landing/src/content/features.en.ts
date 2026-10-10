import type { FeatureCopy } from './types';
import type { FeatureSlug } from '@/lib/routes';

// English copy for the tool pages under /features. Every claim follows the app's code
// (see the PR description for which open PR each surface comes from): no best-time
// recommendations, no approval workflow, and the agent can't delete posts.
export const featuresEn: Record<FeatureSlug, FeatureCopy> = {
  calendar: {
    nav: { label: 'Calendar', blurb: 'Day, week and month, every channel side by side' },
    meta: {
      title: 'Social media calendar and scheduling | Tadween',
      description:
        'Plan LinkedIn and 30+ channels on one calendar: day, week and month views, drag and drop, a hover preview of every post, time slots per channel and a Today page.',
    },
    h1: 'The whole week, on one calm calendar',
    sub: 'Day, week and month views with every channel side by side. Drag a post to move it, rest on it to read it, and let Tadween find the next free slot.',
    hero: 'calendar-week',
    callouts: ['Rest on a post to read it', 'Past hours are locked'],
    benefits: [
      {
        title: 'Read a post without opening it',
        body: 'Rest the pointer on any post for a second. A preview opens with the channel, the status, the exact time, the full text, its tags and, if it failed, the reason.',
        points: ['Duplicate, preview or open it from the same card', 'Post statistics, once the network has published it', 'On a touch screen the ⋯ menu does the same'],
        shot: 'calendar-preview',
      },
      {
        title: 'Zoom out to the month, in to the day',
        body: 'Switch between day, week and month without losing your place. Filter the calendar to one client, or click a channel to hide it and double-click to see only that one.',
        points: ['Day, week and month views', 'A customer selector for agencies', 'Coloured tags for campaigns'],
        shot: 'calendar-month',
      },
      {
        title: 'Start the day on Today',
        body: 'Today shows what goes out next and when, the week at a glance, the drafts waiting for you and anything that needs attention, like a channel to reconnect or a post that failed.',
        points: ['A live countdown to your next post', 'When you usually post, from your own history', 'Write a quick post straight from the page'],
        shot: 'today',
      },
      {
        title: 'Plan from your phone',
        body: 'On a phone the calendar opens on the day and you swipe between days. Tap a slot to write, or tap a post to see it.',
        shot: 'calendar-phone',
      },
    ],
    steps: [
      { title: 'Connect your channels', body: 'Your LinkedIn profile and pages first, then any of the 30+ networks you use.' },
      { title: 'Set your time slots', body: 'Give each channel the hours you like to post. “Next free slot” fills them in order.' },
      { title: 'Drop posts on the week', body: 'Write, pick a slot or drag a post to a new one. Tadween publishes on time.' },
    ],
    faq: [
      { title: 'Which calendar views are there?', content: 'Day, week and month, plus the Board, which shows the same posts in columns by status, channel or day.' },
      { title: 'Can I move a post that is already published?', content: 'Yes. When you drop a published post on a new time, Tadween asks whether to just update its details or to reschedule it as a new post.' },
      { title: 'Does Tadween suggest the best time to post?', content: 'No. You set the hours for each channel and Tadween fills the next free one. Today also shows when you usually post, based on your own published posts.' },
      { title: 'Can I repeat a post?', content: 'Yes. Set a post to repeat every day, every few days, every week, every two weeks or every month.' },
      { title: 'Why can’t I drop a post in the past?', content: 'Past hours are locked on the calendar, so nothing is scheduled for a time that has already gone.' },
    ],
  },
  board: {
    nav: { label: 'Board', blurb: 'Drafts, scheduled, published and failed, in columns' },
    meta: {
      title: 'Content board for social media posts | Tadween',
      description:
        'See every post by status on a board: drafts, scheduled, published and failed. Group by channel or day, filter by client or tag, and reschedule failed posts.',
    },
    h1: 'Every post, by status, on one board',
    sub: 'Drafts, scheduled, published and failed, side by side. Group by channel or by day when that is the question you are asking.',
    hero: 'board',
    callouts: ['Group by status, channel or day', 'Failed posts go back with a drag'],
    benefits: [
      {
        title: 'Group the board three ways',
        body: 'By status to see what is stuck, by channel to balance your networks, or by day to see how the week is filling up.',
        points: ['Status: drafts, scheduled, published, failed', 'Channel: one column per account', 'Day: the week as columns'],
        shot: 'board-channel',
      },
      {
        title: 'Find any post quickly',
        body: 'Search the text, filter by channel, customer or tag, and switch between this week and this month. Compact cards fit more on screen; collapse a column you don’t need.',
        shot: 'board',
      },
      {
        title: 'Fix a failed post in one move',
        body: 'Drag a failed post back to Scheduled and Tadween asks before it reschedules it. Each card says why the network refused it.',
        shot: 'preview-failed',
      },
    ],
    steps: [
      { title: 'Open the Board', body: 'It sits next to Day, Week and Month in the calendar.' },
      { title: 'Choose how to group', body: 'Status, channel or day. Tadween remembers your choice.' },
      { title: 'Act on what you see', body: 'Open a draft, read a published post or send a failed one back to the schedule.' },
    ],
    faq: [
      { title: 'Can I drag a draft to Scheduled?', content: 'Not on the board. Open the draft and add it to the calendar, so you choose its time. The board only moves failed posts back to Scheduled.' },
      { title: 'Is a post on three channels three cards?', content: 'No. A post that went to several channels in the same state shares one card.' },
      { title: 'Does the board replace the list view?', content: 'Yes. The Board took the place of the old list view in the calendar.' },
    ],
  },
  composer: {
    nav: { label: 'Composer and previews', blurb: 'Write once, adjust per network, preview it' },
    meta: {
      title: 'Post composer with network previews | Tadween',
      description:
        'Write one post, adjust it for each network and see it the way LinkedIn, Instagram, Facebook, TikTok, YouTube and Pinterest will show it. Arabic writes right to left.',
    },
    h1: 'Write once. See it the way each network will.',
    sub: 'One editor for every channel, a version per network when you need it, and previews that match the feed. In English or Arabic, on desktop or phone.',
    hero: 'composer',
    callouts: ['Length checked per channel', 'A version per network'],
    benefits: [
      {
        title: 'One post, a version per network',
        body: 'Start with one text for all channels. Open a channel to give it its own text, media and comments. Channels you don’t customise keep following the shared text.',
        points: ['Bold, underline, headings, bullets, emoji and mentions', 'Tags and a customer on every post', 'A signature or a saved set in one click'],
        shot: 'composer',
      },
      {
        id: 'arabic',
        title: 'Arabic, right to left',
        body: 'Write in Arabic and the editor and previews turn right to left on their own, so punctuation, numbers and mentions stay where your readers expect them. Mix an English post and an Arabic post in the same week.',
        shot: 'composer-arabic',
      },
      {
        title: 'Comments that follow the post',
        body: 'Add a first comment or a thread on the networks that allow it, and delay it by a minute, an hour or any time you choose. Put the link in the first comment and keep the post clean.',
        points: ['Delays from 1 minute to 2 hours, or custom', 'Repeat a post every day, week or month', 'Save as draft, add to the calendar or post now'],
        shot: 'composer-phone',
      },
      {
        title: 'A link anyone can comment on',
        body: 'Share a post’s page with a client or a teammate. They see how it will look on the network, on a phone or a desktop, and leave comments with just their name.',
        shot: 'post-page',
      },
    ],
    steps: [
      { title: 'Pick the channels', body: 'Choose accounts, or a saved set that picks them and starts the text for you.' },
      { title: 'Write and preview', body: 'Write once, check each network’s preview and length, and adjust where needed.' },
      { title: 'Schedule it', body: 'Take the next free slot, choose a time, or post now.' },
    ],
    faq: [
      { title: 'Which networks have their own preview?', content: 'LinkedIn, Facebook, Instagram, YouTube, Pinterest and TikTok have previews drawn like their feeds. Every other network shows a general preview of the text and media.' },
      { title: 'Does Tadween check the character limit?', content: 'Yes. A ring counts characters for each channel and tells you how far over you are, and “Fix before scheduling” lists anything a network would refuse.' },
      { title: 'Can AI write the post?', content: 'Yes, when AI is switched on for your workspace: the assistant writes into the editor, and you can generate images or short videos with your plan’s AI credits.' },
      { title: 'Does the person I share a preview with need an account?', content: 'No. They open the link, type their name and comment. Your team sees the comments and can resolve them.' },
    ],
  },
  'media-library': {
    nav: { label: 'Media library', blurb: 'Folders, an upload dock and alt text' },
    meta: {
      title: 'Media library with folders for social media | Tadween',
      description:
        'Keep every image and video in folders, upload in the background with a progress dock, add alt text and see where each file is used. Shared by your whole workspace.',
    },
    h1: 'A media library you can actually find things in',
    sub: 'Folders inside folders, uploads that keep going while you work, and details for every file: alt text, size and the posts that use it.',
    hero: 'media',
    callouts: ['Folders inside folders', 'Used in 3 posts'],
    benefits: [
      {
        title: 'Folders, the way you think',
        body: 'Make a folder per client, campaign or shoot, put folders inside folders, and move files between them. Search, filter by images, GIFs or videos, and sort four ways.',
        points: ['Grid or list', 'Filter used and unused files', 'Shared by the whole workspace'],
        shot: 'media',
      },
      {
        title: 'Every file’s details',
        body: 'Rename a file, write its alt text, check its size and dimensions, copy its link or download it, and see how many posts use it before you delete it.',
        shot: 'media-details',
      },
      {
        title: 'Uploads that don’t make you wait',
        body: 'Drop files or a whole folder. A dock shows each file’s progress, lets you retry a failed one or cancel the rest, and you keep working while it uploads.',
        points: ['Images up to 30 MB', 'MP4 videos up to 1 GB', 'Five files at a time'],
        shot: 'media-upload',
      },
    ],
    steps: [
      { title: 'Upload', body: 'Drag files or a folder in, or upload from the composer.' },
      { title: 'Organise', body: 'Make folders, add alt text and name things so you can find them.' },
      { title: 'Use it anywhere', body: 'Pick media for any post from the same library.' },
    ],
    faq: [
      { title: 'Which files can I upload?', content: 'Images up to 30 MB each and MP4 videos up to 1 GB, five files at a time. Each network’s own media rules are checked when you schedule.' },
      { title: 'Can I bring in an image from a link?', content: 'Yes, through the AI agent or the public API: give them a public link and the file lands in your library.' },
      { title: 'Can I generate images?', content: 'Yes, from the composer, when AI is on for your plan. Generated images use your AI credits and are saved to the library.' },
    ],
  },
  analytics: {
    nav: { label: 'Analytics', blurb: 'Network numbers and what you published' },
    meta: {
      title: 'Social media analytics for LinkedIn pages and more | Tadween',
      description:
        'See followers, reach and engagement where the network shares them, what you published from Tadween over a year, and export what you published to CSV.',
    },
    h1: 'Numbers you can read in a minute',
    sub: 'The figures each network shares, next to what you actually published from Tadween. Pick a period, compare it with the last one, export it.',
    hero: 'analytics',
    benefits: [
      {
        title: 'What you published, over a year',
        body: '“Published from Tadween” counts your own posts by day or week, by network and by channel, for up to 365 days, and compares the period with the one before.',
        points: ['Most-used network and active channels', 'Links to every live post', 'Export to CSV'],
        shot: 'analytics',
      },
      {
        title: 'The network’s own numbers',
        body: 'For LinkedIn pages, Facebook, Instagram, Threads, X, TikTok, YouTube, Pinterest and Google Business Profile, Tadween reads the figures the network shares, over 7, 30 or 90 days where it allows.',
        shot: 'analytics-channel',
      },
      {
        title: 'Results per post',
        body: 'Open a published post on the calendar and choose Post statistics to see how that one post did, on the networks that report it.',
        shot: 'calendar-preview',
      },
    ],
    steps: [
      { title: 'Connect channels', body: 'Analytics appear for the networks that share numbers.' },
      { title: 'Pick a channel and a period', body: '7, 30 or 90 days, depending on the network.' },
      { title: 'Export or share', body: 'Download a CSV for your report.' },
    ],
    faq: [
      { title: 'Does LinkedIn analytics work for personal profiles?', content: 'LinkedIn shares page analytics with apps like Tadween, not profile analytics. For profiles you still get “Published from Tadween”.' },
      { title: 'How far back does it go?', content: 'Network numbers cover 7, 30 or 90 days, depending on what each network allows. “Published from Tadween” covers up to a year.' },
      { title: 'Can I get the numbers through the API?', content: 'Yes. The public API returns each channel’s network analytics, so you can build your own reports.' },
    ],
  },
  collaboration: {
    nav: { label: 'Team, clients and alerts', blurb: 'Roles, customers, preview links and notifications' },
    meta: {
      title: 'Team collaboration and notifications for social media | Tadween',
      description:
        'Invite your team, keep each client’s channels apart, share preview links for comments, and get told when a post publishes, fails or a channel needs reconnecting.',
    },
    h1: 'Work together, and know when something needs you',
    sub: 'Invite teammates, keep every client in their own group, collect comments on a link and get a clear notification when a post goes out or something goes wrong.',
    hero: 'team',
    benefits: [
      {
        title: 'Notifications that say what to do',
        body: 'Published, failed, a channel that needs reconnecting or was switched off: each notification says what happened and what to do next. Filter by unread, published, failed or channels.',
        points: ['Mark all as read', 'Email for successes and failures, if you want it', 'Streak reminders by email'],
        shot: 'notifications',
      },
      {
        title: 'One workspace, many clients',
        body: 'Put each client’s channels under a customer. The calendar, the board and the agent can all show one customer at a time, so nobody posts to the wrong account.',
        shot: 'board-channel',
      },
      {
        title: 'Feedback on a link',
        body: 'Send a post’s page to a client. They see it the way the network will show it and comment with just their name; your team resolves the comments.',
        shot: 'post-page',
      },
      {
        title: 'Roles that stay simple',
        body: 'Invite people by email or with a link, as admins or members. Members write and schedule; admins also manage the team and billing.',
        shot: 'team',
      },
    ],
    steps: [
      { title: 'Invite your team', body: 'By email or with an invite link.' },
      { title: 'Group channels by client', body: 'Create a customer and move their channels into it.' },
      { title: 'Share and get notified', body: 'Send preview links, and let notifications tell you what needs you.' },
    ],
    faq: [
      { title: 'Is there an approval step before a post goes out?', content: 'Not yet. Teams share the post’s preview link and collect comments before scheduling it. We’ll announce approvals if we build them.' },
      { title: 'How many people can I invite?', content: 'It depends on your plan. The pricing page lists team members per plan.' },
      { title: 'What do members see?', content: 'Members write, schedule and see the calendar. They can’t see the team page or billing.' },
    ],
  },
  'auto-post': {
    nav: { label: 'Auto-post and plugs', blurb: 'RSS feeds, auto-repost and webhooks' },
    meta: {
      title: 'Auto-post from RSS, auto-repost and webhooks | Tadween',
      description:
        'Turn new items from your blog’s RSS feed into scheduled posts, repost or reply automatically when a post takes off, and call your own systems with webhooks.',
    },
    h1: 'Let your blog post for you',
    sub: 'Point Tadween at an RSS feed and every new item becomes a post on your next free slot. Plugs repost or reply when a post takes off, and webhooks tell your own tools.',
    hero: 'autopost',
    benefits: [
      {
        title: 'RSS to posts, every hour',
        body: 'Tadween checks the feed every hour and schedules each new item on the channel’s next free slot. Write a template, add the item’s picture, or let AI write the text.',
        points: ['Choose which channels get each feed', 'Start from the latest item or only new ones', 'A draft instead, when a channel’s rules aren’t met'],
        shot: 'autopost',
      },
      {
        title: 'Plugs: act when a post takes off',
        body: 'On X, Bluesky and LinkedIn pages a plug can repost your post, and on those and Threads it can add a reply, once the post passes the number of likes you set. Tadween checks every six hours, up to three times.',
        shot: 'plugs',
      },
      {
        title: 'Webhooks for your own tools',
        body: 'Send an HTTP request to your system when a post is published, for every channel or only the ones you pick, and send a test from the settings.',
        shot: 'webhooks',
      },
    ],
    steps: [
      { title: 'Add a feed', body: 'Paste your blog’s RSS address in Settings, Auto post.' },
      { title: 'Choose channels and format', body: 'Pick channels, a template and whether to add the picture.' },
      { title: 'Let it run', body: 'New items land on your calendar, where you can still edit them.' },
    ],
    faq: [
      { title: 'How often is the feed checked?', content: 'Every hour. Each new item is scheduled on the next free slot of the channels you chose.' },
      { title: 'Can I edit an auto-post before it goes out?', content: 'Yes. Auto-posts are normal posts on your calendar until they publish.' },
      { title: 'Which networks support plugs?', content: 'Auto-repost works on X, Bluesky and LinkedIn pages. The auto-reply plug works on those and Threads.' },
    ],
  },
  'signatures-sets': {
    nav: { label: 'Signatures and sets', blurb: 'Your sign-off and your usual channel groups' },
    meta: {
      title: 'Post signatures and channel sets | Tadween',
      description:
        'Save your sign-off as a signature and add it automatically, and save the channels you always post to together as a set with a starting text.',
    },
    h1: 'Stop retyping the same things',
    sub: 'A signature adds your sign-off to every new post. A set picks the channels you always use together and starts the text for you.',
    hero: 'signatures',
    benefits: [
      {
        title: 'Signatures',
        body: 'Save sign-offs in English, Arabic or both. Insert one with a click, or mark one to be added to every new post automatically.',
        points: ['One automatic signature at a time', 'As many saved signatures as you need'],
        shot: 'signatures',
      },
      {
        title: 'Sets',
        body: 'A set remembers a group of channels, their settings and a starting text. Pick it when you create a post and the composer is ready to write.',
        shot: 'sets',
      },
    ],
    steps: [
      { title: 'Create them in Settings', body: 'Signatures and Sets each have their own page.' },
      { title: 'Pick one when you write', body: 'Choose a set when you start a post, insert a signature while you write.' },
      { title: 'Change them any time', body: 'Edits apply to new posts, not to posts already scheduled.' },
    ],
    faq: [
      { title: 'Can I have a signature in Arabic and one in English?', content: 'Yes. Save both and insert the one that matches the post. Only one can be added automatically.' },
      { title: 'Are sets and signatures on every plan?', content: 'They are on every paid plan.' },
    ],
  },
};
