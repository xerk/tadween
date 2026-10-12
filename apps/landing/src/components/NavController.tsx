'use client';

import { useEffect, useRef } from 'react';

/** Behaviour for the server-rendered bar in LandingNav: the phone sheet opens from the menu
    button, locks the page scroll and closes on Escape or when the layout widens. The bar
    gets a hairline once the page scrolls. Renders nothing; it finds the bar as its parent
    <header data-nav>. */
export function NavController() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const nav = anchor.current?.closest<HTMLElement>('[data-nav]');
    if (!nav) return;
    const sheet = nav.querySelector<HTMLElement>('[data-sheet]');
    const burger = nav.querySelector<HTMLButtonElement>('[data-sheet-trigger]');

    const setSheet = (on: boolean) => {
      if (!sheet || !burger) return;
      sheet.hidden = !on;
      burger.setAttribute('aria-expanded', String(on));
      burger.setAttribute('aria-label', (on ? burger.dataset.labelClose : burger.dataset.labelOpen) ?? '');
      document.documentElement.style.overflow = on ? 'hidden' : '';
      nav.classList.toggle('is-open', on);
    };

    const offs: (() => void)[] = [];
    const on = (el: EventTarget, type: string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      offs.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };

    if (burger) on(burger, 'click', () => setSheet(burger.getAttribute('aria-expanded') !== 'true'));
    on(window, 'keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !sheet || sheet.hidden) return;
      setSheet(false);
      burger?.focus();
    });
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    on(window, 'scroll', onScroll, { passive: true });
    // Leaving the phone layout closes the sheet.
    const wide = window.matchMedia('(min-width: 961px)');
    on(wide, 'change', () => wide.matches && setSheet(false));

    return () => {
      offs.forEach((f) => f());
      document.documentElement.style.overflow = '';
    };
  }, []);

  return <span ref={anchor} hidden />;
}
