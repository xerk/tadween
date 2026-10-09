import type { Dict, Faq } from '@/content/types';
import { ar } from '@/content/ar';
import { CHANNELS, MORE_CHANNELS, channelBySlug } from '@/lib/channels';
import { LICENSE_URL, SIGN_IN_URL, SIGN_UP_URL, SOURCE_URL } from '@/lib/config';
import { TILE_KINDS } from '@/lib/heroGrid';
import { PATHS, channelPath, localePath } from '@/lib/routes';
import { Accordion } from './Accordion';
import { FeedPreview } from './ChannelPreview';
import { FeatureArt } from './FeatureArt';
import { Icon, cx } from './Icon';
import { LinkedInPreview, MediaArt } from './LinkedInPreview';
import { Logo } from './Logo';

/* Marketing sections, ported from the design system's LandingExperience
   (components/src/pages.tsx) and extended for the full site. They render on the server;
   the motion engine (lib/motion) finds them through the data-* hooks after hydration. */

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

const FLOW_NETS = ['linkedin', 'x', 'threads'] as const;

/** The product story, scrubbed by scroll: the post types itself, the per-network previews
    take turns, the post drops onto the week, and the chip turns to Published. The stage
    and network live in data-stage / data-net (set by the engine); CSS does the rest. The
    server renders the finished state, which is also what reduced motion keeps. */
export function Flow({ t }: { t: Dict }) {
  const f = t.flow;
  const metrics = t.lang === 'ar' ? { reactions: '١٢٨', comments: '١٤', reposts: '٦' } : undefined;
  const x = channelBySlug('x')!;
  const threads = channelBySlug('threads')!;
  return (
    <section className="pz-flow" id="flow" data-flow data-stage="3" data-net="0" aria-labelledby="flow-title">
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
      <div className="pz-flow-stage" aria-hidden="true">
        <div className="pz-flow-nets">
          {FLOW_NETS.map((slug, i) => {
            const c = channelBySlug(slug)!;
            return (
              <span key={slug} className="pz-flow-net" data-i={i}>
                <img src={c.icon} width={16} height={16} alt="" />
                {c.name}
              </span>
            );
          })}
        </div>
        <div className="pz-flow-cards">
          <LinkedInPreview
            className="pz-flow-card"
            data-flow-card
            author={f.author}
            labels={t.linkedin}
            dir={t.dir}
            metrics={metrics}
            textSlot={
              <p className="pz-li-text pz-flow-text">
                <span data-flow-type>{f.text}</span>
                <span className="pz-flow-caret" />
              </p>
            }
            media={
              <div className="pz-flow-media">
                <MediaArt />
              </div>
            }
          />
          <FeedPreview className="pz-flow-alt" data-i="1" author={f.author} text={f.xText} icon={x.icon} name={x.name} color={x.accent} media />
          <FeedPreview className="pz-flow-alt" data-i="2" author={f.author} text={f.threadsText} icon={threads.icon} name={threads.name} color={threads.accent} />
        </div>
        <div className="pz-flow-week">
          {f.week.map((d, i) => (
            <span key={d} className={cx('pz-flow-day', i === 3 && 'is-target')}>
              <span className="caption">{d}</span>
              {i === 1 ? <i className="is-soft" /> : null}
              {i === 3 ? <i className="is-post" /> : null}
            </span>
          ))}
        </div>
        <div className="pz-flow-chip" data-flow-chip>
          <Icon name="calendar-days" size={16} />
          <span className="pz-flow-chip-sched">
            <strong>{f.chipWhen}</strong>
            <span>{f.chipWhere}</span>
          </span>
          <span className="pz-flow-chip-done">
            <strong>{f.published}</strong>
            <span>{f.publishedWhere}</span>
          </span>
          <Icon name="circle-check" size={18} />
        </div>
      </div>
    </section>
  );
}

/** Placeholder social proof. Every slot says it's a placeholder until the owner adds real
    customers; no invented logos or quotes. */
export function Proof({ t }: { t: Dict }) {
  return (
    <section className="pz-proof" aria-labelledby="proof-title">
      <div className="pz-proof-head">
        <h2 id="proof-title" className="caption pz-muted">
          {t.proof.title}
        </h2>
        <span className="pz-placeholder caption">{t.proof.placeholder}</span>
      </div>
      <ul className="pz-proof-logos">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i}>{t.proof.logo}</li>
        ))}
      </ul>
      <figure className="pz-proof-quote">
        <blockquote>{t.proof.quote}</blockquote>
        <figcaption className="caption pz-muted">{t.proof.quoteBy}</figcaption>
      </figure>
    </section>
  );
}

/** The feature grid: one card per section of /features, each with its illustration. */
export function Features({ t }: { t: Dict }) {
  return (
    <section className="pz-lsec" id="features" aria-labelledby="features-title">
      <div className="pz-lsec-head" data-reveal>
        <h2 id="features-title" className="title-1">
          {t.features.title}
        </h2>
        <p className="pz-lsec-sub">{t.features.sub}</p>
      </div>
      <div className="pz-bento" data-stagger>
        {t.featuresPage.sections.map((f) => (
          <a key={f.id} className={cx('pz-feat', 'pz-bento-card', `is-${f.id}`)} href={`${localePath(t.lang, PATHS.features)}#${f.id}`} data-tilt data-art>
            <FeatureArt kind={f.art} rtl={t.dir === 'rtl'} />
            <span className={cx('pz-feat-icon', f.smart && 'is-smart')}>
              <Icon name={f.icon} size={18} />
            </span>
            <h3 className="headline">{f.title}</h3>
            <p>{f.body}</p>
          </a>
        ))}
      </div>
      <a className="pz-more-link pz-center" href={localePath(t.lang, PATHS.features)}>
        {t.features.more}
        <Icon name="arrow-right" className="pz-flip-rtl" />
      </a>
    </section>
  );
}

/** Network tiles linking to each channel page. */
export function ChannelGrid({ t, compact }: { t: Dict; compact?: boolean }) {
  return (
    <ul className={cx('pz-chgrid', compact && 'is-compact')} data-stagger>
      {CHANNELS.map((c) => (
        <li key={c.slug}>
          <a className="pz-chtile" href={localePath(t.lang, channelPath(c.slug))}>
            <img src={c.icon} width={28} height={28} alt="" loading="lazy" />
            <span>{c.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ChannelsSection({ t }: { t: Dict }) {
  const s = t.channelsSection;
  return (
    <section className="pz-lsec" id="channels" aria-labelledby="channels-title">
      <div className="pz-lsec-head" data-reveal>
        <h2 id="channels-title" className="title-1">
          {s.title}
        </h2>
        <p className="pz-lsec-sub">{s.sub}</p>
      </div>
      <ChannelGrid t={t} compact />
      <p className="pz-chmore">
        <span className="pz-chmore-icons" aria-hidden="true">
          {MORE_CHANNELS.slice(0, 6).map((m) => (
            <img key={m.name} src={m.icon} width={20} height={20} alt="" loading="lazy" />
          ))}
        </span>
        <span className="pz-muted">{s.more}</span>
        <a className="pz-more-link" href={localePath(t.lang, PATHS.channels)}>
          {s.all}
          <Icon name="arrow-right" className="pz-flip-rtl" />
        </a>
      </p>
    </section>
  );
}

/** A prompt, the tool calls it turns into, and the result. The calls light up one by one
    when the card scrolls in (CSS, keyed on .is-in from the engine). */
export function AgentDemo({ t }: { t: Dict }) {
  const a = t.agentTeaser;
  return (
    <div className="pz-agent" data-art>
      <div className="pz-agent-prompt">
        <span className="pz-avatar" aria-hidden="true">
          {t.flow.author.initials}
        </span>
        <p>{a.prompt}</p>
      </div>
      <ol className="pz-agent-calls">
        {a.calls.map((c, i) => (
          <li key={c.tool} style={{ ['--d' as string]: `${300 + i * 450}ms` }}>
            <Icon name="circle-check" size={16} />
            <span>
              <code dir="ltr">{c.tool}</code>
              {c.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="pz-agent-done" style={{ ['--d' as string]: `${300 + a.calls.length * 450}ms` }}>
        <Icon name="calendar-days" size={16} />
        {a.done}
      </p>
    </div>
  );
}

export function AgentTeaser({ t }: { t: Dict }) {
  const a = t.agentTeaser;
  return (
    <section className="pz-lsec" id="agent" aria-labelledby="agent-title">
      <div className="pz-split">
        <div className="pz-split-copy" data-reveal>
          <span className="pz-hero-eyebrow">
            <Icon name="bot" size={14} />
            {t.agentPage.eyebrow}
          </span>
          <h2 id="agent-title" className="title-1">
            {a.title}
          </h2>
          <p className="pz-lsec-sub">{a.sub}</p>
          <a className="pz-more-link" href={localePath(t.lang, PATHS.agent)}>
            {a.link}
            <Icon name="arrow-right" className="pz-flip-rtl" />
          </a>
        </div>
        <div data-reveal>
          <AgentDemo t={t} />
        </div>
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

/** Questions and answers in the design system's accordion. */
export function FaqSection({ id, title, items }: { id: string; title: string; items: Faq[] }) {
  return (
    <section className="pz-lsec" id={id} aria-labelledby={`${id}-title`}>
      <div className="pz-faq" data-reveal>
        <h2 id={`${id}-title`} className="title-2">
          {title}
        </h2>
        <Accordion items={items} />
      </div>
    </section>
  );
}

/** The header of an inner page: optional breadcrumb and eyebrow, an H1 and its lead. */
export function PageHead({ t, title, sub, eyebrow, crumbs }: { t: Dict; title: string; sub: string; eyebrow?: string; crumbs?: { name: string; href: string }[] }) {
  return (
    <header className="pz-phead">
      <div className="pz-lsec-head">
        {crumbs ? (
          <nav className="pz-crumbs" aria-label={t.nav.breadcrumb}>
            <ol>
              {crumbs.map((c, i) => (
                <li key={c.href}>
                  {i < crumbs.length - 1 ? <a href={c.href}>{c.name}</a> : <span aria-current="page">{c.name}</span>}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {eyebrow ? <span className="pz-hero-eyebrow pz-center">{eyebrow}</span> : null}
        <h1 className="display" data-hero-in>
          {title}
        </h1>
        <p className="pz-lsec-sub" data-hero-in>
          {sub}
        </p>
      </div>
    </header>
  );
}

export function CTA({ t, title, body }: { t: Dict; title?: string; body?: string }) {
  return (
    <section className="pz-lcta" data-cta aria-labelledby="cta-title">
      <h2 id="cta-title" className="title-1">
        {title ?? t.cta.title}
      </h2>
      <p>{body ?? t.cta.body}</p>
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

const FOOTER_CHANNELS = ['linkedin', 'linkedin-page', 'x', 'instagram', 'facebook', 'tiktok'];

export function Footer({ t }: { t: Dict }) {
  const channelLinks = FOOTER_CHANNELS.map((slug) => ({ href: localePath(t.lang, channelPath(slug)), label: channelBySlug(slug)!.name }));
  const columns = [t.footer.columns[0], { title: t.footer.channelsTitle, links: channelLinks }, ...t.footer.columns.slice(1)];
  return (
    <footer className="pz-lfoot">
      <div className="pz-lfoot-brand">
        <Logo size={28} href={t.base || '/'} label={t.nav.home} arabic={t.lang === 'ar'} />
        <p className="caption pz-muted">{t.footer.tagline}</p>
      </div>
      {columns.map((c) => (
        <nav key={c.title} className="pz-lfoot-col" aria-label={c.title}>
          <span className="caption pz-muted">{c.title}</span>
          {c.links.map((l) => (
            <a key={l.href} href={l.href} {...('external' in l && l.external ? { rel: 'noopener', target: '_blank' } : {})}>
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
