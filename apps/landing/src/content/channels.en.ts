import type { ChannelsDict } from './types';

// English copy for the channel pages. Facts (limits, editors, comment support) are in
// lib/channels.ts; formats and media rules here restate the app's provider settings and
// @Rules in plain words. Nothing here promises more than the provider code does.
export const channelsEn: ChannelsDict = {
  meta: {
    title: 'Channels — schedule posts to LinkedIn and 30+ networks | Tadween',
    description:
      'Every network Tadween publishes to, with the real limits: characters per post, media rules and post types. LinkedIn first, and 30+ channels in one calendar.',
  },
  index: {
    title: 'One calendar, every channel',
    sub: 'LinkedIn comes first, and the rest are a click away. The main networks have a page each, with what you can schedule there and the limits Tadween checks before it publishes.',
    groups: {
      professional: 'LinkedIn',
      social: 'Social',
      video: 'Video',
      community: 'Communities and chat',
      blog: 'Blogs and articles',
    },
    more: {
      title: 'Also supported',
      sub: 'Tadween publishes to these too.',
    },
  },
  page: {
    start: 'Start 7-day trial',
    factsTitle: 'At a glance',
    limit: 'Characters per post',
    editor: 'Editor',
    editors: { normal: 'Plain text', markdown: 'Markdown', html: 'Rich text' },
    comments: 'Follow-up comments',
    commentsValue: { yes: 'Yes', text: 'Text only', no: 'Single post' },
    formatsTitle: 'What you can schedule',
    mediaTitle: 'Media rules',
    featuresTitle: 'Why schedule it with Tadween',
    shared: [
      { icon: 'calendar-days', title: 'One calendar', body: 'Day, week and month views and a board, with every channel side by side. Drag a post to move it.' },
      { icon: 'circle-check', title: 'Checked before it goes', body: 'Tadween counts characters for each channel and lists anything the network would refuse before the post is due.' },
      { icon: 'users', title: 'Your team and clients', body: 'Invite teammates, keep each client under their own customer and share a preview link for feedback.' },
      { icon: 'sparkles', title: 'An agent that can post', body: 'Ask the Tadween agent, Claude or ChatGPT to draft and schedule it for you.' },
    ],
    previewTitle: 'Your {name} post, in the composer',
    previewSub: 'Write once for every channel, then open {name} to give it its own text and media and see the preview.',
    faqTitle: 'Questions',
    relatedTitle: 'Related channels',
    ctaTitle: 'Schedule your next {name} post today.',
    ctaBody: 'Seven days free. Connect {name} in a couple of clicks and plan your week.',
    limitQ: 'How long can a {name} post be?',
    limitA: 'Up to {limit} characters. Tadween counts as you type and stops you scheduling a post that {name} would reject.',
    scheduleQ: 'Can I schedule {name} posts with other channels?',
    scheduleA: 'Yes. Write once, pick {name} and any other connected channels, adjust the text per channel if you want, and schedule them all for the same time or different times.',
  },
  items: {
    linkedin: {
      title: 'LinkedIn post scheduler for your profile | Tadween',
      description:
        'Schedule LinkedIn posts for your personal profile: text up to 3,000 characters, images, video and document carousels, with a first comment and an exact preview. In English and Arabic.',
      h1: 'Schedule LinkedIn posts for your profile',
      intro: 'Tadween was built around LinkedIn. Write in English or Arabic, see the post the way the feed will show it, and publish at the hour you choose.',
      formats: ['Text posts', 'Single image or several images', 'One video', 'Images as a swipeable document carousel, with a title', 'A first comment, posted right after'],
      media: 'A video must be the only attachment. A carousel needs two or more pictures and no video.',
      features: [
        { title: 'The preview LinkedIn will show', body: 'See where “…more” cuts your post, how images crop and how the first comment sits under it.' },
        { title: 'Links in the first comment', body: 'Keep the post clean and put the link in a comment that goes out right after it.' },
        { title: 'Arabic that reads right', body: 'Right-to-left editing and previews, so punctuation and numbers stay where your readers expect them.' },
      ],
      faq: [
        { title: 'Can I post a PDF-style carousel?', content: 'Yes. Add two or more images and switch on “Post as images carousel”. LinkedIn shows them as one swipeable document with the title you give it.' },
        { title: 'Do you store my LinkedIn password?', content: 'No. You connect through LinkedIn’s own sign-in, and Tadween keeps only the access LinkedIn grants. You can disconnect any time.' },
      ],
      sample: 'We hired our first 10 engineers in Cairo in 90 days.\n\nThree things made it work, and none of them was a recruiter.',
    },
    'linkedin-page': {
      title: 'LinkedIn company page scheduler | Tadween',
      description:
        'Schedule posts to every LinkedIn company page you admin: 3,000 characters, images, video and carousels, first comments, and auto-repost when a post takes off.',
      h1: 'Schedule posts to your LinkedIn company pages',
      intro: 'Connect every page you admin, then post to one or many at once. Your profile and your pages share one calendar, so the brand and the founder never post over each other.',
      formats: ['Text posts', 'Images or one video', 'Document carousels from two or more images', 'A first comment, posted right after', 'Auto-repost or auto-comment once a post passes a number of likes'],
      media: 'A video must be the only attachment. A carousel needs two or more pictures and no video.',
      features: [
        { title: 'All your pages, one place', body: 'Pick the pages to post to when you connect. Agencies can group each client’s pages separately.' },
        { title: 'Plugs that react to traction', body: 'Repost from another account, or add a follow-up comment, when a page post reaches the likes you set.' },
        { title: 'Profile and page together', body: 'Schedule the founder’s post and the company’s post side by side and space them out.' },
      ],
      faq: [
        { title: 'Which pages can I connect?', content: 'Any LinkedIn page where your account is an admin. You choose which ones to add after you sign in with LinkedIn.' },
        { title: 'What are plugs?', content: 'Small automations attached to a channel. On LinkedIn pages, Tadween can repost a post or add a comment once it passes the number of likes you choose.' },
      ],
      sample: 'Studio Nile is hiring two product designers in Cairo.\n\nRemote-friendly, Arabic and English. Details in the first comment.',
    },
    x: {
      title: 'X (Twitter) post and thread scheduler | Tadween',
      description:
        'Schedule posts, threads and long-form articles on X. 280 characters, or 4,000 with Premium, up to four images or one video, reply controls and Communities.',
      h1: 'Schedule posts and threads on X',
      intro: 'Draft a single post or a whole thread, check the count the way X counts it, and schedule it beside your LinkedIn week.',
      formats: ['Posts and threads', 'Long-form articles, as a draft or published, with a cover', 'Who can reply: everyone, people you follow, people you mention, subscribers or verified accounts', 'Posting to a Community', '“Made with AI” and paid partnership labels'],
      media: 'Up to four pictures or one video per post. A post can also be text only. In an article, pictures go inside the text.',
      limitNote: '280 characters per post, 4,000 when the account is marked as Premium, and long-form for articles.',
      features: [
        { title: 'Threads from one draft', body: 'Add the next post under the first and Tadween publishes them in order as one thread.' },
        { title: 'Counted the way X counts', body: 'Links count as 23 characters and some characters count double, so what fits in Tadween fits on X.' },
        { title: 'Plugs for reach', body: 'Repost from another account or add a follow-up once a post passes the likes you set.' },
      ],
      faq: [
        { title: 'Does it support X Premium’s longer posts?', content: 'Yes. Mark the channel as Premium in its settings and the limit goes up to 4,000 characters.' },
        { title: 'Can I schedule an X article?', content: 'Yes. Set the post type to article, add a title and an optional cover, and choose whether it goes out as a draft or published.' },
      ],
      sample: 'Hiring in Cairo, 90 days, 10 engineers.\n\nWhat worked, in one thread ↓',
    },
    instagram: {
      title: 'Instagram post, reel and story scheduler | Tadween',
      description:
        'Schedule Instagram posts, carousels, reels and stories for business and creator accounts: 2,200-character captions, collaborators and a first comment.',
      h1: 'Schedule Instagram posts, reels and stories',
      intro: 'Plan the grid next to your LinkedIn week. Connect a professional account through Facebook, or on its own, and schedule feed posts and stories from the same calendar.',
      formats: ['Feed posts and carousels', 'Reels (a single video post), including trial reels', 'Stories', 'Up to three collaborators', 'A first comment (text only)'],
      media: 'Every Instagram post needs at least one picture or video. A story takes one picture or video.',
      features: [
        { title: 'Business or standalone', body: 'Connect through a Facebook page, or connect an Instagram professional account directly.' },
        { title: 'Captions that fit', body: 'Tadween counts the 2,200-character caption as you type, hashtags included.' },
        { title: 'Same post, other networks', body: 'Reuse the media for Facebook, Threads or LinkedIn and adjust the caption for each.' },
      ],
      faq: [
        { title: 'Which Instagram accounts work?', content: 'Business and creator (professional) accounts. Personal accounts can’t be scheduled through Instagram’s API.' },
        { title: 'Can I post a story?', content: 'Yes. Set the post type to story and add one picture or video.' },
      ],
      sample: 'Behind the scenes at Studio Nile: hiring week.',
    },
    facebook: {
      title: 'Facebook page post scheduler | Tadween',
      description:
        'Schedule posts and stories to the Facebook pages you manage: long text, photos or video with a title, and follow-up comments, all from one calendar.',
      h1: 'Schedule posts to your Facebook pages',
      intro: 'Connect the pages you manage and post text, photos, video and stories on the same calendar as LinkedIn and Instagram.',
      formats: ['Text posts', 'Photos', 'Video, with an optional title', 'Stories (each picture or video becomes its own story)', 'Follow-up comments'],
      media: 'Posts can be text only, or carry photos or a video. A story needs at least one picture or video.',
      features: [
        { title: 'Pages you choose', body: 'After you sign in with Facebook, pick the pages to add. Each one is its own channel.' },
        { title: 'Room to write', body: 'Facebook allows very long posts, so long-form updates and announcements fit.' },
        { title: 'Pairs with Instagram', body: 'Schedule the same media to the page and its Instagram account in one go.' },
      ],
      faq: [
        { title: 'Can I post to a personal Facebook profile?', content: 'No. Facebook only allows scheduling to pages through its API, so Tadween posts to pages you manage.' },
        { title: 'Can I schedule Facebook stories?', content: 'Yes. Set the post type to story and add at least one picture or video.' },
      ],
      sample: 'We’re hiring in Cairo. Two product designers, Arabic and English. Apply by the end of the month.',
    },
    tiktok: {
      title: 'TikTok video and photo scheduler | Tadween',
      description:
        'Schedule TikTok videos and photo posts with captions up to 2,000 characters, privacy, duet, stitch and comment settings, or send them to your TikTok inbox as drafts.',
      h1: 'Schedule TikTok videos and photo posts',
      intro: 'Upload the video once, set who can watch and how people can respond, and let Tadween post it, or send it to your TikTok app to finish there.',
      formats: ['One video', 'Photo posts with several pictures', 'Who can watch, duets, stitches and comments', 'Branded or promotional content labels', 'Publish directly, or upload as a draft to your TikTok inbox'],
      media: 'A TikTok post needs one video, or one or more pictures. It can’t be text only.',
      limitNote: '2,000 characters for personal accounts and 2,200 for TikTok Business captions.',
      features: [
        { title: 'Post or send as a draft', body: 'Direct post publishes for you. Upload sends it to the TikTok app, where you add sounds and post.' },
        { title: 'All the settings TikTok asks for', body: 'Privacy, duet, stitch and comment choices are part of the post, so nothing gets stuck.' },
        { title: 'Business accounts too', body: 'Connect a TikTok Business account and schedule from the same calendar.' },
      ],
      faq: [
        { title: 'Why did my post go to the TikTok inbox?', content: 'The post was set to upload instead of direct post. Uploads arrive as drafts in the TikTok app, and you publish them there.' },
      ],
      sample: 'A day at Studio Nile, hiring week edition.',
    },
  },
  others: {
    threads: { note: 'Schedule posts on Threads' },
    youtube: { note: 'Schedule YouTube videos' },
    pinterest: { note: 'Schedule pins on Pinterest' },
    bluesky: { note: 'Schedule posts and threads on Bluesky' },
    mastodon: { note: 'Schedule posts on Mastodon' },
    reddit: { note: 'Schedule posts on Reddit' },
    telegram: { note: 'Schedule posts to Telegram' },
    discord: { note: 'Schedule announcements on Discord' },
    slack: { note: 'Schedule messages to Slack' },
    'google-business': { note: 'Schedule Google Business Profile posts' },
    medium: { note: 'Schedule articles on Medium' },
    devto: { note: 'Schedule articles on Dev.to' },
    hashnode: { note: 'Schedule articles on Hashnode' },
    wordpress: { note: 'Schedule posts on your WordPress site' },
  },
};
