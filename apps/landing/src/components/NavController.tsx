'use client';

import { useEffect, useRef } from 'react';

/** Behaviour for the server-rendered bar in LandingNav: the mega menus open on click, or
    on hover with a real pointer (with a short delay so passing over doesn't flash them),
    and close on Escape, a click outside or the pointer leaving. The phone sheet opens from
    the menu button and locks the page scroll. The bar gets a hairline once the page
    scrolls. Renders nothing; it finds the bar as its parent <header data-nav>. */
export function NavController() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const nav = anchor.current?.closest<HTMLElement>('[data-nav]');
    if (!nav) return;
    const triggers = Array.from(nav.querySelectorAll<HTMLButtonElement>('[data-menu-trigger]'));
    const panels = Array.from(nav.querySelectorAll<HTMLElement>('[data-menu-panel]'));
    const sheet = nav.querySelector<HTMLElement>('[data-sheet]');
    const burger = nav.querySelector<HTMLButtonElement>('[data-sheet-trigger]');
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    let current: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const show = (menu: string | null) => {
      current = menu;
      triggers.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.menuTrigger === menu)));
      panels.forEach((p) => (p.hidden = p.dataset.menuPanel !== menu));
      nav.classList.toggle('is-open', menu !== null);
    };
    const later = (menu: string | null, ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => show(menu), ms);
    };
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

    triggers.forEach((b) => {
      const menu = b.dataset.menuTrigger!;
      on(b, 'click', () => {
        clearTimeout(timer);
        show(current === menu ? null : menu);
      });
    });
    nav.querySelectorAll<HTMLElement>('[data-menu-hover]').forEach((li) => {
      const menu = li.dataset.menuHover!;
      on(li, 'pointerenter', () => fine.matches && later(menu, current ? 0 : 120));
      on(li, 'pointerleave', () => fine.matches && later(null, 220));
    });
    panels.forEach((p) => {
      on(p, 'pointerenter', () => fine.matches && clearTimeout(timer));
      on(p, 'pointerleave', () => fine.matches && later(null, 220));
    });
    if (burger) on(burger, 'click', () => setSheet(burger.getAttribute('aria-expanded') !== 'true'));
    on(window, 'keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (current) {
        const open = triggers.find((b) => b.dataset.menuTrigger === current);
        show(null);
        open?.focus();
      }
      setSheet(false);
    });
    on(document, 'pointerdown', (e: PointerEvent) => {
      if (current && !nav.contains(e.target as Node)) show(null);
    });
    // Moving focus out of an open menu closes it.
    on(nav, 'focusout', (e: FocusEvent) => {
      if (current && e.relatedTarget && !nav.contains(e.relatedTarget as Node)) show(null);
    });
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    on(window, 'scroll', onScroll, { passive: true });
    // Leaving the phone layout closes the sheet.
    const wide = window.matchMedia('(min-width: 961px)');
    on(wide, 'change', () => wide.matches && setSheet(false));

    return () => {
      clearTimeout(timer);
      offs.forEach((f) => f());
      document.documentElement.style.overflow = '';
    };
  }, []);

  return <span ref={anchor} hidden />;
}
