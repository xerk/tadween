'use client';

import { withContinueProvider } from '../with-continue-provider';

interface GmbItem {
  id: string;
  name: string;
  accountName: string;
  locationName: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface GmbSelection {
  id: string;
  accountName: string;
  locationName: string;
}

export const GmbContinue = withContinueProvider<GmbItem, GmbSelection>({
  endpoint: 'pages',
  swrKey: 'load-gmb-locations',
  title: {
    key: 'tdw_continue_gmb_title',
    text: 'Choose a Google Business location',
  },
  avatarShape: 'square',
  empty: {
    title: {
      key: 'tdw_continue_gmb_empty_title',
      text: 'No verified business locations yet',
    },
    body: {
      key: 'tdw_continue_gmb_empty_body',
      text: 'Verify your business in Google Business Profile, then reconnect with the Google account that manages it.',
    },
    helpUrl: 'https://business.google.com',
    helpLabel: {
      key: 'tdw_continue_gmb_help',
      text: 'Open Google Business Profile',
    },
  },
  getItemName: (item) => item.name,
  getItemPicture: (item) => item.picture?.data?.url,
  getItemId: (item) => item.id,
  getSelectionValue: (item) => ({
    id: item.id,
    accountName: item.accountName,
    locationName: item.locationName,
  }),
  transformSaveData: (selection) => selection,
  isSelected: (item, selection) => selection?.id === item.id,
});
