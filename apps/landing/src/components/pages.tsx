import type { ReactNode } from 'react';
import type { ChannelCopy, Dict } from '@/content/types';
import { AI_CLIENTS, KIND_ICON, MCP_ENDPOINTS, MCP_TOOLS, MORE_AI_CLIENTS, clientBySlug, type AiClientFacts, type ClientKind } from '@/lib/aiClients';
import { CHANNELS, MORE_CHANNELS, OTHER_CHANNELS, channelBySlug, networkBySlug, type ChannelFacts, type ChannelGroup } from '@/lib/channels';
import { DOCS_API_URL } from '@/lib/config';
import { FEATURES } from '@/lib/features';
import { breadcrumbs, faqPage, organization, softwareApplication } from '@/lib/jsonld';
import { loadPlans } from '@/lib/plans';
import { FEATURE_SLUGS, PATHS, channelPath, clientPath, localePath } from '@/lib/routes';
import { CHANNEL_SHOT, channelShotSrc } from '@/lib/shots';
import { CopyButton } from './CopyButton';
import { Icon, cx } from './Icon';
import { JsonLd } from './JsonLd';
import { LandingMotion } from './LandingMotion';
import { LandingNav } from './LandingNav';
import { PricingTable } from './PricingTable';
import { AgentChat, AgentTeaser, AllFeatures, ArabicSection, CheckList, CTA, Eyebrow, FaqSection, FeatureRow, Footer, Hero, NetStrip, PageHead, ProductShot, SectionHead, Steps, TrialButtons, networkName } from './sections';
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

const crumbHome = (t: Dict) => ({ name: t.nav.home, href: localePath(t.lang, PATHS.home) });

/** Breadcrumb trail from home to `page`, as the page shows it and as BreadcrumbList data. */
const trail = (t: Dict, ...pages: { name: string; href: string }[]) => [crumbHome(t), ...pages];
const trailLd = (crumbs: { name: string; href: string }[]) => breadcrumbs(crumbs.map((c) => ({ name: c.name, path: c.href })));

/** Fills {name} and {limit} in a channel page template. */
const fillChannel = (t: Dict, facts: ChannelFacts) => (s: string) =>
  s.replaceAll('{name}', networkName(t, facts.slug)).replaceAll('{limit}', new Intl.NumberFormat(t.numberLocale).format(facts.limit));

/** A link card to a channel page, used on the index and under related channels. */
function ChannelCard({ t, c }: { t: Dict; c: ChannelFacts }) {
  return (
    <a className="pz-chcard" href={localePath(t.lang, channelPath(c.slug))}>
      <img src={c.icon} width={40} height={40} alt="" loading="lazy" />
      <span>
        <strong>{networkName(t, c.slug)}</strong>
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
    <Shell t={t} path={PATHS.home} jsonLd={[organization(), softwareApplication(t)]}>
      <Hero t={t} />
      <ProductShot t={t} />
      <NetStrip t={t} />
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
    // No offers in structured data: each visitor sees one price, in their own currency.
    <Shell t={t} path={PATHS.pricing} jsonLd={[faqPage(t.pricing.faq)]}>
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

/** /features: a section per tool (anchor #<slug>), the bigger ones beside one screenshot and
    the rest as icon and words, then the AI agent, one question per tool (FAQPage data) and
    the call to action. */
export function FeaturesPage({ t }: { t: Dict }) {
  const f = t.featuresIndex;
  const crumbs = trail(t, { name: t.nav.features, href: localePath(t.lang, PATHS.features) });
  const faq = FEATURE_SLUGS.map((slug) => t.features[slug].faq);
  const withShot = FEATURE_SLUGS.filter((slug) => FEATURES[slug].shot);
  const small = FEATURE_SLUGS.filter((slug) => !FEATURES[slug].shot);
  return (
    <Shell t={t} path={PATHS.features} jsonLd={[faqPage(faq), trailLd(crumbs)]}>
      <PageHead t={t} crumbs={crumbs} title={f.title} sub={f.sub}>
        <TrialButtons t={t} primary={t.featurePage.start} />
      </PageHead>
      <section className="pz-sec" aria-label={f.title}>
        <div className="pz-container pz-rows">
          {withShot.map((slug, i) => {
            const c = t.features[slug];
            return <FeatureRow key={slug} t={t} id={slug} kicker={c.nav.label} icon={FEATURES[slug].icon} title={c.title} body={c.body} points={c.points} shot={FEATURES[slug].shot!} flip={i % 2 === 1} />;
          })}
        </div>
      </section>
      <section className="pz-sec is-band">
        <div className="pz-container">
          <div className="pz-pair" data-stagger>
            {small.map((slug) => {
              const c = t.features[slug];
              return (
                <div key={slug} id={slug} className="pz-panel">
                  <span className="pz-kicker">
                    <Icon name={FEATURES[slug].icon} size={16} />
                    {c.nav.label}
                  </span>
                  <h2 className="t-h3">{c.title}</h2>
                  <p className="t-body">{c.body}</p>
                  <CheckList items={c.points} />
                </div>
              );
            })}
            <div id="agent" className="pz-panel">
              <span className="pz-kicker is-smart">
                <Icon name="bot" size={16} />
                {f.agentNav.label}
              </span>
              <h2 className="t-h3">{t.agentTeaser.title}</h2>
              <p className="t-body">{t.agentTeaser.sub}</p>
              <a className="pz-more-link" href={localePath(t.lang, PATHS.agent)}>
                {t.featurePage.agentLink}
                <Icon name="arrow-right" className="pz-flip-rtl" />
              </a>
            </div>
          </div>
        </div>
      </section>
      <FaqSection id="faq" title={t.featurePage.faqTitle} items={faq} />
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
    the in-app agent, what it can do, connectors to come and questions. */
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
          <div className="pz-also" data-reveal>
            <h3 className="t-h3">{a.works.also}</h3>
            <p lang="en" dir="ltr">
              {MORE_AI_CLIENTS.map((c) => c.name).join(' · ')}
            </p>
            <p className="t-body">
              {a.works.alsoNote}{' '}
              <a className="pz-more-link" href="#connect">
                {a.works.alsoLink}
                <Icon name="arrow-right" className="pz-flip-rtl" />
              </a>
            </p>
          </div>
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
                {c.guides.length ? (
                  <p className="pz-fine">
                    {a.connect.guide}{' '}
                    {c.guides.map((slug, i) => (
                      <span key={slug}>
                        {i ? ', ' : null}
                        <a href={localePath(t.lang, clientPath(slug))} lang="en" dir="ltr">
                          {clientBySlug(slug)!.name}
                        </a>
                      </span>
                    ))}
                  </p>
                ) : null}
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
                {OTHER_CHANNELS.filter((ch) => ch.group === g).map((ch) => (
                  <li key={ch.slug} id={ch.slug}>
                    <span className="pz-chcard is-static">
                      <img src={ch.icon} width={40} height={40} alt="" loading="lazy" />
                      <span>
                        <strong>{networkName(t, ch.slug)}</strong>
                        <span>{c.others[ch.slug].note}</span>
                      </span>
                    </span>
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
  const crumbs = trail(t, { name: t.footer.channelsTitle, href: localePath(t.lang, PATHS.channels) }, { name: networkName(t, facts.slug), href: localePath(t.lang, channelPath(slug)) });
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
function ClientCard({ t, c }: { t: Dict; c: AiClientFacts }) {
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


/** Where a network's tile links: its page, or its place on the channels overview. */
const netHref = (t: Dict, slug: string) => localePath(t.lang, channelBySlug(slug) ? channelPath(slug) : `${PATHS.channels}#${slug}`);

/** A network's icon. Without `alt` it is decorative (its name is written next to it or in a
    label); pass the name where the icon alone says which channel it is. */
function NetIcon({ slug, size = 20, alt = '' }: { slug: string; size?: number; alt?: string }) {
  return <img src={networkBySlug(slug)!.icon} width={size} height={size} alt={alt} loading="lazy" />;
}

/** The channels floating around the chat in an AI client's hero. */
const HERO_FLOAT = ['linkedin', 'linkedin-page', 'x', 'instagram', 'facebook', 'tiktok'];

/** The orbit: the channels with a page and the main others close in, the rest further out. */
const ORBIT_INNER = ['linkedin', 'linkedin-page', 'x', 'instagram', 'facebook', 'tiktok', 'threads', 'youtube'];
const ORBIT_OUTER = OTHER_CHANNELS.map((c) => c.slug).filter((s) => !ORBIT_INNER.includes(s));

/** Every network with an icon, linked ones first, for the channels grid. */
const ALL_NETS = [...CHANNELS.map((c) => c.slug), ...OTHER_CHANNELS.map((c) => c.slug)];

/** A ring of linked channel icons, placed around the centre by angle. */
function OrbitRing({ t, slugs, ring }: { t: Dict; slugs: string[]; ring: 'inner' | 'outer' }) {
  return (
    <ul className={`pz-orbit-ring is-${ring}`}>
      {slugs.map((slug, i) => (
        <li key={slug} style={{ ['--a' as string]: `${(360 / slugs.length) * i + (ring === 'outer' ? 15 : 0)}deg` }}>
          <a href={netHref(t, slug)} aria-label={networkName(t, slug)} title={networkName(t, slug)}>
            <NetIcon slug={slug} size={28} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** A step card's header: its number, its label and a note on the far side. */
function StepTop({ t, n, label, meta, live }: { t: Dict; n: number; label: string; meta: string; live?: boolean }) {
  return (
    <div className="pz-step-top">
      <span className="pz-panel-n">{new Intl.NumberFormat(t.numberLocale).format(n)}</span>
      <strong>{label}</strong>
      <span className={cx('pz-step-meta', live && 'is-live')}>
        {live ? <i aria-hidden="true" /> : <Icon name="clock" size={14} />}
        {meta}
      </span>
    </div>
  );
}

/** A table cell: addresses are code, always left to right. */
const CompareCell = ({ text }: { text: string }) =>
  text.startsWith('{api}') ? (
    <code dir="ltr" className="pz-inline-code">
      {withApi(text)}
    </code>
  ) : (
    <>{text}</>
  );

/** One AI client's page, in the same order as the reference layout studied in
    docs/tadween/ai-pages-postiz-breakdown.md: a hero with the client chatting to Tadween, the
    Connect and Ask cards with the numbered steps, the channel orbit, a comparison table, what it
    can do, the MCP server, example requests, every channel, the client beside its siblings,
    pricing, security and troubleshooting, questions (FAQPage data), related pages and the call
    to action. Client names are text with a neutral glyph; no client logo is drawn. */
export function AiClientPage({ t, slug }: { t: Dict; slug: string }) {
  const facts = clientBySlug(slug)!;
  const copy = t.aiClients.items[slug];
  const p = t.aiClients.page;
  const lead = facts.methods[0];
  const fill = (s: string) => s.replaceAll('{name}', facts.name).replaceAll('{n}', new Intl.NumberFormat(t.numberLocale).format(lead.steps.length));
  const path = clientPath(slug);
  const agentHref = `${localePath(t.lang, PATHS.agent)}#clients`;
  const crumbs = trail(t, { name: t.agentPage.eyebrow, href: localePath(t.lang, PATHS.agent) }, { name: facts.name, href: localePath(t.lang, path) });
  const faq = [...copy.faq, ...p.sharedFaq].map((f) => ({ title: fill(f.title), content: withApi(fill(f.content)) }));
  const leadCode = lead.steps.find((s) => s !== null);
  const leadWords = copy.methods[lead.auth]!;
  const versusHref = (href: string) => (href === 'self' ? null : href === 'agent' ? agentHref : localePath(t.lang, clientPath(href)));
  return (
    <Shell t={t} path={path} jsonLd={[faqPage(faq), trailLd(crumbs)]}>
      <div className="pz-aipage">
        <section className="pz-aihero" aria-labelledby="client-title">
          <div className="pz-container pz-hero-grid">
            <div className="pz-hero-copy">
              <nav className="pz-crumbs is-start" aria-label={t.nav.breadcrumb}>
                <ol>
                  {crumbs.map((c, i) => (
                    <li key={c.href}>{i < crumbs.length - 1 ? <a href={c.href}>{c.name}</a> : <span aria-current="page">{c.name}</span>}</li>
                  ))}
                </ol>
              </nav>
              <span className="pz-aichip" data-hero-in>
                <span className="pz-aichip-ic">
                  <Icon name={KIND_ICON[facts.kind]} size={16} />
                </span>
                {fill(p.eyebrow)}
              </span>
              <h1 id="client-title" className="display" data-hero-in>
                {copy.h1}
              </h1>
              <ul className="pz-aibullets" data-hero-in>
                {copy.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <div data-hero-in>
                <TrialButtons t={t} primary={p.start} secondaryHref="#connect" secondary={fill(p.stepsLink)} />
              </div>
              <p className="pz-aismall" data-hero-in>
                {fill(p.smallPrint).replace('{updated}', p.updated)} <a href={agentHref}>{p.smallPrintLink}</a>.
              </p>
            </div>
            <div className="pz-aihero-art" data-hero-in>
              <ul className="pz-float" aria-hidden="true">
                {HERO_FLOAT.map((s) => (
                  <li key={s}>
                    <NetIcon slug={s} size={26} />
                  </li>
                ))}
              </ul>
              <AgentChat t={t} demo={copy.demo} frame={{ title: facts.name, online: fill(p.frameOnline), icon: KIND_ICON[facts.kind], input: fill(p.frameInput) }} />
            </div>
          </div>
        </section>

        <section className="pz-sec" id="connect" aria-labelledby="connect-title">
          <div className="pz-container">
            <SectionHead id="connect-title" start title={fill(p.connectTitle)} sub={fill(p.connectSub)} />
            <div className="pz-pair" data-stagger>
              <div className="pz-panel pz-step-card">
                <StepTop t={t} n={1} label={p.connectLabel} meta={p.connectTime} />
                <h3 className="t-h3">{copy.connect.title}</h3>
                <p className="t-body">{copy.connect.body}</p>
                {leadCode ? <Code t={t} label={leadCode.label} code={leadCode.code} /> : null}
                <ul className="pz-client-notes">
                  {copy.notes.map((n) => (
                    <li key={n}>
                      <Icon name="circle-help" size={16} />
                      <span>{n}</span>
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
              <div className="pz-panel pz-step-card">
                <StepTop t={t} n={2} label={p.askLabel} meta={p.askLive} live />
                <h3 className="t-h3">{fill(p.askTitle)}</h3>
                <p className="t-body">{fill(p.askBody)}</p>
                <div className="pz-askchat" data-art>
                  <p className="pz-chat-msg" dir="auto">
                    {copy.ask.prompt}
                  </p>
                  <div className="pz-askchat-reply" data-step style={{ ['--d' as string]: '300ms' }}>
                    <span className="pz-tile-ic" aria-hidden="true">
                      <Icon name={KIND_ICON[facts.kind]} size={16} />
                    </span>
                    <div>
                      <p dir="auto">{copy.ask.reply}</p>
                      <span className="pz-via">
                        {p.via}
                        {copy.ask.nets.map((n) => (
                          <NetIcon key={n} slug={n} size={16} alt={networkName(t, n)} />
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pz-alsotry">
                  <span className="pz-fine">{p.alsoTry}</span>
                  <ul className="pz-chips">
                    {copy.alsoTry.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <ol className="pz-steps is-row is-flow" data-stagger aria-label={leadWords.how}>
              {leadWords.steps.map((s) => (
                <li key={s}>
                  <p>{s}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="pz-orbit-band" aria-labelledby="orbit-title">
          <div className="pz-container">
            <div className="pz-sec-head" data-reveal>
              <h2 id="orbit-title" className="t-h2">
                {p.orbitTitle}
              </h2>
              <p className="t-lead">{fill(p.orbitSub)}</p>
            </div>
            <div className="pz-orbit" data-reveal>
              <span className="pz-orbit-core">
                <img src="/logo.svg" width={64} height={64} alt="Tadween" />
              </span>
              <OrbitRing t={t} slugs={ORBIT_INNER} ring="inner" />
              <OrbitRing t={t} slugs={ORBIT_OUTER} ring="outer" />
            </div>
          </div>
        </section>

        <section className="pz-sec" aria-labelledby="compare-title">
          <div className="pz-container">
            <SectionHead id="compare-title" start title={copy.compare.title} sub={copy.compare.sub} />
            <div className="pz-compare-scroll" data-reveal>
              <table className="pz-compare-table is-text">
                <thead>
                  <tr>
                    {copy.compare.head.map((h, i) => (
                      <th key={i} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {copy.compare.rows.map(([label, ...cells]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {cells.map((c, i) => (
                        <td key={i}>
                          <CompareCell text={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="pz-fine pz-aifine">{copy.compare.note}</p>
            {facts.methods.slice(1).map((m) => {
              const words = copy.methods[m.auth]!;
              return (
                <div key={m.auth} className="pz-panel pz-method-panel" data-reveal>
                  <span className={cx('pz-method', m.auth === 'key' && 'is-key')}>
                    <Icon name={m.auth === 'key' ? 'key' : 'shield-check'} size={14} />
                    {words.label}
                  </span>
                  <h3 className="t-h3">{p.otherMethod}</h3>
                  <ol className="pz-mini-steps is-code">
                    {m.steps.map((code, i) => (
                      <li key={i}>
                        <div>
                          <p>{words.steps[i]}</p>
                          {code ? <Code t={t} label={code.label} code={code.code} /> : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        <section className="pz-sec is-ruled" aria-labelledby="can-title">
          <div className="pz-container">
            <SectionHead id="can-title" start title={fill(p.canTitle)} sub={p.canSub} />
            <ul className="pz-fcards" data-stagger>
              {t.agentPage.can.items.map((c) => (
                <li key={c.title}>
                  <span className="pz-tile-ic">
                    <Icon name={c.icon} size={20} />
                  </span>
                  <h3>{c.title}</h3>
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

        <section className="pz-sec is-ruled" aria-labelledby="mcp-title">
          <div className="pz-container">
            <SectionHead id="mcp-title" start title={p.mcpTitle} sub={fill(p.mcpSub)} />
            <div className="pz-panel pz-split" data-reveal>
              <div className="pz-split-copy">
                <h3 className="t-h3">{fill(p.mcpCardTitle)}</h3>
                <p className="t-body">{fill(p.mcpCardBody)}</p>
                <CheckList items={p.mcpPoints.map(fill)} />
              </div>
              <figure className="pz-code is-tools">
                <figcaption>
                  <span className="pz-shot-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>{p.mcpCodeLabel}</span>
                </figcaption>
                <dl>
                  {facts.methods.map((m) => (
                    <div key={m.auth} className="is-endpoint">
                      <dt dir="ltr">{withApi(MCP_ENDPOINTS[m.auth])}</dt>
                      <dd>{copy.methods[m.auth]!.label}</dd>
                    </div>
                  ))}
                  {MCP_TOOLS.map((tool) => (
                    <div key={tool}>
                      <dt dir="ltr">{tool}</dt>
                      <dd>{p.mcpTools[tool]}</dd>
                    </div>
                  ))}
                </dl>
              </figure>
            </div>
          </div>
        </section>

        <section className="pz-sec is-ruled" aria-labelledby="prompts-title">
          <div className="pz-container">
            <SectionHead id="prompts-title" start title={fill(p.promptsTitle)} sub={fill(p.promptsSub)} />
            <ul className="pz-pcards" data-stagger>
              {copy.prompts.map((pr) => (
                <li key={pr.text}>
                  <div className="pz-pcard-top">
                    <span className="pz-kicker">{pr.tag}</span>
                    <span className="pz-pcard-nets">
                      {pr.nets.map((n) => (
                        <NetIcon key={n} slug={n} size={18} alt={networkName(t, n)} />
                      ))}
                    </span>
                  </div>
                  <h3>{pr.title}</h3>
                  <p className="pz-pcard-quote" lang={pr.lang} dir={pr.lang === 'ar' ? 'rtl' : 'ltr'}>
                    {pr.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="pz-sec is-ruled" aria-labelledby="nets-title">
          <div className="pz-container">
            <SectionHead id="nets-title" start title={fill(p.channelsTitle)} sub={fill(p.channelsSub)} />
            <ul className="pz-chgrid is-dense" data-stagger>
              {ALL_NETS.map((s) => (
                <li key={s}>
                  <a className="pz-chtile is-link" href={netHref(t, s)}>
                    <NetIcon slug={s} size={24} />
                    <span>{networkName(t, s)}</span>
                  </a>
                </li>
              ))}
              {MORE_CHANNELS.map((c) => (
                <li key={c.name}>
                  <span className="pz-chtile">
                    <img src={c.icon} width={24} height={24} alt="" loading="lazy" />
                    <span lang="en" dir="ltr">
                      {c.name}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="pz-fine pz-aifine">{fill(p.channelsNote)}</p>
          </div>
        </section>

        <section className="pz-sec is-ruled" aria-labelledby="versus-title">
          <div className="pz-container">
            <SectionHead id="versus-title" start title={copy.versus.title} sub={copy.versus.sub} />
            <ul className="pz-fcards is-versus" data-stagger>
              {copy.versus.items.map((v) => {
                const href = versusHref(v.href);
                return (
                  <li key={v.name} className={cx(!href && 'is-current')}>
                    {href ? null : <span className="pz-vtag">{p.thisPage}</span>}
                    <h3>
                      <bdi lang="en">{href ? <a href={href}>{v.name}</a> : v.name}</bdi>
                    </h3>
                    <p>{v.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="pz-sec is-ruled" aria-labelledby="help-title">
          <div className="pz-container">
            <SectionHead id="help-title" start title={p.helpTitle} />
            <ul className="pz-fcards" data-stagger>
              <li>
                <h3>{p.costTitle}</h3>
                <p>{fill(p.costBody)}</p>
                <a className="pz-more-link" href={localePath(t.lang, PATHS.pricing)}>
                  {p.costLink}
                  <Icon name="arrow-right" className="pz-flip-rtl" />
                </a>
              </li>
              <li>
                <h3>{p.securityTitle}</h3>
                <p>{fill(p.securityBody)}</p>
              </li>
              <li>
                <h3>{p.troubleTitle}</h3>
                <CheckList items={copy.trouble} />
              </li>
            </ul>
          </div>
        </section>

        <FaqSection id="faq" title={fill(p.faqTitle)} items={faq} wide className="is-ruled" />

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
            <p className="pz-fine pz-aifine">
              {p.relatedLabel} <a href={agentHref}>{p.allClients}</a>, <a href={localePath(t.lang, PATHS.channels)}>{t.nav.allChannels}</a>,{' '}
              <a href={localePath(t.lang, PATHS.pricing)}>{t.nav.pricing}</a>. {p.updated} {t.agentPage.works.note}
            </p>
          </div>
        </section>
        <CTA t={t} title={fill(p.ctaTitle)} body={fill(p.ctaBody)} visual={<Shot t={t} id="calendar-preview" />} />
      </div>
    </Shell>
  );
}
