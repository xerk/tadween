import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* The landing motion engine: GSAP word reveals in the hero, scroll reveals and staggers,
   a gentle parallax on product screenshots, the live mocks and agent chats that play once
   they're on screen (.is-in), and the CTA band growing out of the page.
   prefers-reduced-motion gets the finished states with no scroll effects. Only transform,
   opacity and clip-path animate. Returns a cleanup function. */
export function initLanding(root: HTMLElement): () => void {
  const html = document.documentElement;
  const mm = gsap.matchMedia(root);

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
      desktop: '(min-width: 961px)',
    },
    (ctx) => {
      const { reduce, desktop } = ctx.conditions as Record<string, boolean>;

      // Hero copy: English words rise out of a mask; Arabic lines fade up whole.
      // `motion-ready` lifts the pre-paint hiding in landing.css before the tweens read
      // their end values.
      html.classList.add('motion-ready');
      if (!reduce) {
        root.querySelectorAll<HTMLElement>('[data-split]').forEach((el, i) => {
          gsap.from(el.querySelectorAll('.lw-i'), { yPercent: 115, opacity: 0, duration: 1.05, ease: 'expo.out', stagger: 0.05, delay: 0.1 + i * 0.15 });
        });
        gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-hero-in]')).forEach((el, i) => {
          gsap.from(el, { y: 20, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.35 + i * 0.07 });
        });
      }

      // Mocks and chats play their CSS sequence once on screen; with reduced motion they
      // are marked at once and show the finished state.
      root.querySelectorAll<HTMLElement>('[data-art]').forEach((el) => {
        if (reduce) {
          el.classList.add('is-in');
          return;
        }
        ScrollTrigger.create({ trigger: el, start: 'top 80%', once: true, onEnter: () => el.classList.add('is-in') });
      });

      if (!reduce) {
        root.querySelectorAll('[data-reveal]').forEach((el) => {
          gsap.from(el, { y: 32, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        });
        root.querySelectorAll('[data-stagger]').forEach((el) => {
          gsap.from(el.children, { y: 32, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
        });
        // Screenshots drift a little slower than the page on desktop.
        if (desktop) {
          root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
            gsap.fromTo(el, { y: 40 }, { y: -40, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
          });
        }
        // The CTA band grows out of the page.
        root.querySelectorAll('[data-cta]').forEach((cta) => {
          gsap.fromTo(
            cta,
            { clipPath: 'inset(8% 6% 8% 6% round 40px)' },
            { clipPath: 'inset(0% 0% 0% 0% round 32px)', ease: 'none', scrollTrigger: { trigger: cta, start: 'top 95%', end: 'top 55%', scrub: true } },
          );
        });
      }
    },
  );

  const refresh = () => ScrollTrigger.refresh();
  document.fonts?.ready.then(refresh);
  window.addEventListener('load', refresh);

  return () => {
    window.removeEventListener('load', refresh);
    mm.revert();
    html.classList.remove('motion-ready');
  };
}
