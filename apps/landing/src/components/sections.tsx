import type { ReactNode } from 'react';
import type { ChatDemo, Dict, Faq } from '@/content/types';
import { channelBySlug } from '@/lib/channels';
import { LICENSE_URL, SIGN_IN_URL, SIGN_UP_URL, SOURCE_URL } from '@/lib/config';
import { FEATURE_MENU, featureRefIcon, featureRefPath, type FeatureRef } from '@/lib/features';
import { FEATURE_SLUGS, PATHS, channelPath, featurePath, localePath } from '@/lib/routes';
import type { ShotId } from '@/lib/shots';
import { Accordion } from './Accordion';
import { Icon, cx } from './Icon';
import type { IconName } from './icons';
import { Logo } from './Logo';
import { PostShowcase } from './PostShowcase';
import { Shot } from './Shot';

/* Marketing sections shared by the pages. They render on the server; the motion engine
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

/** A centred section head: optional eyebrow, the H2 and its lead. */
export function SectionHead({ id, title, sub, eyebrow, start, children }: { id: string; title: string; sub?: string; eyebrow?: ReactNode; start?: boolean; children?: ReactNode }) {
  return (
    <div className={cx('pz-sec-head', start && 'is-start')} data-reveal>
      {eyebrow}
      <h2 id={id} className="t-h2">
        {title}
      </h2>
      {sub ? <p className="t-lead">{sub}</p> : null}
      {children}
    </div>
  );
}

export function Eyebrow({ icon, children, smart }: { icon: IconName; children: ReactNode; smart?: boolean }) {
  return (
    <span className={cx('pz-eyebrow', smart && 'is-smart')}>
      <Icon name={icon} size={14} />
      {children}
    </span>
  );
}

export function TrialButtons({ t, primary, secondaryHref, secondary }: { t: Dict; primary?: string; secondaryHref?: string; secondary?: string }) {
  return (
    <div className="pz-cta-row">
      <a className="pz-btn pz-btn-primary pz-btn-lg" href={SIGN_UP_URL}>
        {primary ?? t.hero.primary}
        <Icon name="arrow-right" className="pz-flip-rtl" />
      </a>
      {secondaryHref ? (
        <a className="pz-btn pz-btn-secondary pz-btn-lg" href={secondaryHref}>
          {secondary}
        </a>
      ) : null}
    </div>
  );
}

const HERO_NETS = ['linkedin', 'x', 'instagram', 'facebook', 'threads', 'tiktok', 'youtube'];

export function Hero({ t }: { t: Dict }) {
  const rtl = t.dir === 'rtl';
  return (
    <section className="pz-hero" aria-labelledby="hero-title">
      <div className="pz-container pz-hero-grid">
        <div className="pz-hero-copy">
          <span data-hero-in>
            <Eyebrow icon="sparkles">{t.hero.eyebrow}</Eyebrow>
          </span>
          {rtl ? (
            <h1 id="hero-title" className="t-hero" data-hero-in>
              {t.hero.title}
            </h1>
          ) : (
            <h1 id="hero-title" className="t-hero" data-split aria-label={t.hero.title}>
              <span aria-hidden="true">
                <SplitWords text={t.hero.title} />
              </span>
            </h1>
          )}
          <p className="t-lead" data-hero-in>
            {t.hero.sub}
          </p>
          <div data-hero-in>
            <TrialButtons t={t} secondaryHref="#product" secondary={t.hero.secondary} />
          </div>
          <p className="pz-fine" data-hero-in>
            {t.hero.fine}
          </p>
          <p className="pz-hero-nets" data-hero-in>
            <span aria-hidden="true">
              {HERO_NETS.map((slug) => (
                <img key={slug} src={channelBySlug(slug)!.icon} width={24} height={24} alt="" />
              ))}
            </span>
            {t.hero.nets}
          </p>
        </div>
        <PostShowcase t={t} />
      </div>
    </section>
  );
}

/** The big product shot after the hero: the real calendar with a chip being dragged to a
    new day and a hover preview popping up, both drawn over the screenshot. */
export function ProductShot({ t }: { t: Dict }) {
  const p = t.product;
  const li = channelBySlug('linkedin')!;
  return (
    <section className="pz-sec is-tight" id="product" aria-labelledby="product-title">
      <div className="pz-container">
        <SectionHead id="product-title" title={p.title} sub={p.sub} />
      </div>
      <div className="pz-container is-wide">
        <div className="pz-stage pz-showcase" data-parallax>
          <div className="pz-mock pz-zoomable" data-art>
            <Shot t={t} id="calendar-week" priority />
            <span className="pz-mock-chip" style={{ top: '46%', insetInlineStart: '44%', ['--dx' as string]: t.dir === 'rtl' ? '-110%' : '110%', ['--dy' as string]: '-140%' }} aria-hidden="true">
              <img src={li.icon} alt="" width={14} height={14} />
              Nile Studio · 09:00
            </span>
            <span className="pz-mock-cursor is-drag" style={{ top: '49%', insetInlineStart: '55%', ['--dx' as string]: t.dir === 'rtl' ? '-1100%' : '1100%', ['--dy' as string]: '-820%' }} aria-hidden="true">
              <Icon name="mouse-pointer-2" size={22} />
            </span>
            <div className="pz-mock-pop" style={{ top: '18%', insetInlineEnd: '3%' }} aria-hidden="true">
              <Shot t={t} id="calendar-preview" frame="bare" />
            </div>
          </div>
          <span className="pz-callout is-a" data-reveal>
            <Icon name="eye" size={16} />
            {p.calloutA}
          </span>
          <span className="pz-callout is-b is-smart" data-reveal>
            <Icon name="mouse-pointer-2" size={16} />
            {p.calloutB}
          </span>
        </div>
      </div>
    </section>
  );
}

/** A row of network names and icons, linking to the channel pages. */
export function NetStrip({ t }: { t: Dict }) {
  const nets = ['linkedin', 'linkedin-page', 'x', 'instagram', 'facebook', 'threads', 'tiktok', 'youtube', 'pinterest', 'bluesky'];
  return (
    <section className="pz-sec is-tight" aria-labelledby="nets-title">
      <div className="pz-container pz-netstrip">
        <p id="nets-title">{t.netstrip.title}</p>
        <ul>
          {nets.map((slug) => {
            const c = channelBySlug(slug)!;
            return (
              <li key={slug}>
                <a href={localePath(t.lang, channelPath(slug))}>
                  <img src={c.icon} width={24} height={24} alt="" loading="lazy" />
                  {t.channels.items[slug].name ?? c.name}
                </a>
              </li>
            );
          })}
          <li>
            <a href={localePath(t.lang, PATHS.channels)}>
              {t.netstrip.all}
              <Icon name="arrow-right" className="pz-flip-rtl" />
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}

/** Copy beside a screenshot; `flip` puts the screenshot first (on the reading start). */
export function FeatureRow({ t, id, kicker, icon, title, body, points, shot, link, href, flip, headingLevel = 3 }: { t: Dict; id?: string; kicker?: string; icon?: IconName; title: string; body: string; points?: string[]; shot: ShotId; link?: string; href?: string; flip?: boolean; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className={cx('pz-row', flip && 'is-flip')} id={id}>
      <div className="pz-row-copy" data-reveal>
        {kicker ? (
          <span className="pz-kicker">
            {icon ? <Icon name={icon} size={16} /> : null}
            {kicker}
          </span>
        ) : null}
        <H className="t-h3">{title}</H>
        <p className="t-body">{body}</p>
        {points?.length ? <CheckList items={points} /> : null}
        {link && href ? (
          <a className="pz-more-link" href={href}>
            {link}
            <Icon name="arrow-right" className="pz-flip-rtl" />
          </a>
        ) : null}
      </div>
      <div className="pz-row-media pz-zoomable" data-reveal data-parallax>
        <Shot t={t} id={shot} />
      </div>
    </div>
  );
}

/** The home tour: four tools, each with a real screenshot. */
export function Tour({ t }: { t: Dict }) {
  return (
    <section className="pz-sec" id="features" aria-labelledby="tour-title">
      <div className="pz-container">
        <SectionHead id="tour-title" title={t.tour.title} sub={t.tour.sub} />
        <div className="pz-rows">
          {t.tour.rows.map((r, i) => (
            <FeatureRow key={r.href} t={t} {...r} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** The Arabic band: the composer in Arabic, beside the promise. */
export function ArabicSection({ t }: { t: Dict }) {
  return (
    <section className="pz-sec is-band" id="arabic" aria-labelledby="arabic-title">
      <div className="pz-container pz-ar-band">
        <div className="pz-row-copy" data-reveal>
          <span className="pz-kicker">
            <Icon name="languages" size={16} />
            <span lang="ar">العربية</span> · <span lang="en">Arabic</span>
          </span>
          <h2 id="arabic-title" className="t-h2">
            {t.arabic.title}
          </h2>
          <p className="t-body">{t.arabic.sub}</p>
          <CheckList items={t.arabic.bullets} />
        </div>
        <div className="pz-zoomable" data-reveal>
          <Shot t={t} id="composer-arabic" />
        </div>
      </div>
    </section>
  );
}

/** One conversation with the agent: the request, the tool calls lighting up one by one,
    the reply and a card of the posts it scheduled. Built from the app's chat; the calls
    play when the card scrolls in (CSS, keyed on .is-in from the motion engine). */
/** A conversation with the agent. `frame` draws it inside another AI client instead of
    Tadween's own chat: that client's name as text and a neutral glyph (never its logo), a
    terminal for command-line clients, and the Tadween tool calls it makes. */
export function AgentChat({ t, demo, compact, frame }: { t: Dict; demo: ChatDemo; compact?: boolean; frame?: { title: string; online: string; icon: IconName; input: string; terminal?: boolean } }) {
  const c = frame ?? { ...t.agentPage.chat, icon: 'bot' as IconName };
  const steps = demo.tools.length;
  const delay = (i: number) => ({ ['--d' as string]: `${250 + i * 500}ms` });
  return (
    <div className={cx('pz-chat', frame && 'is-client', frame?.terminal && 'is-terminal')} data-art dir={demo.lang === 'ar' ? 'rtl' : 'ltr'} lang={demo.lang}>
      {compact ? null : (
        <div className="pz-chat-top">
          <span className={cx('pz-tile-ic', !frame && 'is-smart')}>
            <Icon name={c.icon} size={16} />
          </span>
          {c.title}
          <span>{c.online}</span>
        </div>
      )}
      <p className="pz-chat-msg" lang={demo.lang}>
        {demo.prompt}
      </p>
      {demo.tools.map((tool, i) => (
        <div key={tool.tool + i} className="pz-chat-tool" data-step style={delay(i)}>
          <Icon name="circle-check" size={16} />
          <span>
            <span>{tool.label}</span>
            <code dir="ltr">{tool.tool}</code>
          </span>
        </div>
      ))}
      <p className="pz-chat-reply" data-step style={delay(steps)} lang={demo.lang}>
        {demo.reply}
      </p>
      <div className="pz-chat-posts" data-step style={delay(steps + 1)}>
        {demo.posts.map((p, i) => (
          <div key={i} className="pz-chat-post">
            <img src={channelBySlug(p.net)!.icon} width={22} height={22} alt="" />
            <span>
              <strong>{p.name}</strong>
              <span dir="auto">{p.text}</span>
            </span>
            <time>{p.when}</time>
          </div>
        ))}
      </div>
      {compact ? null : (
        <div className="pz-chat-input" aria-hidden="true">
          {c.input}
          <span className="pz-tile-ic">
            <Icon name="send" size={16} className="pz-flip-rtl" />
          </span>
        </div>
      )}
    </div>
  );
}

export function AgentTeaser({ t }: { t: Dict }) {
  const a = t.agentTeaser;
  return (
    <section className="pz-sec" id="agent" aria-labelledby="agent-title">
      <div className="pz-container pz-row">
        <div className="pz-row-copy" data-reveal>
          <Eyebrow icon="bot" smart>
            {a.eyebrow}
          </Eyebrow>
          <h2 id="agent-title" className="t-h2">
            {a.title}
          </h2>
          <p className="t-body">{a.sub}</p>
          <a className="pz-more-link" href={localePath(t.lang, PATHS.agent)}>
            {a.link}
            <Icon name="arrow-right" className="pz-flip-rtl" />
          </a>
        </div>
        <div data-reveal>
          <AgentChat t={t} demo={t.agentPage.hero} />
        </div>
      </div>
    </section>
  );
}

/** A card linking to a tool page, with a screenshot of it. */
export function FeatureCard({ t, refId }: { t: Dict; refId: FeatureRef }) {
  const nav = refId === 'agent' ? t.featuresIndex.agentNav : t.features[refId].nav;
  const shot: ShotId = refId === 'agent' ? 'agent' : t.features[refId].hero;
  return (
    <a className="pz-card" href={localePath(t.lang, featureRefPath(refId))}>
      <span className="pz-card-media" aria-hidden="true">
        <Shot t={t} id={shot} frame="bare" />
      </span>
      <span className="pz-card-body">
        <strong>
          <Icon name={featureRefIcon(refId)} size={18} />
          {nav.label}
        </strong>
        <p>{nav.blurb}</p>
      </span>
    </a>
  );
}

export function AllFeatures({ t, title, sub, more }: { t: Dict; title?: string; sub?: string; more?: boolean }) {
  return (
    <section className="pz-sec" id="all-features" aria-labelledby="all-features-title">
      <div className="pz-container">
        <SectionHead id="all-features-title" title={title ?? t.allFeatures.title} sub={sub ?? t.allFeatures.sub} />
        <ul className="pz-cards" data-stagger>
          {FEATURE_MENU.map((ref) => (
            <li key={ref}>
              <FeatureCard t={t} refId={ref} />
            </li>
          ))}
        </ul>
        {more ? (
          <p className="pz-center-text">
            <a className="pz-more-link" href={localePath(t.lang, PATHS.features)}>
              {t.allFeatures.more}
              <Icon name="arrow-right" className="pz-flip-rtl" />
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function Steps({ t, title, items }: { t: Dict; title: string; items: { title: string; body: string }[] }) {
  return (
    <section className="pz-sec" aria-labelledby="steps-title">
      <div className="pz-container">
        <SectionHead id="steps-title" title={title} />
        <ol className="pz-steps" data-stagger>
          {items.map((s) => (
            <li key={s.title}>
              <strong>{s.title}</strong>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** A list with check marks, the plan-list look from the design system. */
export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="pz-plan-list">
      {items.map((it) => (
        <li key={it}>
          <Icon name="check" />
          {it}
        </li>
      ))}
    </ul>
  );
}

/** Questions and answers in the design system's accordion. */
export function FaqSection({ id, title, items }: { id: string; title: string; items: Faq[] }) {
  return (
    <section className="pz-sec" id={id} aria-labelledby={`${id}-title`}>
      <div className="pz-container">
        <div className="pz-faq" data-reveal>
          <h2 id={`${id}-title`} className="t-h2">
            {title}
          </h2>
          <Accordion items={items} />
        </div>
      </div>
    </section>
  );
}

/** The header of an inner page: breadcrumb, then an optional badge or eyebrow, the H1, its
    lead and anything after it (CTAs). The breadcrumb matches the page's BreadcrumbList. */
export function PageHead({ t, title, sub, eyebrow, crumbs, badge, children }: { t: Dict; title: string; sub: string; eyebrow?: ReactNode; crumbs?: { name: string; href: string }[]; badge?: ReactNode; children?: ReactNode }) {
  return (
    <header className="pz-phead">
      <div className="pz-container">
        <div className="pz-sec-head">
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
          {badge}
          {eyebrow ? <span data-hero-in>{eyebrow}</span> : null}
          <h1 className="display" data-hero-in>
            {title}
          </h1>
          <p className="t-lead" data-hero-in>
            {sub}
          </p>
          {children ? <div data-hero-in>{children}</div> : null}
        </div>
      </div>
    </header>
  );
}


export function CTA({ t, title, body }: { t: Dict; title?: string; body?: string }) {
  return (
    <section className="pz-sec is-tight" aria-labelledby="cta-title">
      <div className="pz-container is-wide">
        <div className="pz-cta" data-cta>
          <h2 id="cta-title" className="t-h2">
            {title ?? t.cta.title}
          </h2>
          <p>{body ?? t.cta.body}</p>
          <div className="pz-cta-row">
            <a className="pz-btn pz-btn-primary pz-btn-lg" href={SIGN_UP_URL}>
              {t.cta.primary}
              <Icon name="arrow-right" className="pz-flip-rtl" />
            </a>
            <a className="pz-btn pz-btn-ghost pz-btn-lg" href={SIGN_IN_URL}>
              {t.cta.secondary}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

const FOOTER_CHANNELS = ['linkedin', 'linkedin-page', 'x', 'instagram', 'facebook', 'tiktok', 'youtube'];

export function Footer({ t }: { t: Dict }) {
  const lp = (path: string) => localePath(t.lang, path);
  const tools = { title: t.footer.toolsTitle, links: [...FEATURE_SLUGS.map((s) => ({ href: lp(featurePath(s)), label: t.features[s].nav.label })), { href: lp(PATHS.agent), label: t.featuresIndex.agentNav.label }] };
  const channels = { title: t.footer.channelsTitle, links: FOOTER_CHANNELS.map((slug) => ({ href: lp(channelPath(slug)), label: t.channels.items[slug].name ?? channelBySlug(slug)!.name })) };
  const columns = [t.footer.columns[0], tools, channels, ...t.footer.columns.slice(1)];
  return (
    <footer className="pz-foot">
      <div className="pz-container is-wide">
        <div className="pz-foot-grid">
          <div className="pz-foot-brand">
            <Logo size={28} href={t.base || '/'} label={t.nav.home} arabic={t.lang === 'ar'} />
            <p>{t.footer.tagline}</p>
          </div>
          {columns.map((c) => (
            <nav key={c.title} className="pz-foot-col" aria-label={c.title}>
              <span>{c.title}</span>
              {c.links.map((l) => (
                <a key={l.href} href={l.href} {...('external' in l && l.external ? { rel: 'noopener', target: '_blank' } : {})}>
                  {l.label}
                </a>
              ))}
            </nav>
          ))}
        </div>
        <p className="pz-foot-legal">
          <span>{t.footer.copyright}</span>
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
      </div>
    </footer>
  );
}

