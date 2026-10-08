'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useMenuItem } from '@gitroom/frontend/components/layout/top.menu';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const Title = () => {
  const path = usePathname();
  const t = useT();
  const { all: menuItems } = useMenuItem();
  const currentTitle = useMemo(() => {
    const fromMenu = menuItems.find((item) => path.indexOf(item.path) > -1)?.name;
    if (fromMenu) {
      return fromMenu;
    }
    // Tadween: Billing lives in the account menu, not the sidebar
    return /^\/billing(\/|$)/.test(path) ? t('billing', 'Billing') : undefined;
  }, [path, t]);

  // Tadween: Today and the calendar lead with their own heading (greeting, month),
  // so the top bar doesn't repeat it.
  if (/^\/(today|launches)(\/|$)/.test(path)) {
    return null;
  }

  return <h1 className="truncate">{currentTitle}</h1>;
};
