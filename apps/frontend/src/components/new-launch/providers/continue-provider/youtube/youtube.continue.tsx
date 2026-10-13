'use client';

import { withContinueProvider } from '../with-continue-provider';

interface YoutubeItem {
  id: string;
  name: string;
  username?: string;
  subscriberCount?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface YoutubeSelection {
  id: string;
}

export const YoutubeContinue = withContinueProvider<
  YoutubeItem,
  YoutubeSelection
>({
  endpoint: 'pages',
  swrKey: 'load-youtube-channels',
  title: {
    key: 'tdw_continue_youtube_title',
    text: 'Choose a YouTube channel',
  },
  empty: {
    title: {
      key: 'tdw_continue_youtube_empty_title',
      text: 'No YouTube channels found',
    },
    body: {
      key: 'tdw_continue_youtube_empty_body',
      text: "This Google account doesn't have a YouTube channel yet. Create one, or reconnect with the account that owns your channel.",
    },
    helpUrl: 'https://support.google.com/youtube/answer/1646861',
    helpLabel: {
      key: 'tdw_continue_youtube_help',
      text: 'How to create a YouTube channel',
    },
  },
  getItemName: (item) => item.name,
  getItemPicture: (item) => item.picture?.data?.url,
  getItemDescription: (item, t) =>
    [
      item.username,
      item.subscriberCount
        ? t('tdw_continue_subscribers', '{{total}} subscribers', {
            total: parseInt(item.subscriberCount).toLocaleString(),
          })
        : '',
    ]
      .filter(Boolean)
      .join(' · ') || undefined,
  getItemId: (item) => item.id,
  getSelectionValue: (item) => ({ id: item.id }),
  transformSaveData: (selection) => selection,
  isSelected: (item, selection) => selection?.id === item.id,
});
