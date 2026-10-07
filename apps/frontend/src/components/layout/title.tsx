'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useMenuItem } from '@gitroom/frontend/components/layout/top.menu';
export const Title = () => {
  const path = usePathname();
  const { all: menuItems } = useMenuItem();
  const currentTitle = useMemo(() => {
    return menuItems.find((item) => path.indexOf(item.path) > -1)?.name;
  }, [path]);

  // Tadween: Today and the calendar lead with their own heading (greeting, month),
  // so the top bar doesn't repeat it.
  if (/^\/(today|launches)(\/|$)/.test(path)) {
    return null;
  }

  return <h1 className="truncate">{currentTitle}</h1>;
};
