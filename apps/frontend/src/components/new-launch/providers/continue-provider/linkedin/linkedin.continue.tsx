'use client';

import { withContinueProvider } from '../with-continue-provider';

interface LinkedinItem {
  id: string;
  pageId: string;
  username: string;
  name: string;
  picture: string;
}

interface LinkedinSelection {
  id: string;
  pageId: string;
}

export const LinkedinContinue = withContinueProvider<
  LinkedinItem,
  LinkedinSelection
>({
  endpoint: 'companies',
  swrKey: 'load-linkedin-pages',
  title: { key: 'tdw_continue_linkedin_title', text: 'Choose a LinkedIn Page' },
  avatarShape: 'square',
  empty: {
    title: {
      key: 'tdw_continue_linkedin_empty_title',
      text: 'No LinkedIn Pages to connect',
    },
    body: {
      key: 'tdw_continue_linkedin_empty_body',
      text: 'You need to be a super admin or content admin of a LinkedIn Page. Create a Page or ask an admin to add you, then reconnect.',
    },
    helpUrl: 'https://www.linkedin.com/help/linkedin/answer/a541981',
    helpLabel: {
      key: 'tdw_continue_linkedin_help',
      text: 'About LinkedIn Page admin roles',
    },
  },
  getItemName: (item) => item.name,
  getItemPicture: (item) => item.picture,
  getItemDescription: (item) =>
    item.username ? `linkedin.com/company/${item.username}` : undefined,
  getItemId: (item) => item.id,
  getSelectionValue: (item) => ({ id: item.id, pageId: item.pageId }),
  transformSaveData: (selection) => ({ page: selection.id }),
  isSelected: (item, selection) => selection?.id === item.id,
});
