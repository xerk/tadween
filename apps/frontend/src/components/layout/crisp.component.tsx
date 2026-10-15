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
import {
  hasOpenOverlay,
  useHasOpenOverlay,
} from '@gitroom/frontend/components/tadween/ui/overlays';

// Set while the chat was opened on request (the account menu), until it is
// closed: the chat then stays, even if a sheet below it closes, or on phones
let requested = false;
// on phones the launcher stays hidden; kept here for Crisp's own callbacks
let phoneLayout = false;

// Close the chat and hide the launcher
const hideChat = () => {
  window.$crisp.push(['do', 'chat:close']);
  window.$crisp.push(['do', 'chat:hide']);
};

// Opens the Crisp chat from anywhere (e.g. the account menu)
export const openSupportChat = () => {
  if (typeof window === 'undefined' || !window.$crisp) {
    return;
  }
  requested = true;
  window.$crisp.push(['do', 'chat:show']);
  window.$crisp.push(['do', 'chat:open']);
};

// Crisp live chat, on when CRISP_WEBSITE_ID is set. The launcher sits in the
// bottom corner across from the sidebar, so it steps aside (with the chat
// closed) while the composer, any dialog, drawer or sheet, or the media upload
// dock is open, and comes back when they close. On
// phones it stays hidden (it would cover the dock); the account menu opens
// the chat.
export const CrispComponent: FC = () => {
  const { crispWebsiteId } = useVariables();
  const { i18n } = useTranslation();
  const phone = usePhoneLayout();
  const overlay = useHasOpenOverlay();

  // Crisp reads these globals when its script loads, so set them first
  if (crispWebsiteId && typeof window !== 'undefined' && !window.$crisp) {
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = crispWebsiteId;
    window.CRISP_RUNTIME_CONFIG = { locale: i18n.language || 'en' };
  }

  // Crisp's own openings (a greeting, an operator's message) don't come up
  // over an open overlay; a chat closed on a phone hides its launcher again
  useEffect(() => {
    if (!crispWebsiteId || !window.$crisp) {
      return;
    }
    const keepAside = () => {
      if (!requested && hasOpenOverlay()) {
        hideChat();
      }
    };
    const onClosed = () => {
      requested = false;
      if (phoneLayout || hasOpenOverlay()) {
        window.$crisp.push(['do', 'chat:hide']);
      }
    };
    window.$crisp.push(['on', 'chat:opened', keepAside]);
    window.$crisp.push(['on', 'message:received', keepAside]);
    window.$crisp.push(['on', 'chat:closed', onClosed]);
    return () => {
      window.$crisp.push(['off', 'chat:opened']);
      window.$crisp.push(['off', 'message:received']);
      window.$crisp.push(['off', 'chat:closed']);
    };
  }, [crispWebsiteId]);

  useEffect(() => {
    phoneLayout = phone;
  }, [phone]);

  // The launcher goes in the bottom corner away from the sidebar: right in
  // English, left in Arabic (the sidebar and its account row are on the right)
  const rtl = i18n.dir(i18n.language) === 'rtl';
  useEffect(() => {
    if (!crispWebsiteId || !window.$crisp) {
      return;
    }
    window.$crisp.push(['config', 'position:reverse', [rtl]]);
  }, [crispWebsiteId, rtl]);

  // an overlay opening closes the chat, even one opened on request
  useEffect(() => {
    if (!crispWebsiteId || !window.$crisp || !overlay) {
      return;
    }
    requested = false;
    hideChat();
  }, [crispWebsiteId, overlay]);

  // with no overlay open: the launcher on desktop; on phones only a chat
  // opened on request (from the account menu's sheet, which just closed)
  useEffect(() => {
    if (!crispWebsiteId || !window.$crisp || overlay || requested) {
      return;
    }
    window.$crisp.push(['do', phone ? 'chat:hide' : 'chat:show']);
  }, [crispWebsiteId, overlay, phone]);

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
