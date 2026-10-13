'use client';

import { withContinueProvider } from '../with-continue-provider';

interface InstagramItem {
  id: string;
  pageId: string;
  username: string;
  name: string;
  picture: {
    data: {
      url: string;
    };
  };
}

interface InstagramSelection {
  id: string;
  pageId: string;
}

export const InstagramContinue = withContinueProvider<
  InstagramItem,
  InstagramSelection
>({
  endpoint: 'pages',
  swrKey: 'load-instagram-pages',
  title: {
    key: 'tdw_continue_instagram_title',
    text: 'Choose an Instagram account',
  },
  empty: {
    title: {
      key: 'tdw_continue_instagram_empty_title',
      text: 'No Instagram business accounts found',
    },
    body: {
      key: 'tdw_continue_instagram_empty_body',
      text: 'Instagram professional accounts connect through a Facebook Page. Link your account to a Page, then reconnect and select that Page when Facebook asks.',
    },
    helpUrl: 'https://help.instagram.com/570895513091465',
    helpLabel: {
      key: 'tdw_continue_instagram_help',
      text: 'Link Instagram to a Facebook Page',
    },
  },
  getItemName: (item) => item.name,
  getItemPicture: (item) => item.picture?.data?.url,
  getItemDescription: (item) =>
    item.username ? `@${item.username}` : undefined,
  getItemId: (item) => item.id,
  getSelectionValue: (item) => ({ id: item.id, pageId: item.pageId }),
  transformSaveData: (selection) => selection,
  isSelected: (item, selection) => selection?.id === item.id,
});
