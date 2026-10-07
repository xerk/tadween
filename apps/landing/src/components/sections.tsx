import type { Dict } from '@/content/types';
import { ar } from '@/content/ar';
import { LICENSE_URL, SIGN_IN_URL, SIGN_UP_URL, SOURCE_URL } from '@/lib/config';
import { TILE_KINDS } from '@/lib/heroGrid';
import { Icon, cx } from './Icon';
import { LinkedInPreview, MediaArt } from './LinkedInPreview';
import { Logo } from './Logo';

/* Marketing sections, ported from the design system's LandingExperience
   (components/src/pages.tsx). They render on the server; the motion engine
   (lib/motion) finds them through the data-* hooks after hydration. */

/** English headlines rise word by word out of a mask, so each word gets its own span.
    Arabic is not split: the mask would clip its tall glyphs, so it fades up whole. */
function SplitWords({ text }: { text: string }) {
  const words = text.split(/\s+/);
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="lw">
            <span className="lw-i">{w}</span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  );
}

export function Hero({ t }: { t: Dict }) {
  const rtl = t.dir === 'rtl';
  return (
    <section className="pz-hx" aria-labelledby="hero-title">
      <div className="pz-hx-copy">
        <span className="pz-hero-eyebrow" data-hero-in>
          <Icon name="sparkles" size={14} />
          {t.hero.eyebrow}
        </span>
        {rtl ? (
          <h1 id="hero-title" className="display pz-hx-title" data-hero-in>
            {t.hero.title}
          </h1>
        ) : (
          <h1 id="hero-title" className="display pz-hx-title" data-split aria-label={t.hero.title}>
            <span aria-hidden="true">
              <SplitWords text={t.hero.title} />
            </span>
          </h1>
        )}
        <p className="pz-hero-sub" data-hero-in>
          {t.hero.sub}
        </p>
        <div className="pz-hero-cta" data-hero-in>
          <a className="pz-btn pz-btn-primary pz-btn-lg" href={SIGN_UP_URL}>
            {t.hero.primary}
            <Icon name="arrow-right" className="pz-flip-rtl" />
          </a>
          <a className="pz-btn pz-btn-secondary pz-btn-lg" href="#flow">
            {t.hero.secondary}
          </a>
        </div>
        <p className="caption pz-muted" data-hero-in style={{ margin: 0 }}>
          {t.hero.fine}
        </p>
      </div>
      <div className="pz-hx-stage" data-hero-stage aria-hidden="true">
        <div className="pz-hx-poster">
          <div className="pz-hx-grid">
            {TILE_KINDS.map((k, i) => (
              <i key={i} className={k === 'empty' ? undefined : `is-${k}`} />
            ))}
          </div>
        </div>
        <canvas data-hero3d className="pz-hx-canvas" />
        <span className="pz-hx-tag is-best" data-hero-in>
          <Icon name="sparkles" size={13} />
          {t.hero.tagBest}
        </span>
        <span className="pz-hx-tag is-sched" data-hero-in>
          <Icon name="clock" size={13} />
          {t.hero.tagScheduled}
        </span>
      </div>
      <div className="pz-hx-scroll caption pz-muted" data-hero-in aria-hidden="true">
        <span />
        {t.hero.scroll}
      </div>
    </section>
  );
}

export function Flow({ t }: { t: Dict }) {
  const f = t.flow;
  return (
    <section className="pz-flow" id="flow" data-flow aria-labelledby="flow-title">
      <div className="pz-flow-copy">
        <h2 id="flow-title" className="title-1">
          {f.title}
        </h2>
        <ol className="pz-flow-steps">
          {f.steps.map((s) => (
            <li key={s.title} className="pz-flow-step" data-flow-step>
              <span className="pz-flow-ic">
                <Icon name={s.icon} size={16} />
              </span>
              <span>
                <strong>{s.title}</strong>
                <span>{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <span className="pz-flow-track" aria-hidden="true">
          <span data-flow-bar />
        </span>
      </div>
      <div className="pz-flow-stage">
        <LinkedInPreview
          className="pz-flow-card"
          data-flow-card
          author={f.author}
          labels={t.linkedin}
          dir={t.dir}
          metrics={t.lang === 'ar' ? { reactions: '١٢٨', comments: '١٤', reposts: '٦' } : undefined}
          textSlot={
            <p className="pz-li-text pz-flow-text">
              <span data-flow-type>{f.text}</span>
              <span className="pz-flow-caret" aria-hidden="true" />
            </p>
          }
          media={
            <div className="pz-flow-media">
              <MediaArt />
            </div>
          }
        />
        <div className="pz-flow-chip" data-flow-chip>
          <Icon name="calendar-days" size={16} />
          <span>
            <strong>{f.chipWhen}</strong>
            <span>{f.chipWhere}</span>
          </span>
          <Icon name="circle-check" size={18} />
        </div>
      </div>
    </section>
  );
}

export function Features({ t }: { t: Dict }) {
  return (
    <section className="pz-lsec" id="features" aria-labelledby="features-title">
      <div className="pz-lsec-head" data-reveal>
        <h2 id="features-title" className="title-1">
          {t.features.title}
        </h2>
        <p className="pz-lsec-sub">{t.features.sub}</p>
      </div>
      <div className="pz-feat-grid" data-stagger>
        {t.features.items.map((f) => (
          <div key={f.title} className="pz-feat" data-tilt>
            <span className={cx('pz-feat-icon', f.smart && 'is-smart')}>
              <Icon name={f.icon} size={18} />
            </span>
            <h3 className="headline">{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Steps({ t }: { t: Dict }) {
  const digits = (n: number) => (t.lang === 'ar' ? `٠${'١٢٣'[n]}` : `0${n + 1}`);
  return (
    <section className="pz-lsec pz-steps-sec" aria-labelledby="steps-title">
      <div className="pz-lsec-head" data-reveal>
        <h2 id="steps-title" className="title-1">
          {t.steps.title}
        </h2>
      </div>
      <ol className="pz-lsteps" data-stagger>
        {t.steps.items.map((s, i) => (
          <li key={s.title} className="pz-lstep">
            <span className="pz-lstep-n time" aria-hidden="true">
              {digits(i)}
            </span>
            <Icon name={s.icon} size={20} />
            <h3 className="headline">{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The Arabic section always shows an Arabic post, on both pages. */
export function ArabicSection({ t }: { t: Dict }) {
  return (
    <section className="pz-lsec" id="arabic" aria-labelledby="arabic-title">
      <div className="pz-lar">
        <div className="pz-lar-copy" data-reveal>
          <h2 id="arabic-title" className="title-1">
            {t.arabic.title}
          </h2>
          <p className="pz-lsec-sub">{t.arabic.sub}</p>
          <ul className="pz-plan-list">
            {t.arabic.bullets.map((b) => (
              <li key={b}>
                <Icon name="check" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="pz-lar-shot" data-flip>
          <LinkedInPreview
            lang="ar"
            dir="rtl"
            device="mobile"
            author={{ name: 'منى عادل', headline: 'مؤسِّسة ستوديو النيل', initials: 'مع' }}
            labels={ar.linkedin}
            metrics={{ reactions: '١٢٨', comments: '١٤', reposts: '٦' }}
            text={'وظّفنا أول ١٠ مهندسين في القاهرة خلال ٩٠ يومًا.\n\nثلاثة أشياء صنعت الفرق:\n١. كتبنا الوظيفة كأنها منشور.\n٢. دفعنا مقابل الاختبار.\n٣. رددنا على الجميع خلال ٤٨ ساعة.'}
          />
        </div>
      </div>
    </section>
  );
}

export function CTA({ t }: { t: Dict }) {
  return (
    <section className="pz-lcta" data-cta aria-labelledby="cta-title">
      <h2 id="cta-title" className="title-1">
        {t.cta.title}
      </h2>
      <p>{t.cta.body}</p>
      <div className="pz-hero-cta">
        <a className="pz-btn pz-btn-primary pz-btn-lg" href={SIGN_UP_URL}>
          {t.cta.primary}
          <Icon name="arrow-right" className="pz-flip-rtl" />
        </a>
        <a className="pz-btn pz-btn-ghost pz-btn-lg" href={SIGN_IN_URL}>
          {t.cta.secondary}
        </a>
      </div>
    </section>
  );
}

export function Footer({ t }: { t: Dict }) {
  return (
    <footer className="pz-lfoot">
      <div className="pz-lfoot-brand">
        <Logo size={28} href={t.base || '/'} label={t.nav.home} arabic={t.lang === 'ar'} />
        <p className="caption pz-muted">{t.footer.tagline}</p>
      </div>
      {t.footer.columns.map((c) => (
        <nav key={c.title} className="pz-lfoot-col" aria-label={c.title}>
          <span className="caption pz-muted">{c.title}</span>
          {c.links.map((l) => (
            <a key={l.label} href={l.href} {...(l.external ? { rel: 'noopener', target: '_blank' } : {})}>
              {l.label}
            </a>
          ))}
        </nav>
      ))}
      <p className="caption pz-muted pz-lfoot-legal">
        {t.footer.copyright}{' '}
        <span lang="en" dir="ltr">
          <a href={SOURCE_URL} rel="noopener" target="_blank">
            Built on Postiz
          </a>
          , open source under{' '}
          <a href={LICENSE_URL} rel="noopener" target="_blank">
            AGPL-3.0
          </a>
          .
        </span>
      </p>
    </footer>
  );
}
