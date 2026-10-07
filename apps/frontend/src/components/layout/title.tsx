'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useMenuItem } from '@gitroom/frontend/components/layout/top.menu';

// Tadween: Today and the calendar lead with their own heading (greeting, month),
// so the top bar doesn't repeat it and sits slimmer there.
export const isBareTopBar = (path: string) =>
  /^\/(today|launches)(\/|$)/.test(path);

export const Title = () => {
  const path = usePathname();
  const { all: menuItems } = useMenuItem();
  const current = useMemo(() => {
    return menuItems.find((item) => path.indexOf(item.path) > -1);
  }, [path]);

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
