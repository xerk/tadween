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
    sub: 'LinkedIn comes first, and the rest are a click away. Each page lists what you can schedule there and the limits Tadween checks before it publishes.',
    groups: {
      professional: 'LinkedIn',
      social: 'Social',
      video: 'Video',
      community: 'Communities and chat',
      blog: 'Blogs and articles',
    },
    more: {
      title: 'Also supported',
      sub: 'Tadween publishes to these too. Their pages are coming.',
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
    previewGeneric: 'The composer with a {name} post. Networks without a preview of their own show the general one.',
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
    threads: {
      title: 'Threads post scheduler | Tadween',
      description:
        'Schedule Threads posts and multi-post threads, 500 characters each, next to your LinkedIn and Instagram content, with an auto follow-up when a post takes off.',
      h1: 'Schedule posts on Threads',
      intro: 'Short, frequent and conversational. Draft a post or a chain of them and keep Threads on the same calendar as everything else.',
      formats: ['Text posts', 'Multi-post threads', 'Pictures or video', 'An automatic follow-up post once a post passes the likes you set'],
      media: 'Pictures and video can be attached. Text-only posts work too.',
      features: [
        { title: 'Threads in order', body: 'Add the next post below and Tadween publishes the chain in sequence.' },
        { title: 'Counted correctly', body: 'Each post is checked against the 500-character limit before it is scheduled.' },
        { title: 'From LinkedIn to Threads', body: 'Turn a LinkedIn post into a short thread without leaving the editor.' },
      ],
      faq: [
        { title: 'Do I need an Instagram account?', content: 'Threads accounts are tied to Instagram. Connect the Threads profile and Tadween posts to it directly.' },
      ],
      sample: 'Three things that made our hiring work. 1/3',
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
    youtube: {
      title: 'YouTube video upload scheduler | Tadween',
      description:
        'Schedule YouTube uploads with a title, a description up to 5,000 characters, tags, a custom thumbnail, visibility and the made-for-kids setting.',
      h1: 'Schedule YouTube videos',
      intro: 'Upload the video, fill in what YouTube needs, and set the time. Tadween publishes it and keeps it on the calendar with the rest of your week.',
      formats: ['One video per post', 'Title and description', 'Tags and a custom thumbnail', 'Public, unlisted or private', 'Made for kids, yes or no'],
      media: 'Every YouTube post needs exactly one video.',
      limitNote: 'The description can be up to 5,000 characters, and the title up to 100.',
      features: [
        { title: 'Everything in one form', body: 'Title, tags, thumbnail and audience settings sit beside the description.' },
        { title: 'Shorts and long videos', body: 'Upload either. Tadween sends it to YouTube with the settings you chose.' },
        { title: 'Announce it everywhere', body: 'Schedule the LinkedIn and X posts that point to the video for the same hour.' },
      ],
      faq: [
        { title: 'Can I set a custom thumbnail?', content: 'Yes. Add a thumbnail image in the YouTube settings of the post.' },
      ],
      sample: 'How we hired 10 engineers in 90 days',
    },
    pinterest: {
      title: 'Pinterest pin scheduler | Tadween',
      description:
        'Schedule Pinterest pins to any board with a title, a destination link and up to five pictures, or a video with its cover. 500-character descriptions.',
      h1: 'Schedule pins on Pinterest',
      intro: 'Pick the board, add the link and schedule. Pins sit on the same calendar as your social posts.',
      formats: ['Image pins and multi-image pins', 'Video pins with a cover image', 'Board, title and destination link', 'Dominant colour'],
      media: 'A pin needs at least one picture. Up to five pictures, or one video plus a cover picture.',
      features: [
        { title: 'Boards from your account', body: 'Tadween lists your boards, so you pick one instead of typing it.' },
        { title: 'Traffic back to you', body: 'Every pin can carry a destination link to your site or article.' },
        { title: 'Reuse what you made', body: 'Pin the images you already used on Instagram or your blog.' },
      ],
      faq: [
        { title: 'Can I pin a video?', content: 'Yes. Attach the video and a cover picture. Pinterest needs both.' },
      ],
      sample: 'Studio Nile office tour: light, plants and long tables.',
    },
    bluesky: {
      title: 'Bluesky post scheduler | Tadween',
      description:
        'Schedule Bluesky posts and threads, 300 characters each, with up to four pictures or one video, plus auto-repost and follow-ups when a post gets traction.',
      h1: 'Schedule posts and threads on Bluesky',
      intro: 'Short posts, threads and pictures, on the same calendar as X and LinkedIn.',
      formats: ['Posts and threads', 'Up to four pictures or one video', 'Auto-repost or an auto follow-up once a post passes the likes you set'],
      media: 'Up to four pictures or one video per post. Text-only posts work too.',
      features: [
        { title: 'Threads in order', body: 'Write the chain once and Tadween posts it in sequence.' },
        { title: 'Tight limit, checked', body: 'Each post is counted against Bluesky’s 300 characters before it can be scheduled.' },
        { title: 'Connect with an app password', body: 'Sign in with your handle and a password. Use an app password so your main one stays with you.' },
      ],
      faq: [
        { title: 'How do I connect Bluesky?', content: 'Enter your server (bsky.social for most people), your handle and a password. We recommend an app password created in Bluesky’s settings.' },
      ],
      sample: 'Hiring in Cairo: what worked, in three posts.',
    },
    mastodon: {
      title: 'Mastodon post scheduler | Tadween',
      description: 'Schedule Mastodon posts and threads of up to 500 characters, with pictures, on the same calendar as your other channels.',
      h1: 'Schedule posts on Mastodon',
      intro: 'Post to the fediverse on a schedule, with threads and pictures, without opening another app.',
      formats: ['Posts and threads', 'Pictures and video', 'Follow-up replies'],
      media: 'Pictures and video can be attached. Text-only posts work too.',
      features: [
        { title: 'Threads in order', body: 'Chain posts as replies and Tadween publishes them in sequence.' },
        { title: 'Checked before it goes', body: 'Posts are counted against 500 characters while you write.' },
        { title: 'Cross-post with care', body: 'Adjust the wording for Mastodon while the rest of the post stays the same.' },
      ],
      faq: [
        { title: 'Which server can I use?', content: 'Tadween connects to the Mastodon server configured for your workspace. Ask your admin if you use a different instance.' },
      ],
      sample: 'Hiring notes from Cairo, a short thread.',
    },
    reddit: {
      title: 'Reddit post scheduler | Tadween',
      description:
        'Schedule Reddit posts to any subreddit: text, link or media posts with a title and flair, up to 10,000 characters, plus follow-up comments.',
      h1: 'Schedule posts on Reddit',
      intro: 'Pick the subreddit, the post type and the flair, and schedule it with the rest of your launch.',
      formats: ['Text posts', 'Link posts', 'Image and video posts', 'Title and flair, when the subreddit needs one', 'Follow-up comments'],
      media: 'Media posts take pictures or video. Link posts take a URL.',
      features: [
        { title: 'Subreddit search', body: 'Find the subreddit from the editor and see whether it needs a flair.' },
        { title: 'Long posts fit', body: 'Up to 10,000 characters, enough for a write-up or an AMA intro.' },
        { title: 'One launch, every channel', body: 'Schedule the Reddit post with the LinkedIn and X posts for the same day.' },
      ],
      faq: [
        { title: 'Can I post to several subreddits?', content: 'Yes. Add the post once per subreddit and schedule them a little apart, as Reddit asks.' },
      ],
      sample: 'How we hired 10 engineers in Cairo in 90 days (what worked and what didn’t)',
    },
    telegram: {
      title: 'Telegram channel post scheduler | Tadween',
      description: 'Schedule posts to Telegram channels and groups with formatting, pictures and video, up to 4,096 characters per message.',
      h1: 'Schedule posts to Telegram',
      intro: 'Add the Tadween bot to your channel or group and schedule formatted messages with media, on the same calendar as your social posts.',
      formats: ['Formatted messages (bold, italic, links)', 'Pictures and video', 'Follow-up messages'],
      media: 'Pictures and video can be attached. Text-only messages work too.',
      features: [
        { title: 'Channels and groups', body: 'Post wherever the bot has been added.' },
        { title: 'Formatting kept', body: 'Bold, italic and links are sent as Telegram formatting.' },
        { title: 'Arabic first', body: 'Right-to-left text reads right, which matters for channels in Egypt and the Gulf.' },
      ],
      faq: [
        { title: 'How do I connect Telegram?', content: 'Add the bot shown in Tadween to your channel or group as an admin, then follow the steps in the connect dialog.' },
      ],
      sample: 'Studio Nile is hiring. Two product designers in Cairo. Apply this month.',
    },
    discord: {
      title: 'Discord announcement scheduler | Tadween',
      description: 'Schedule Discord messages and announcements to any channel in your server, with Markdown, pictures and follow-ups, up to 1,980 characters.',
      h1: 'Schedule announcements on Discord',
      intro: 'Pick the channel and schedule announcements for your community, next to your public posts.',
      formats: ['Messages in any channel', 'Markdown formatting', 'Pictures and video', 'Follow-up messages'],
      media: 'Pictures and video can be attached. Text-only messages work too.',
      features: [
        { title: 'Pick the channel', body: 'Tadween lists your server’s channels so you choose one per post.' },
        { title: 'Markdown editor', body: 'Write with headings, bold and lists the way Discord shows them.' },
        { title: 'Launches in sync', body: 'Announce to the community at the same minute as the public post.' },
      ],
      faq: [
        { title: 'Can I post to more than one channel?', content: 'Each post goes to one channel. Duplicate it for another channel in a click.' },
      ],
      sample: '**We’re hiring.** Two product designers in Cairo. Details in #jobs.',
    },
    slack: {
      title: 'Slack message scheduler | Tadween',
      description: 'Schedule messages to Slack channels with pictures and follow-ups, on the same calendar as your social posts. Useful for internal launches.',
      h1: 'Schedule messages to Slack',
      intro: 'Tell the team, then tell the world. Schedule the Slack message and the public posts together.',
      formats: ['Messages in any channel the app can post to', 'Pictures', 'Follow-up messages in the thread'],
      media: 'Pictures can be attached. Text-only messages work too.',
      limitNote: 'Slack itself may shorten very long messages, so keep announcements to a few paragraphs.',
      features: [
        { title: 'Internal first', body: 'Give the team a heads-up minutes before the public post goes out.' },
        { title: 'Channel picker', body: 'Choose the channel from a list instead of copying IDs.' },
        { title: 'Plenty of room', body: 'Long updates, release notes and digests all fit.' },
      ],
      faq: [
        { title: 'Can I post to private channels?', content: 'Yes, once the Tadween app has been added to that channel in Slack.' },
      ],
      sample: 'Heads-up: the hiring post goes live on LinkedIn at 08:45. Please share it.',
    },
    'google-business': {
      title: 'Google Business Profile post scheduler | Tadween',
      description: 'Schedule Google Business Profile updates, events and offers with a picture and a call-to-action button, up to 1,500 characters.',
      h1: 'Schedule Google Business Profile posts',
      intro: 'Keep your profile on Google Search and Maps fresh with updates, events and offers, planned with the rest of your content.',
      formats: ['Updates', 'Events, with dates and times', 'Offers, with a coupon code, link and terms', 'Call-to-action buttons such as Book, Order, Learn more or Call'],
      media: 'A post can have text and, optionally, one picture.',
      features: [
        { title: 'Events and offers', body: 'Fill in the dates, coupon and terms, and Google shows them on your profile.' },
        { title: 'One button, one action', body: 'Add a call to action that points people where you want them.' },
        { title: 'Every location', body: 'Pick the location to post to when you connect.' },
      ],
      faq: [
        { title: 'Can I add a video?', content: 'No. Google Business Profile posts take text and, optionally, one picture.' },
      ],
      sample: 'Open day at Studio Nile this Thursday, 4–7 pm. Come meet the team.',
    },
    medium: {
      title: 'Medium article scheduler | Tadween',
      description: 'Schedule Medium articles in Markdown with a title, subtitle, tags, a canonical URL and an optional publication.',
      h1: 'Schedule articles on Medium',
      intro: 'Write the article in Markdown, set the canonical link, and publish it on Medium at the time you choose.',
      formats: ['Articles in Markdown', 'Title and subtitle', 'Tags', 'Canonical URL', 'Publishing to one of your publications'],
      media: 'Pictures go inside the article.',
      features: [
        { title: 'Canonical links', body: 'Point Medium to the original on your site, so search engines credit you.' },
        { title: 'Publications', body: 'Publish to your profile or to a publication you write for.' },
        { title: 'Announce it the same hour', body: 'Schedule the LinkedIn post that shares the article right after it goes live.' },
      ],
      faq: [
        { title: 'Can I republish a blog post?', content: 'Yes. Paste it in and set the canonical URL to the original.' },
      ],
      sample: 'How we hired 10 engineers in Cairo in 90 days',
    },
    devto: {
      title: 'Dev.to article scheduler | Tadween',
      description: 'Schedule Dev.to articles in Markdown with a title, cover image, tags, a canonical URL and an optional organization.',
      h1: 'Schedule articles on Dev.to',
      intro: 'Write for developers in Markdown and schedule the article with its cover and tags.',
      formats: ['Articles in Markdown', 'Title and cover image', 'Tags', 'Canonical URL', 'Publishing under an organization'],
      media: 'Pictures go inside the article, and the cover is set separately.',
      features: [
        { title: 'Tags from Dev.to', body: 'Pick tags from Dev.to’s own list.' },
        { title: 'Organizations', body: 'Publish under your company’s organization page.' },
        { title: 'Cross-post safely', body: 'Set the canonical URL when the article first lives on your blog.' },
      ],
      faq: [
        { title: 'Is the cover image required?', content: 'No. It’s optional, and Dev.to shows it at the top of the article when you add one.' },
      ],
      sample: 'Hiring engineers in Cairo: our 90-day playbook',
    },
    hashnode: {
      title: 'Hashnode article scheduler | Tadween',
      description: 'Schedule Hashnode articles in Markdown with a title, subtitle, cover, tags, canonical URL and publication.',
      h1: 'Schedule articles on Hashnode',
      intro: 'Plan your engineering blog on Hashnode next to the posts that promote it.',
      formats: ['Articles in Markdown', 'Title, subtitle and cover', 'Tags', 'Canonical URL', 'Publication'],
      media: 'Pictures go inside the article, and the cover is set separately.',
      features: [
        { title: 'Your publication', body: 'Pick which Hashnode publication the article goes to.' },
        { title: 'Tags that exist', body: 'Choose from Hashnode’s tags so the article is found.' },
        { title: 'Promote it the same day', body: 'Schedule LinkedIn and X posts that link to it.' },
      ],
      faq: [
        { title: 'How long can an article be?', content: 'Tadween accepts up to 10,000 characters for a Hashnode article.' },
      ],
      sample: 'Hiring engineers in Cairo: our 90-day playbook',
    },
    wordpress: {
      title: 'WordPress post scheduler | Tadween',
      description: 'Schedule WordPress posts on your own site with a featured image, categories, tags and status (published, draft, pending or private).',
      h1: 'Schedule posts on your WordPress site',
      intro: 'Connect your own WordPress site with an application password and schedule articles alongside your social posts.',
      formats: ['Posts with rich text', 'Featured image', 'Categories and tags from your site', 'Status: published, draft, pending review or private'],
      media: 'Pictures go inside the article from your media library. The featured image is set separately.',
      features: [
        { title: 'Your site, your server', body: 'Tadween talks to your WordPress REST API with an application password.' },
        { title: 'Categories and tags', body: 'Pick them from your site’s own lists.' },
        { title: 'Blog plus social', body: 'Publish the article, then the LinkedIn post that shares it.' },
      ],
      faq: [
        { title: 'Does it work with self-hosted WordPress?', content: 'Yes. Any WordPress site with the REST API on and an application password for your user.' },
        { title: 'Can I send it as a draft?', content: 'Yes. Set the status to draft or pending and finish it in WordPress.' },
      ],
      sample: 'How we hired 10 engineers in Cairo in 90 days',
    },
  },
};
