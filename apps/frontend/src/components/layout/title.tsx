'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useMenuItem } from '@gitroom/frontend/components/layout/top.menu';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// Tadween: Today and the calendar lead with their own heading (greeting, month),
// so the top bar doesn't repeat it and sits slimmer there.
export const isBareTopBar = (path: string) =>
  /^\/(today|launches)(\/|$)/.test(path);

export const Title = () => {
  const path = usePathname();
  const t = useT();
  const { all: menuItems } = useMenuItem();
  const current = useMemo(() => {
    const fromMenu = menuItems.find((item) => path.indexOf(item.path) > -1);
    if (fromMenu) {
      return fromMenu;
    }
    // Tadween: Billing lives in the account menu, not the sidebar
    return /^\/billing(\/|$)/.test(path)
      ? { name: t('billing', 'Billing'), description: undefined }
      : undefined;
  }, [path, t]);

  if (isBareTopBar(path)) {
    return null;
  }

  return (
    <div className="tdw-page-title min-w-0">
      <h1 className="truncate">{current?.name}</h1>
      {current?.description ? (
        <p className="truncate mobile:hidden">{current.description}</p>
      ) : null}
    </div>
  );
};
