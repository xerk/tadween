'use client';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
    CRISP_RUNTIME_CONFIG: { locale: string };
  }
}

import { FC, useEffect } from 'react';
import Script from 'next/script';
import { useTranslation } from 'react-i18next';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { usePhoneLayout } from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';

// Opens the Crisp chat from anywhere (e.g. the account menu)
export const openSupportChat = () => {
  if (typeof window === 'undefined' || !window.$crisp) {
    return;
  }
  window.$crisp.push(['do', 'chat:show']);
  window.$crisp.push(['do', 'chat:open']);
};

// Crisp live chat, on when CRISP_WEBSITE_ID is set. On phones the bubble
// stays hidden (it would cover the dock); the account menu opens the chat.
export const CrispComponent: FC = () => {
  const { crispWebsiteId } = useVariables();
  const { i18n } = useTranslation();
  const phone = usePhoneLayout();

  // Crisp reads these globals when its script loads, so set them first
  if (crispWebsiteId && typeof window !== 'undefined' && !window.$crisp) {
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = crispWebsiteId;
    window.CRISP_RUNTIME_CONFIG = { locale: i18n.language || 'en' };
  }

  useEffect(() => {
    if (!crispWebsiteId || !window.$crisp) {
      return;
    }
    window.$crisp.push(['do', phone ? 'chat:hide' : 'chat:show']);
    window.$crisp.push([
      'on',
      'chat:closed',
      () => phone && window.$crisp.push(['do', 'chat:hide']),
    ]);
  }, [crispWebsiteId, phone]);

  if (!crispWebsiteId) {
    return null;
  }

  return (
    <Script
      id="crisp-chat"
      src="https://client.crisp.chat/l.js"
      strategy="afterInteractive"
    />
  );
};
