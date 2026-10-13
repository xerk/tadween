'use client';

import { withContinueProvider } from '../with-continue-provider';

interface FacebookItem {
  id: string;
  username: string;
  name: string;
  picture: {
    data: {
      url: string;
    };
  };
}

export const FacebookContinue = withContinueProvider<FacebookItem, string>({
  endpoint: 'pages',
  swrKey: 'load-facebook-pages',
  title: { key: 'tdw_continue_facebook_title', text: 'Choose a Facebook Page' },
  empty: {
    title: {
      key: 'tdw_continue_facebook_empty_title',
      text: 'No Facebook Pages to connect',
    },
    body: {
      key: 'tdw_continue_facebook_empty_body',
      text: "We couldn't find a Page you manage, or Tadween wasn't given access to it. Reconnect and select all your Pages and businesses when Facebook asks.",
    },
    helpUrl: 'https://www.facebook.com/help/405094243235242',
    helpLabel: {
      key: 'tdw_continue_facebook_help',
      text: 'Check Page access on Facebook',
    },
  },
  getItemName: (item) => item.name,
  getItemPicture: (item) => item.picture?.data?.url,
  getItemDescription: (item) =>
    item.username ? `@${item.username}` : undefined,
  getItemId: (item) => item.id,
  getSelectionValue: (item) => item.id,
  transformSaveData: (selection) => ({ page: selection }),
  isSelected: (item, selection) => selection === item.id,
});
