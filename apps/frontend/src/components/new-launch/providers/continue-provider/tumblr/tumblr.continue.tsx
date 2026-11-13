'use client';

import { withContinueProvider } from '../with-continue-provider';

interface TumblrBlogItem {
  id: string;
  name: string;
  username?: string;
  followers?: number;
  primary?: boolean;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface TumblrBlogSelection {
  id: string;
}

export const TumblrContinue = withContinueProvider<
  TumblrBlogItem,
  TumblrBlogSelection
>({
  endpoint: 'pages',
  swrKey: 'load-tumblr-blogs',
  title: { key: 'tdw_continue_tumblr_title', text: 'Choose a Tumblr blog' },
  empty: {
    title: {
      key: 'tdw_continue_tumblr_empty_title',
      text: 'No Tumblr blogs found',
    },
    body: {
      key: 'tdw_continue_tumblr_empty_body',
      text: "This Tumblr account doesn't have a blog you can post to. Create one, then reconnect.",
    },
    helpUrl: 'https://www.tumblr.com/new/blog',
    helpLabel: {
      key: 'tdw_continue_tumblr_help',
      text: 'Create a Tumblr blog',
    },
  },
  getItemName: (item) => item.name,
  getItemPicture: (item) => item.picture?.data?.url,
  getItemDescription: (item, t) =>
    [
      item.username,
      item.followers
        ? t('tdw_continue_followers', '{{total}} followers', {
            total: item.followers.toLocaleString(),
          })
        : '',
      item.primary ? t('tdw_continue_primary', 'Primary') : '',
    ]
      .filter(Boolean)
      .join(' · ') || undefined,
  getItemId: (item) => item.id,
  getSelectionValue: (item) => ({ id: item.id }),
  transformSaveData: (selection) => selection,
  isSelected: (item, selection) => selection?.id === item.id,
});
