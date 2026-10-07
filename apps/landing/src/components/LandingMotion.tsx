'use client';

import { useEffect } from 'react';

/** Starts the landing motion once the page has hydrated. GSAP and three.js load as
    separate chunks through dynamic imports, so they never block first paint. The sections
    themselves are server-rendered and found through their data-* hooks. */
export function LandingMotion({ rtl }: { rtl: boolean }) {
  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    const root = document.querySelector<HTMLElement>('[data-landing]');
    if (!root) return;
    import('@/lib/motion/engine').then(({ initLanding }) => {
      if (!cancelled) off = initLanding(root, { rtl });
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, [rtl]);
  return null;
}
