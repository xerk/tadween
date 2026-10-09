'use client';

import { useEffect } from 'react';

/** Starts the landing motion once the page has hydrated. GSAP loads as a separate chunk
    through a dynamic import, so it never blocks first paint. The sections themselves are
    server-rendered and found through their data-* hooks. */
export function LandingMotion() {
  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    const root = document.querySelector<HTMLElement>('[data-landing]');
    if (!root) return;
    import('@/lib/motion/engine').then(({ initLanding }) => {
      if (!cancelled) off = initLanding(root);
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);
  return null;
}
