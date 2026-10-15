import type { ChannelsDict } from './types';

// English copy for the channel pages. Facts (limits, editors, comment support) are in
// lib/channels.ts; formats and media rules here restate the app's provider settings and
// @Rules in plain words. Nothing here promises more than the provider code does.
export const channelsEn: ChannelsDict = {
  meta: {
    title: 'Channels — schedule Facebook, Instagram, LinkedIn, Threads and YouTube | Tadween',
    description:
      'The networks Tadween is built around, with the real limits: Facebook, Instagram, LinkedIn profiles and pages, Threads and YouTube. Characters per post, media rules and post types, plus 25+ more channels in the same calendar.',
  },
  index: {
    title: 'One calendar for the networks that matter',
    sub: 'Tadween is built around five networks. Each has a page with what you can schedule there and the limits Tadween checks before it publishes.',
    focus: {
      title: 'Focus networks',
      sub: 'Facebook, Instagram, LinkedIn profiles and company pages, Threads and YouTube.',
    },
    more: {
      title: 'Also supported',
      sub: 'Tadween publishes to these too, from the same calendar.',
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
      intro: 'LinkedIn is one of the five networks Tadween is built around. Write in English or Arabic, see the post the way the feed will show it, and publish at the hour you choose.',
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
    instagram: {
      title: 'Instagram post, reel and story scheduler | Tadween',
      description:
        'Schedule Instagram posts, carousels, reels and stories for business and creator accounts: 2,200-character captions, collaborators and a first comment.',
      h1: 'Schedule Instagram posts, reels and stories',
      intro: 'Plan the grid next to the rest of your week. Connect a professional account through Facebook, or on its own, and schedule feed posts and stories from the same calendar.',
      formats: ['Feed posts and carousels', 'Reels (a single video post), including trial reels', 'Stories', 'Up to three collaborators', 'A first comment (text only)'],
      media: 'Every Instagram post needs at least one picture or video. A story takes one picture or video.',
      features: [
        { title: 'Business or standalone', body: 'Connect through a Facebook page, or connect an Instagram professional account directly.' },
        { title: 'Captions that fit', body: 'Tadween counts the 2,200-character caption as you type, hashtags included.' },
        { title: 'Same post, other networks', body: 'Reuse the media for Facebook, LinkedIn or Threads and adjust the caption for each.' },
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
      intro: 'Connect the pages you manage and post text, photos, video and stories on the same calendar as your other networks.',
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
        'Schedule Threads posts and multi-post threads: 500 characters per post, text, pictures, video or carousels, with each reply published under the part before it.',
      h1: 'Schedule posts and threads on Threads',
      intro: 'Write a single post or a whole thread, keep each part under 500 characters, and schedule it next to the rest of your week.',
      formats: ['Text posts', 'One picture or one video', 'Carousels of two or more pictures or videos', 'Replies under the post, published in order as a thread', 'Auto plug: a reply added once a post passes the likes you set'],
      media: 'A Threads post can be text only, carry one picture or one MP4 video, or several of them as a carousel.',
      features: [
        { title: 'A thread from one draft', body: 'Add the next part under the first and Tadween publishes each one as a reply to the one before.' },
        { title: '500 characters, counted', body: 'Tadween counts every part as you type, so nothing gets cut off when it goes out.' },
        { title: 'Same media, other networks', body: 'Reuse the pictures for Facebook, Instagram or LinkedIn and adjust the text for each.' },
      ],
      faq: [
        { title: 'Can I schedule a thread of several posts?', content: 'Yes. Write the first post, then add the next parts under it. Tadween posts the first one and publishes each part as a reply in order.' },
        { title: 'What is the auto plug?', content: 'A small automation on the Threads channel. When a post passes the number of likes you choose, Tadween adds the reply you wrote under it, so your followers see it again.' },
      ],
    },
    youtube: {
      title: 'YouTube video scheduler | Tadween',
      description:
        'Schedule YouTube videos with a title, a description up to 5,000 characters, tags, a custom thumbnail and public, private or unlisted visibility.',
      h1: 'Schedule YouTube videos',
      intro: 'Upload the video once, give it a title, tags and a thumbnail, choose who can see it, and Tadween publishes it at the hour you pick, on the same calendar as your other posts.',
      formats: ['One video per post', 'A title, up to 100 characters', 'Public, private or unlisted', 'Tags, up to 500 characters in total', 'A custom thumbnail (JPEG or PNG)', 'Made for kids: yes or no'],
      media: 'Every YouTube post is exactly one MP4 video. Text-only posts and pictures can’t be posted to YouTube.',
      limitNote: 'The 5,000 characters are the video description. The title is set separately and can be up to 100 characters.',
      features: [
        { title: 'Everything YouTube asks for', body: 'Title, visibility, tags, thumbnail and the made-for-kids choice are part of the post, so the upload doesn’t stop halfway.' },
        { title: 'Uploads that don’t double', body: 'If an upload is interrupted, Tadween asks YouTube how far it got before trying again, so the same video isn’t uploaded twice.' },
        { title: 'One idea, every channel', body: 'Schedule the video on YouTube and an Instagram or LinkedIn post about it in the same go.' },
      ],
      faq: [
        { title: 'Why wasn’t my thumbnail set?', content: 'YouTube only allows custom thumbnails on verified accounts, in JPEG or PNG. If yours isn’t verified, the video is still uploaded and Tadween tells you the thumbnail couldn’t be set.' },
        { title: 'Can I upload a video as private or unlisted?', content: 'Yes. Choose public, private or unlisted in the YouTube settings of the post before you schedule it.' },
      ],
    },
  },
  // Networks without a page use their brand name in English, so there is nothing to add here.
  others: {},
};
