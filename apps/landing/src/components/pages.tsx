import type { ReactNode } from 'react';
import type { ChannelCopy, Dict } from '@/content/types';
import { AI_CLIENTS, KIND_ICON, clientBySlug, type AiClientFacts, type ClientKind } from '@/lib/aiClients';
import { CHANNELS, MORE_CHANNELS, channelBySlug, type ChannelFacts, type ChannelGroup } from '@/lib/channels';
import { DOCS_API_URL } from '@/lib/config';
import { FEATURES, FEATURE_MENU } from '@/lib/features';
import { breadcrumbs, faqPage, organization, product, softwareApplication } from '@/lib/jsonld';
import { loadPlans } from '@/lib/plans';
import { PATHS, channelPath, clientPath, featurePath, localePath, type FeatureSlug } from '@/lib/routes';
import { CHANNEL_SHOT, channelShotSrc } from '@/lib/shots';
import { CopyButton } from './CopyButton';
import { Icon, cx } from './Icon';
import { JsonLd } from './JsonLd';
import { LandingMotion } from './LandingMotion';
import { LandingNav } from './LandingNav';
import { PricingTable } from './PricingTable';
import { AgentChat, AgentTeaser, AllFeatures, ArabicSection, CheckList, CTA, Eyebrow, FaqSection, FeatureCard, FeatureRow, Footer, Hero, NetStrip, PageHead, ProductShot, SectionHead, Steps, Tour, TrialButtons } from './sections';
import { Shot } from './Shot';

/** Every page: skip link, nav (with the same page in the other language), main, footer
    and the motion engine. `path` has no language prefix. */
function Shell({ t, path, children, jsonLd }: { t: Dict; path: string; children: ReactNode; jsonLd?: object[] }) {
  const other = t.lang === 'ar' ? 'en' : 'ar';
  return (
    <div className={cx('pz-landing', t.lang === 'ar' && 'is-ar')} data-landing>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <a className="pz-skip" href="#main">
        {t.skip}
      </a>
      <LandingNav t={t} altHref={localePath(other, path)} current={localePath(t.lang, path)} />
      <main id="main">{children}</main>
      <Footer t={t} />
      <LandingMotion />
    </div>
  );
}

/** A network's name as this language writes it (لينكدإن in Arabic, LinkedIn in English). */
const channelName = (t: Dict, c: ChannelFacts) => t.channels.items[c.slug].name ?? c.name;

const crumbHome = (t: Dict) => ({ name: t.nav.home, href: localePath(t.lang, PATHS.home) });

/** Breadcrumb trail from home to `page`, as the page shows it and as BreadcrumbList data. */
const trail = (t: Dict, ...pages: { name: string; href: string }[]) => [crumbHome(t), ...pages];
const trailLd = (crumbs: { name: string; href: string }[]) => breadcrumbs(crumbs.map((c) => ({ name: c.name, path: c.href })));

/** Fills {name} and {limit} in a channel page template. */
const fillChannel = (t: Dict, facts: ChannelFacts) => (s: string) =>
  s.replaceAll('{name}', channelName(t, facts)).replaceAll('{limit}', new Intl.NumberFormat(t.numberLocale).format(facts.limit));

/** A link card to a channel page, used on the index and under related channels. */
function ChannelCard({ t, c }: { t: Dict; c: ChannelFacts }) {
  return (
    <a className="pz-chcard" href={localePath(t.lang, channelPath(c.slug))}>
      <img src={c.icon} width={40} height={40} alt="" loading="lazy" />
      <span>
        <strong>{channelName(t, c)}</strong>
        <span>{t.channels.items[c.slug].h1}</span>
      </span>
      <Icon name="chevron-right" className="pz-flip-rtl pz-muted" />
    </a>
  );
}

function PricingSection({ t, children }: { t: Dict; children: ReactNode }) {
  return (
    <section className="pz-sec" id="pricing" aria-labelledby="pricing-title">
      <div className="pz-container">
        <SectionHead id="pricing-title" title={t.pricing.sectionTitle} sub={t.pricing.sectionSub} />
        <div data-reveal>{children}</div>
      </div>
    </section>
  );
}

/** The home page, in either language. */
export async function LandingPage({ t }: { t: Dict }) {
  const { plans, source } = await loadPlans();
  return (
    <Shell t={t} path={PATHS.home} jsonLd={[organization(), softwareApplication(t, source === 'api' ? plans : null)]}>
      <Hero t={t} />
      <ProductShot t={t} />
      <NetStrip t={t} />
      <Tour t={t} />
      <ArabicSection t={t} />
      <AgentTeaser t={t} />
      <AllFeatures t={t} more />
      <Steps t={t} title={t.steps.title} items={t.steps.items} />
      <PricingSection t={t}>
        <PricingTable p={t.pricing} lang={t.lang} numberLocale={t.numberLocale} plans={plans} source={source} compare={false} faq={false} compareHref={localePath(t.lang, PATHS.pricing)} />
      </PricingSection>
      <FaqSection id="faq" title={t.homeFaq.title} items={t.homeFaq.items} />
      <CTA t={t} />
    </Shell>
  );
}

/** The pricing page: tiers, the full compare table and the FAQ. */
export async function PricingPage({ t }: { t: Dict }) {
  const { plans, source } = await loadPlans();
  return (
    // Offers are published only for prices set in the app, never for the placeholders.
    <Shell t={t} path={PATHS.pricing} jsonLd={source === 'api' ? [product(t, plans), faqPage(t.pricing.faq)] : [faqPage(t.pricing.faq)]}>
      <PageHead t={t} title={t.pricing.pageTitle} sub={t.pricing.pageSub} />
      <section className="pz-sec" aria-label={t.pricing.pageTitle}>
        <div className="pz-container">
          <PricingTable p={t.pricing} lang={t.lang} numberLocale={t.numberLocale} plans={plans} source={source} />
        </div>
      </section>
      <CTA t={t} />
    </Shell>
  );
}

/** /features: every tool as a card with its screenshot, then a quick tour. */
export function FeaturesPage({ t }: { t: Dict }) {
  const f = t.featuresIndex;
  const crumbs = trail(t, { name: t.nav.features, href: localePath(t.lang, PATHS.features) });
  return (
    <Shell t={t} path={PATHS.features} jsonLd={[trailLd(crumbs)]}>
      <PageHead t={t} crumbs={crumbs} title={f.title} sub={f.sub}>
        <TrialButtons t={t} primary={t.featurePage.start} />
      </PageHead>
      <section className="pz-sec" aria-label={f.title}>
        <div className="pz-container">
          <ul className="pz-cards" data-stagger>
            {FEATURE_MENU.map((ref) => (
              <li key={ref}>
                <FeatureCard t={t} refId={ref} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="pz-sec is-band" aria-labelledby="tour-title">
        <div className="pz-container">
          <SectionHead id="tour-title" title={t.tour.title} sub={t.tour.sub} />
          <div className="pz-rows">
            {t.tour.rows.map((r, i) => (
              <FeatureRow key={r.href} t={t} {...r} flip={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>
      <ArabicSection t={t} />
      <CTA t={t} />
    </Shell>
  );
}

/** A tool page: hero with its screenshot, benefits beside screenshots, how it works,
    related tools, questions (FAQPage data) and the call to action. */
export function FeaturePage({ t, slug }: { t: Dict; slug: FeatureSlug }) {
  const f = t.features[slug];
  const meta = FEATURES[slug];
  const path = featurePath(slug);
  const crumbs = trail(t, { name: t.nav.features, href: localePath(t.lang, PATHS.features) }, { name: f.nav.label, href: localePath(t.lang, path) });
  return (
    <Shell t={t} path={path} jsonLd={[faqPage(f.faq), trailLd(crumbs)]}>
      <PageHead t={t} crumbs={crumbs} title={f.h1} sub={f.sub} eyebrow={<Eyebrow icon={meta.icon}>{f.nav.label}</Eyebrow>}>
        <TrialButtons t={t} primary={t.featurePage.start} secondaryHref="#tour" secondary={t.featurePage.tour} />
      </PageHead>
      <section className="pz-sec is-tight" aria-label={f.nav.label}>
        <div className="pz-container is-wide">
          <div className="pz-stage pz-showcase pz-zoomable" data-reveal data-parallax>
            <Shot t={t} id={f.hero} priority />
            {f.callouts ? (
              <>
                <span className="pz-callout is-a">
                  <Icon name="sparkles" size={16} />
                  {f.callouts[0]}
                </span>
                <span className="pz-callout is-b is-smart">
                  <Icon name="check" size={16} />
                  {f.callouts[1]}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </section>
      <section className="pz-sec" id="tour" aria-label={t.featurePage.tour}>
        <div className="pz-container pz-rows">
          {f.benefits.map((b, i) => (
            <FeatureRow key={b.title} t={t} id={b.id} title={b.title} body={b.body} points={b.points} shot={b.shot} flip={i % 2 === 1} headingLevel={2} />
          ))}
        </div>
      </section>
      <section className="pz-sec is-band" aria-labelledby="how-title">
        <div className="pz-container">
          <SectionHead id="how-title" title={t.featurePage.howTitle} />
          <ol className="pz-steps" data-stagger>
            {f.steps.map((s) => (
              <li key={s.title}>
                <strong>{s.title}</strong>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="pz-sec" aria-labelledby="related-title">
        <div className="pz-container">
          <SectionHead id="related-title" title={t.featurePage.relatedTitle} />
          <ul className="pz-cards" data-stagger>
            {meta.related.map((ref) => (
              <li key={ref}>
                <FeatureCard t={t} refId={ref} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <FaqSection id="faq" title={t.featurePage.faqTitle} items={f.faq} />
      <CTA t={t} />
    </Shell>
  );
}

const withApi = (s: string) => s.replaceAll('{api}', DOCS_API_URL);

/** A code window with the API base filled in and a copy button. Code is always left to right. */
function Code({ t, label, code }: { t: Dict; label: string; code: string }) {
  const text = withApi(code);
  return (
    <figure className="pz-code">
      <figcaption>
        <span className="pz-shot-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span dir="ltr">{label}</span>
        <CopyButton text={text} label={t.agentPage.connect.copy} done={t.agentPage.connect.copied} />
      </figcaption>
      <pre dir="ltr" tabIndex={0}>
        <code>{text}</code>
      </pre>
    </figure>
  );
}

/** /ai-agent: a live-looking conversation, the AI tools it works with, how to connect,
    example conversations that end in scheduled posts, what it can do, the in-app agent,
    connectors to come and questions. */
export function AgentPage({ t }: { t: Dict }) {
  const a = t.agentPage;
  const crumbs = trail(t, { name: t.nav.features, href: localePath(t.lang, PATHS.features) }, { name: a.eyebrow, href: localePath(t.lang, PATHS.agent) });
  return (
    <Shell t={t} path={PATHS.agent} jsonLd={[faqPage(a.faq), trailLd(crumbs)]}>
      <section className="pz-hero" aria-labelledby="agent-title">
        <div className="pz-container pz-hero-grid">
          <div className="pz-hero-copy">
            <nav className="pz-crumbs is-start" aria-label={t.nav.breadcrumb}>
              <ol>
                {crumbs.map((c, i) => (
                  <li key={c.href}>{i < crumbs.length - 1 ? <a href={c.href}>{c.name}</a> : <span aria-current="page">{c.name}</span>}</li>
                ))}
              </ol>
            </nav>
            <span data-hero-in>
              <Eyebrow icon="bot" smart>
                {a.eyebrow}
              </Eyebrow>
            </span>
            <h1 id="agent-title" className="t-hero" data-hero-in>
              {a.title}
            </h1>
            <p className="t-lead" data-hero-in>
              {a.sub}
            </p>
            <div data-hero-in>
              <TrialButtons t={t} primary={t.featurePage.start} secondaryHref="#connect" secondary={a.connect.title} />
            </div>
          </div>
          <div data-hero-in>
            <AgentChat t={t} demo={a.hero} />
          </div>
        </div>
      </section>
      <section className="pz-sec is-tight" id="clients" aria-labelledby="works-title">
        <div className="pz-container">
          <SectionHead id="works-title" title={a.works.title} sub={a.works.sub} />
          <ClientsGrid t={t} />
          <p className="pz-fine pz-center-text">{a.works.note}</p>
        </div>
      </section>
      <section className="pz-sec" id="connect" aria-labelledby="connect-title">
        <div className="pz-container">
          <SectionHead id="connect-title" title={a.connect.title} sub={a.connect.sub} />
          <div className="pz-pair" data-stagger>
            <div className="pz-panel">
              <span className="pz-panel-n">1</span>
              <h3 className="t-h3">{a.connect.connectTitle}</h3>
              <p className="t-body">{a.connect.connectBody}</p>
              <Code t={t} label={a.connect.linkLabel} code="{api}/mcp-oauth-dynamic" />
            </div>
            <div className="pz-panel">
              <span className="pz-panel-n">2</span>
              <h3 className="t-h3">{a.connect.askTitle}</h3>
              <p className="t-body">{a.connect.askBody}</p>
              <AgentChat t={t} demo={a.connect.ask} compact />
              <p className="pz-fine">{a.connect.alsoTry}</p>
              <ul className="pz-chips">
                {a.connect.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <ol className="pz-steps is-row" data-stagger>
            {a.connect.steps.map((s) => (
              <li key={s.title}>
                <strong>{s.title}</strong>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="pz-sec is-band" aria-labelledby="clients-title">
        <div className="pz-container">
          <SectionHead id="clients-title" title={a.connect.clientsTitle} sub={a.connect.clientsSub} />
          <div className="pz-clients" data-stagger>
            {a.connect.clients.map((c) => (
              <div key={c.name} className="pz-panel">
                <h3 className="t-h3">{c.name}</h3>
                <p className="t-body">{c.how}</p>
                <ol className="pz-mini-steps">
                  {c.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <Code t={t} label={c.codeLabel} code={c.code} />
              </div>
            ))}
          </div>
          <p className="pz-note" data-reveal>
            <Icon name="key" size={18} />
            <span>{withApi(a.connect.keyNote)}</span>
          </p>
        </div>
      </section>
      <section className="pz-sec" aria-labelledby="inapp-title">
        <div className="pz-container">
          <SectionHead id="inapp-title" title={a.inApp.title} sub={a.inApp.sub} />
          <div className="pz-stage pz-zoomable" data-reveal data-parallax>
            <Shot t={t} id="agent" />
          </div>
          <ul className="pz-checks is-centered" data-stagger>
            {a.inApp.points.map((p) => (
              <li key={p}>
                <strong>
                  <Icon name="check" size={18} />
                  {p}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="pz-sec is-band" aria-labelledby="examples-title">
        <div className="pz-container">
          <SectionHead id="examples-title" title={a.examples.title} sub={a.examples.sub} />
          <div className="pz-convos" data-stagger>
            {a.examples.items.map((demo, i) => (
              <AgentChat key={i} t={t} demo={demo} compact />
            ))}
          </div>
        </div>
      </section>
      <section className="pz-sec" aria-labelledby="can-title">
        <div className="pz-container">
          <SectionHead id="can-title" title={a.can.title} sub={a.can.sub} />
          <ul className="pz-checks" data-stagger>
            {a.can.items.map((c) => (
              <li key={c.title}>
                <span className="pz-tile-ic">
                  <Icon name={c.icon} size={20} />
                </span>
                <strong>{c.title}</strong>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
          <p className="pz-note" data-reveal>
            <Icon name="shield-check" size={18} />
            {a.cannot}
          </p>
        </div>
      </section>
      <section className="pz-sec is-tight" id="connectors" aria-labelledby="connectors-title">
        <div className="pz-container">
          <SectionHead id="connectors-title" title={a.connectors.title} sub={a.connectors.sub} eyebrow={<span className="pz-placeholder">{a.connectors.badge}</span>} />
          <ul className="pz-connectors" data-stagger>
            {a.connectors.items.map((c) => (
              <li key={c.title}>
                <span className="pz-tile-ic">
                  <Icon name={c.icon} size={18} />
                </span>
                <span>
                  <strong>{c.title}</strong>
                  <span>{c.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="pz-fine pz-center-text">{a.connectors.planNote}</p>
        </div>
      </section>
      <FaqSection id="faq" title={a.faqTitle} items={a.faq} />
      <CTA t={t} />
    </Shell>
  );
}

const GROUPS: ChannelGroup[] = ['professional', 'social', 'video', 'community', 'blog'];

export function ChannelsIndexPage({ t }: { t: Dict }) {
  const c = t.channels;
  const crumbs = trail(t, { name: t.footer.channelsTitle, href: localePath(t.lang, PATHS.channels) });
  return (
    <Shell t={t} path={PATHS.channels} jsonLd={[trailLd(crumbs)]}>
      <PageHead t={t} crumbs={crumbs} title={c.index.title} sub={c.index.sub} />
      <section className="pz-sec" aria-label={c.index.title}>
        <div className="pz-container pz-chgroups">
          {GROUPS.map((g) => (
            <div key={g}>
              <h2 id={`g-${g}`} className="t-h3 pz-group-title">
                {c.index.groups[g]}
              </h2>
              <ul className="pz-chcards" data-stagger aria-labelledby={`g-${g}`}>
                {CHANNELS.filter((ch) => ch.group === g).map((ch) => (
                  <li key={ch.slug}>
                    <ChannelCard t={t} c={ch} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 id="g-more" className="t-h3 pz-group-title">
              {c.index.more.title}
            </h2>
            <p className="t-body pz-group-sub">{c.index.more.sub}</p>
            <ul className="pz-chgrid" aria-labelledby="g-more">
              {MORE_CHANNELS.map((m) => (
                <li key={m.name}>
                  <span className="pz-chtile">
                    <img src={m.icon} width={28} height={28} alt="" loading="lazy" />
                    <span>{m.name}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <CTA t={t} />
    </Shell>
  );
}

/** The two questions every channel page answers, filled in from the facts, then the
    network's own questions. */
function channelFaq(t: Dict, facts: ChannelFacts, copy: ChannelCopy) {
  const p = t.channels.page;
  const fill = fillChannel(t, facts);
  return [
    { title: fill(p.limitQ), content: [fill(p.limitA), copy.limitNote].filter(Boolean).join(' ') },
    { title: fill(p.scheduleQ), content: fill(p.scheduleA) },
    ...copy.faq,
  ];
}

export function ChannelPage({ t, slug }: { t: Dict; slug: string }) {
  const facts = channelBySlug(slug)!;
  const copy = t.channels.items[slug];
  const p = t.channels.page;
  const fmt = new Intl.NumberFormat(t.numberLocale);
  const crumbs = trail(t, { name: t.footer.channelsTitle, href: localePath(t.lang, PATHS.channels) }, { name: channelName(t, facts), href: localePath(t.lang, channelPath(slug)) });
  const faq = channelFaq(t, facts, copy);
  const comments = facts.comments === true ? p.commentsValue.yes : facts.comments === 'text-only' ? p.commentsValue.text : p.commentsValue.no;
  const fill = fillChannel(t, facts);
  return (
    <Shell t={t} path={channelPath(slug)} jsonLd={[faqPage(faq), trailLd(crumbs)]}>
      <PageHead
        t={t}
        crumbs={crumbs}
        title={copy.h1}
        sub={copy.intro}
        badge={
          <span className="pz-chbadge">
            <img src={facts.icon} width={44} height={44} alt="" />
          </span>
        }
      >
        <TrialButtons t={t} primary={p.start} />
      </PageHead>
      <section className="pz-sec is-tight" aria-labelledby="preview-title">
        <div className="pz-container is-wide">
          <div className="pz-stage pz-zoomable" data-reveal data-parallax>
            <figure className="pz-shot is-browser">
              <div className="pz-shot-bar" aria-hidden="true">
                <span className="pz-shot-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="pz-shot-url">{`${t.shotUrl}/launches`}</span>
                <i />
              </div>
              <div className="pz-shot-zoom">
                {(['light', 'dark'] as const).map((theme) => (
                  <img key={theme} className={`is-${theme}`} src={channelShotSrc(slug, t.lang, theme)} width={CHANNEL_SHOT.w} height={CHANNEL_SHOT.h} alt={fill(p.previewTitle)} loading="lazy" decoding="async" />
                ))}
              </div>
            </figure>
          </div>
          <div className="pz-sec-head pz-caption-head" data-reveal>
            <h2 id="preview-title" className="t-h3">
              {fill(p.previewTitle)}
            </h2>
            <p className="t-body">{fill(p.previewSub)}</p>
          </div>
        </div>
      </section>
      <section className="pz-sec" aria-labelledby="facts-title">
        <div className="pz-container">
          <SectionHead id="facts-title" title={p.factsTitle} />
          <dl className="pz-facts" data-stagger>
            <div>
              <dt>{p.limit}</dt>
              <dd className="metric">{fmt.format(facts.limit)}</dd>
            </div>
            <div>
              <dt>{p.editor}</dt>
              <dd>{p.editors[facts.editor]}</dd>
            </div>
            <div>
              <dt>{p.comments}</dt>
              <dd>{comments}</dd>
            </div>
          </dl>
          {copy.limitNote ? <p className="pz-fine pz-center-text">{copy.limitNote}</p> : null}
          <div className="pz-formats pz-formats-gap">
            <div data-reveal>
              <h3 className="t-h3">{p.formatsTitle}</h3>
              <CheckList items={copy.formats} />
            </div>
            <div data-reveal>
              <h3 className="t-h3">{p.mediaTitle}</h3>
              <p className="t-body">{copy.media}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="pz-sec is-band" aria-labelledby="why-title">
        <div className="pz-container">
          <SectionHead id="why-title" title={p.featuresTitle} />
          <ul className="pz-checks" data-stagger>
            {copy.features.map((f) => (
              <li key={f.title}>
                <strong>
                  <Icon name="sparkles" size={18} />
                  {f.title}
                </strong>
                <p>{f.body}</p>
              </li>
            ))}
            {p.shared.map((f) => (
              <li key={f.title}>
                <strong>
                  <Icon name={f.icon} size={18} />
                  {f.title}
                </strong>
                <p>{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <FaqSection id="faq" title={p.faqTitle} items={faq} />
      <section className="pz-sec is-tight" aria-labelledby="related-title">
        <div className="pz-container">
          <h2 id="related-title" className="t-h3 pz-group-title">
            {p.relatedTitle}
          </h2>
          <ul className="pz-chcards">
            {facts.related.map((r) => (
              <li key={r}>
                <ChannelCard t={t} c={channelBySlug(r)!} />
              </li>
            ))}
          </ul>
          <p className="pz-center-text">
            <a className="pz-more-link" href={localePath(t.lang, PATHS.channels)}>
              {t.nav.allChannels}
              <Icon name="arrow-right" className="pz-flip-rtl" />
            </a>
          </p>
        </div>
      </section>
      <CTA t={t} title={fill(p.ctaTitle)} body={fill(p.ctaBody)} />
    </Shell>
  );
}


/** A link card to an AI client's page: a neutral glyph (never the product's logo), the
    client's name as text and what it is. */
export function ClientCard({ t, c }: { t: Dict; c: AiClientFacts }) {
  return (
    <a className="pz-chcard" href={localePath(t.lang, clientPath(c.slug))}>
      <span className="pz-tile-ic">
        <Icon name={KIND_ICON[c.kind]} size={20} />
      </span>
      <span>
        <strong lang="en" dir="ltr">
          {c.name}
        </strong>
        <span>{t.aiClients.items[c.slug].blurb}</span>
      </span>
      <Icon name="chevron-right" className="pz-flip-rtl pz-muted" />
    </a>
  );
}

const CLIENT_KINDS: ClientKind[] = ['assistant', 'coding'];

/** Every client page, grouped by kind: the "Works with" grid on the AI agent page. */
function ClientsGrid({ t }: { t: Dict }) {
  return (
    <div className="pz-chgroups">
      {CLIENT_KINDS.map((kind) => (
        <div key={kind}>
          <h3 id={`k-${kind}`} className="t-h3 pz-group-title">
            {t.aiClients.kinds[kind]}
          </h3>
          <ul className="pz-chcards" data-stagger aria-labelledby={`k-${kind}`}>
            {AI_CLIENTS.filter((c) => c.kind === kind).map((c) => (
              <li key={c.slug}>
                <ClientCard t={t} c={c} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** One AI client's page: the client chatting with Tadween, how to connect it step by step
    with the snippets to copy, what to ask, what it can do, the channels it reaches, how
    access stays safe, questions (FAQPage data), related clients and the call to action. */
export function AiClientPage({ t, slug }: { t: Dict; slug: string }) {
  const facts = clientBySlug(slug)!;
  const copy = t.aiClients.items[slug];
  const p = t.aiClients.page;
  const fill = (s: string) => s.replaceAll('{name}', facts.name).replaceAll('{n}', new Intl.NumberFormat(t.numberLocale).format(facts.methods[0].steps.length));
  const path = clientPath(slug);
  const crumbs = trail(t, { name: t.agentPage.eyebrow, href: localePath(t.lang, PATHS.agent) }, { name: facts.name, href: localePath(t.lang, path) });
  const faq = [...p.sharedFaq.map((f) => ({ title: fill(f.title), content: withApi(fill(f.content)) })), ...copy.faq];
  // The words and the snippets live in two files; a step without its words fails the build.
  for (const m of facts.methods) {
    if (copy.methods[m.auth]?.steps.length !== m.steps.length) throw new Error(`${t.lang} copy for ${slug} (${m.auth}) needs ${m.steps.length} steps.`);
  }
  return (
    <Shell t={t} path={path} jsonLd={[faqPage(faq), trailLd(crumbs)]}>
      <section className="pz-hero" aria-labelledby="client-title">
        <div className="pz-container pz-hero-grid">
          <div className="pz-hero-copy">
            <nav className="pz-crumbs is-start" aria-label={t.nav.breadcrumb}>
              <ol>
                {crumbs.map((c, i) => (
                  <li key={c.href}>{i < crumbs.length - 1 ? <a href={c.href}>{c.name}</a> : <span aria-current="page">{c.name}</span>}</li>
                ))}
              </ol>
            </nav>
            <span data-hero-in>
              <Eyebrow icon="plug" smart>
                {fill(p.eyebrow)}
              </Eyebrow>
            </span>
            <h1 id="client-title" className="display" data-hero-in>
              {copy.h1}
            </h1>
            <p className="t-lead" data-hero-in>
              {copy.intro}
            </p>
            <div data-hero-in>
              <TrialButtons t={t} primary={p.start} secondaryHref="#connect" secondary={fill(p.stepsLink)} />
            </div>
          </div>
          <div data-hero-in>
            <AgentChat t={t} demo={copy.demo} frame={{ title: facts.name, online: fill(p.frameOnline), icon: KIND_ICON[facts.kind], input: fill(p.frameInput), terminal: facts.terminal }} />
          </div>
        </div>
      </section>
      <section className="pz-sec" id="connect" aria-labelledby="connect-title">
        <div className="pz-container">
          <SectionHead id="connect-title" title={fill(p.connectTitle)} sub={fill(p.connectSub)} />
          <div className={cx('pz-pair', facts.methods.length === 1 && 'is-single')} data-stagger>
            {facts.methods.map((m, mi) => {
              const words = copy.methods[m.auth]!;
              return (
                <div key={m.auth} className="pz-panel">
                  <span className={cx('pz-method', m.auth === 'key' && 'is-key')}>
                    <Icon name={m.auth === 'key' ? 'key' : 'shield-check'} size={14} />
                    {mi === 0 && facts.methods.length > 1 ? `${words.label} · ${p.recommended}` : words.label}
                  </span>
                  <h3 className="t-h3">{fill(words.how)}</h3>
                  <ol className="pz-mini-steps is-code">
                    {m.steps.map((code, i) => (
                      <li key={i}>
                        <div>
                          <p>{withApi(fill(words.steps[i]))}</p>
                          {code ? <Code t={t} label={code.label} code={code.code} /> : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
          <ul className="pz-client-notes" data-reveal>
            {copy.notes.map((n) => (
              <li key={n}>
                <Icon name="circle-help" size={16} />
                <span>{withApi(fill(n))}</span>
              </li>
            ))}
            <li>
              <Icon name="file-text" size={16} />
              <span>
                {fill(p.docs)}{' '}
                {facts.docs.map((d, i) => (
                  <span key={d.url}>
                    {i ? ', ' : null}
                    <a href={d.url} rel="noopener nofollow" target="_blank" lang="en" dir="ltr">
                      {d.label}
                    </a>
                  </span>
                ))}
              </span>
            </li>
          </ul>
        </div>
      </section>
      <section className="pz-sec is-band" aria-labelledby="prompts-title">
        <div className="pz-container">
          <SectionHead id="prompts-title" title={fill(p.promptsTitle)} sub={fill(p.promptsSub)} />
          <ul className="pz-prompts" data-stagger>
            {copy.prompts.map((pr) => (
              <li key={pr.text} lang={pr.lang} dir={pr.lang === 'ar' ? 'rtl' : 'ltr'}>
                <Icon name="message-square" size={18} />
                <span>{pr.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="pz-sec" aria-labelledby="can-title">
        <div className="pz-container">
          <SectionHead id="can-title" title={fill(p.canTitle)} sub={fill(p.canSub)} />
          <ul className="pz-checks" data-stagger>
            {t.agentPage.can.items.map((c) => (
              <li key={c.title}>
                <span className="pz-tile-ic">
                  <Icon name={c.icon} size={20} />
                </span>
                <strong>{c.title}</strong>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
          <p className="pz-note" data-reveal>
            <Icon name="shield-check" size={18} />
            {t.agentPage.cannot}
          </p>
        </div>
      </section>
      <section className="pz-sec is-band" aria-labelledby="nets-title">
        <div className="pz-container">
          <SectionHead id="nets-title" title={fill(p.channelsTitle)} sub={fill(p.channelsSub)} />
          <ul className="pz-chgrid" data-stagger>
            {CHANNELS.map((c) => (
              <li key={c.slug}>
                <a className="pz-chtile is-link" href={localePath(t.lang, channelPath(c.slug))}>
                  <img src={c.icon} width={28} height={28} alt="" loading="lazy" />
                  <span>{channelName(t, c)}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="pz-center-text">
            <a className="pz-more-link" href={localePath(t.lang, PATHS.channels)}>
              {t.nav.allChannels}
              <Icon name="arrow-right" className="pz-flip-rtl" />
            </a>
          </p>
        </div>
      </section>
      <section className="pz-sec" aria-labelledby="security-title">
        <div className="pz-container">
          <SectionHead id="security-title" title={fill(p.securityTitle)} />
          <ul className="pz-checks" data-stagger>
            {p.security.map((s) => (
              <li key={s.title}>
                <span className="pz-tile-ic">
                  <Icon name={s.icon} size={20} />
                </span>
                <strong>{fill(s.title)}</strong>
                <p>{fill(s.body)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <FaqSection id="faq" title={fill(p.faqTitle)} items={faq} />
      <section className="pz-sec is-tight" aria-labelledby="related-title">
        <div className="pz-container">
          <h2 id="related-title" className="t-h3 pz-group-title">
            {p.relatedTitle}
          </h2>
          <ul className="pz-chcards">
            {facts.related.map((r) => (
              <li key={r}>
                <ClientCard t={t} c={clientBySlug(r)!} />
              </li>
            ))}
          </ul>
          <p className="pz-center-text">
            <a className="pz-more-link" href={`${localePath(t.lang, PATHS.agent)}#clients`}>
              {p.allClients}
              <Icon name="arrow-right" className="pz-flip-rtl" />
            </a>
          </p>
          <p className="pz-fine pz-center-text">{t.agentPage.works.note}</p>
        </div>
      </section>
      <CTA t={t} title={fill(p.ctaTitle)} body={fill(p.ctaBody)} />
    </Shell>
  );
}
