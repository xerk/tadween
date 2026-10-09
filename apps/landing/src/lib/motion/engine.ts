import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Hero3D, HeroState } from './hero3d';

gsap.registerPlugin(ScrollTrigger);

/* The landing motion engine, ported from the design system's components/landing/landing.js.
   GSAP word reveals, the 3D hero (three.js, loaded as its own chunk), a pinned
   write → preview → schedule section scrubbed by scroll, staggered reveals, 3D tilt cards,
   the Arabic card turning in like a page and the CTA growing out of the page.
   prefers-reduced-motion gets the finished states with no scroll effects. Only transform,
   opacity and clip-path animate. Returns a cleanup function. */
export function initLanding(root: HTMLElement, { rtl }: { rtl: boolean }): () => void {
  const html = document.documentElement;
  const state: HeroState = { assemble: 0, tilt: 0 };
  let hero: Hero3D | null = null;
  let disposed = false;
  const offs: (() => void)[] = [];
  const mm = gsap.matchMedia(root);
  const dirX = rtl ? -1 : 1;

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
      desktop: '(min-width: 901px)',
      hover: '(hover: hover) and (pointer: fine)',
    },
    (ctx) => {
      const { reduce, desktop, hover } = ctx.conditions as Record<string, boolean>;

      // Hero copy: English words rise out of a mask; Arabic lines fade up whole.
      // `motion-ready` lifts the pre-paint hiding in landing.css before the tweens read
      // their end values.
      html.classList.add('motion-ready');
      if (!reduce) {
        root.querySelectorAll<HTMLElement>('[data-split]').forEach((el, i) => {
          gsap.from(el.querySelectorAll('.lw-i'), { yPercent: 115, opacity: 0, duration: 1.05, ease: 'expo.out', stagger: 0.05, delay: 0.1 + i * 0.15 });
        });
        gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-hero-in]')).forEach((el, i) => {
          gsap.from(el, { y: 20, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.45 + i * 0.08 });
        });
      }

      // 3D hero: assemble once the scene is up, flatten as the hero scrolls away.
      state.assemble = reduce ? 1 : 0;
      state.tilt = 0;
      if (!reduce) {
        gsap.to(state, {
          tilt: 1,
          ease: 'none',
          scrollTrigger: { trigger: root.querySelector('.pz-hx'), start: 'top top', end: 'bottom top', scrub: 0.6 },
        });
      }

      // Pinned workflow, four steps: the post types itself (Write), the LinkedIn, X and
      // Threads previews take turns (Preview everywhere), the post lands on the week and
      // the Scheduled chip drops in (Schedule), and the chip turns to Published. Scrubbed,
      // so it reverses. Stage and network go to data-stage / data-net; CSS does the swaps.
      const flow = root.querySelector<HTMLElement>('[data-flow]');
      if (flow) {
        const steps = flow.querySelectorAll<HTMLElement>('[data-flow-step]');
        const typed = flow.querySelector<HTMLElement>('[data-flow-type]');
        const full = typed?.textContent ?? '';
        const chip = flow.querySelector('[data-flow-chip]');
        const bar = flow.querySelector<HTMLElement>('[data-flow-bar]');
        const card = flow.querySelector('[data-flow-card]');
        const n = steps.length;
        const setStep = (p: number) => {
          const k = Math.min(n - 1, Math.floor(p * n));
          // Inside the preview step, the three networks take a third each.
          const net = k === 1 ? Math.min(2, Math.floor((p * n - 1) * 3)) : 0;
          flow.dataset.stage = String(k);
          flow.dataset.net = String(net);
          steps.forEach((s, i) => {
            s.classList.toggle('is-active', i === k);
            s.classList.toggle('is-done', i < k);
          });
        };
        if (reduce) {
          setStep(1);
          flow.dataset.net = '0';
          if (bar) bar.style.transform = 'scaleX(1)';
        } else {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: flow,
              // Desktop pins the section for 2400px of scroll; phones scrub it in place.
              ...(desktop ? { start: 'top top', end: '+=2400', pin: true } : { start: 'top 70%', end: 'bottom 40%' }),
              scrub: 0.5,
              onUpdate: (self) => {
                setStep(self.progress);
                if (bar) bar.style.transform = `scaleX(${self.progress})`;
              },
            },
          });
          const o = { n: 0 };
          const chars = Array.from(full); // code points, so Arabic and dashes never split
          // The timeline runs 0 → 4, one unit per step.
          tl.to(o, {
            n: chars.length,
            duration: 0.85,
            ease: 'none',
            onUpdate: () => {
              if (typed) typed.textContent = chars.slice(0, Math.round(o.n)).join('');
            },
          })
            .from(card, { rotateX: 14, y: 30, scale: 0.94, duration: 0.6, ease: 'power2.out' }, 0)
            .to(card, { rotateX: 0, duration: 0.4 }, 0.6)
            .from(chip, { y: -120, x: 80 * dirX, rotate: -8 * dirX, opacity: 0, scale: 0.8, duration: 0.6, ease: 'back.out(1.6)' }, 2.1)
            .to({}, { duration: 0.01 }, 3.99);
          if (typed) typed.textContent = '';
          setStep(0);
        }
        // Undo DOM changes when the media query flips or the page unmounts.
        offs.push(() => {
          if (typed) typed.textContent = full;
          flow.dataset.stage = '3';
          flow.dataset.net = '0';
        });
      }

      // Illustrations play their small CSS animation once they're on screen; with reduced
      // motion they're marked at once and show the finished state.
      root.querySelectorAll<HTMLElement>('[data-art]').forEach((el) => {
        if (reduce) {
          el.classList.add('is-in');
          return;
        }
        ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => el.classList.add('is-in') });
      });

      if (!reduce) {
        // Reveals.
        root.querySelectorAll('[data-reveal]').forEach((el) => {
          gsap.from(el, { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
        });
        root.querySelectorAll('[data-stagger]').forEach((el) => {
          gsap.from(el.children, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 82%', once: true } });
        });
        // The Arabic card turns in like a page, from the reading edge.
        const flip = root.querySelector('[data-flip]');
        if (flip) {
          gsap.from(flip, {
            rotateY: -55 * dirX,
            x: 60 * dirX,
            opacity: 0,
            transformPerspective: 1200,
            transformOrigin: rtl ? 'left center' : 'right center',
            ease: 'power3.out',
            duration: 1.1,
            scrollTrigger: { trigger: flip, start: 'top 80%', once: true },
          });
        }
        // The CTA band grows out of the page.
        const cta = root.querySelector('[data-cta]');
        if (cta) {
          gsap.fromTo(
            cta,
            { clipPath: 'inset(12% 8% 12% 8% round 40px)' },
            { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none', scrollTrigger: { trigger: cta, start: 'top 95%', end: 'top 45%', scrub: true } },
          );
        }
      }

      // 3D tilt cards, only with a real pointer.
      if (!reduce && hover) {
        root.querySelectorAll<HTMLElement>('[data-tilt]').forEach((c) => {
          const mv = (ev: PointerEvent) => {
            const b = c.getBoundingClientRect();
            const x = (ev.clientX - b.left) / b.width - 0.5, y = (ev.clientY - b.top) / b.height - 0.5;
            gsap.to(c, { rotateY: x * 8, rotateX: -y * 8, y: -4, duration: 0.5, ease: 'power3.out', transformPerspective: 900 });
          };
          const lv = () => gsap.to(c, { rotateY: 0, rotateX: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.6)' });
          c.addEventListener('pointermove', mv);
          c.addEventListener('pointerleave', lv);
          offs.push(() => {
            c.removeEventListener('pointermove', mv);
            c.removeEventListener('pointerleave', lv);
          });
        });
      }

      return () => {
        offs.splice(0).forEach((f) => f());
      };
    },
  );

  // The three.js scene loads as its own chunk, after the page is interactive. The CSS
  // poster shows the finished week until the first frame is drawn.
  const canvas = root.querySelector<HTMLCanvasElement>('[data-hero3d]');
  const stage = root.querySelector<HTMLElement>('[data-hero-stage]');
  if (canvas && stage) {
    import('./hero3d').then(({ createHero3D }) => {
      if (disposed) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      hero = createHero3D(canvas, {
        state,
        reduced,
        rtl,
        onFirstFrame: () => {
          stage.classList.add('is-live');
          if (!reduced) gsap.to(state, { assemble: 1, duration: 2.2, ease: 'power2.out' });
        },
      });
    });
  }

  const refresh = () => ScrollTrigger.refresh();
  // A link like /#features scrolled before the pin spacer existed, so the target has
  // moved down by the pinned distance. Re-scroll to it, once the layout is final, unless
  // the visitor has already scrolled somewhere else.
  let hashY: number | null = null;
  const toHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (!el || (hashY !== null && Math.abs(window.scrollY - hashY) > 2)) return;
    el.scrollIntoView({ block: 'start' });
    hashY = window.scrollY;
  };
  refresh();
  toHash();
  document.fonts?.ready.then(() => {
    if (disposed) return;
    refresh();
    toHash();
  });
  window.addEventListener('load', refresh);

  return () => {
    disposed = true;
    window.removeEventListener('load', refresh);
    hero?.dispose();
    gsap.killTweensOf(state);
    mm.revert();
    html.classList.remove('motion-ready');
  };
}
