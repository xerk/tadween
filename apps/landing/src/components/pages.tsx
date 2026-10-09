import type { ReactNode } from 'react';
import type { ChannelCopy, Dict } from '@/content/types';
import { CHANNELS, MORE_CHANNELS, channelBySlug, type ChannelFacts, type ChannelGroup } from '@/lib/channels';
import { DOCS_API_URL, SIGN_UP_URL } from '@/lib/config';
import { breadcrumbs, faqPage, organization, product, softwareApplication } from '@/lib/jsonld';
import { loadPlans } from '@/lib/plans';
import { PATHS, channelPath, localePath } from '@/lib/routes';
import { ChannelPreview } from './ChannelPreview';
import { FeatureArt } from './FeatureArt';
import { Icon, cx } from './Icon';
import { JsonLd } from './JsonLd';
import { LandingMotion } from './LandingMotion';
import { LandingNav } from './LandingNav';
import { PricingTable } from './PricingTable';
import { AgentDemo, AgentTeaser, ArabicSection, ChannelsSection, CTA, FaqSection, Features, Flow, Footer, Hero, PageHead, Proof, Steps } from './sections';

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
      <LandingMotion rtl={t.dir === 'rtl'} />
    </div>
  );
}

/** A network's name as this language writes it (لينكدإن in Arabic, LinkedIn in English). */
const channelName = (t: Dict, c: ChannelFacts) => t.channels.items[c.slug].name ?? c.name;

const crumbHome = (t: Dict) => ({ name: t.nav.home, href: localePath(t.lang, PATHS.home) });

/** The landing page (LandingExperience in the design system), in either language. */
export async function LandingPage({ t }: { t: Dict }) {
  const { plans, source } = await loadPlans();
  return (
    <Shell t={t} path={PATHS.home} jsonLd={[organization(), softwareApplication(t, plans)]}>
      <Hero t={t} />
      <Proof t={t} />
      <Flow t={t} />
      <Features t={t} />
      <ArabicSection t={t} />
      <ChannelsSection t={t} />
      <AgentTeaser t={t} />
      <Steps t={t} />
      <section className="pz-lsec" id="pricing" aria-labelledby="pricing-title">
        <div className="pz-lsec-head" data-reveal>
          <h2 id="pricing-title" className="title-1">
            {t.pricing.sectionTitle}
          </h2>
          <p className="pz-lsec-sub">{t.pricing.sectionSub}</p>
        </div>
        <div data-reveal>
          <PricingTable p={t.pricing} lang={t.lang} numberLocale={t.numberLocale} plans={plans} source={source} compare={false} faq={false} compareHref={localePath(t.lang, PATHS.pricing)} />
        </div>
      </section>
      <FaqSection id="faq" title={t.homeFaq.title} items={t.homeFaq.items} />
      <CTA t={t} />
    </Shell>
  );
}

/** The pricing page: tiers, the full compare table and the FAQ. */
export async function PricingPage({ t }: { t: Dict }) {
  const { plans, source } = await loadPlans();
  return (
    <Shell t={t} path={PATHS.pricing} jsonLd={[product(t, plans), faqPage(t.pricing.faq)]}>
      <PageHead t={t} title={t.pricing.pageTitle} sub={t.pricing.pageSub} />
      <section className="pz-lsec pz-lsec-tight" aria-label={t.pricing.pageTitle}>
        <PricingTable p={t.pricing} lang={t.lang} numberLocale={t.numberLocale} plans={plans} source={source} />
      </section>
      <CTA t={t} />
    </Shell>
  );
}

export function FeaturesPage({ t }: { t: Dict }) {
  const f = t.featuresPage;
  return (
    <Shell t={t} path={PATHS.features}>
      <PageHead t={t} title={f.title} sub={f.sub} />
      <nav className="pz-jump" aria-label={f.jump}>
        {f.sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            <Icon name={s.icon} size={14} />
            {s.title}
          </a>
        ))}
      </nav>
      {f.sections.map((s, i) => (
        <section key={s.id} id={s.id} className="pz-lsec pz-fsec" aria-labelledby={`${s.id}-title`}>
          <div className={cx('pz-split', i % 2 === 1 && 'is-flip')}>
            <div className="pz-split-copy" data-reveal>
              <span className={cx('pz-feat-icon', s.smart && 'is-smart')}>
                <Icon name={s.icon} size={18} />
              </span>
              <h2 id={`${s.id}-title`} className="title-1">
                {s.title}
              </h2>
              <p className="pz-lsec-sub">{s.body}</p>
              <ul className="pz-plan-list">
                {s.points.map((p) => (
                  <li key={p}>
                    <Icon name="check" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pz-fsec-art" data-reveal data-art>
              <FeatureArt kind={s.art} rtl={t.dir === 'rtl'} />
            </div>
          </div>
        </section>
      ))}
      <CTA t={t} />
    </Shell>
  );
}

/** A code sample with the API base filled in. Code is always left to right. */
function Code({ label, code }: { label: string; code: string }) {
  return (
    <figure className="pz-code">
      <figcaption className="caption">{label}</figcaption>
      <pre dir="ltr" tabIndex={0}>
        <code>{code.replaceAll('{api}', DOCS_API_URL)}</code>
      </pre>
    </figure>
  );
}

export function AgentPage({ t }: { t: Dict }) {
  const a = t.agentPage;
  const path = localePath(t.lang, PATHS.agent);
  return (
    <Shell t={t} path={PATHS.agent} jsonLd={[faqPage(a.faq), breadcrumbs([{ name: crumbHome(t).name, path: crumbHome(t).href }, { name: a.eyebrow, path }])]}>
      <PageHead t={t} eyebrow={a.eyebrow} title={a.title} sub={a.sub} />
      <section className="pz-lsec pz-lsec-tight" aria-label={t.agentTeaser.title}>
        <div className="pz-narrow" data-reveal>
          <AgentDemo t={t} />
        </div>
      </section>
      <section className="pz-lsec" aria-labelledby="can-title">
        <div className="pz-lsec-head" data-reveal>
          <h2 id="can-title" className="title-1">
            {a.can.title}
          </h2>
          <p className="pz-lsec-sub">{a.can.sub}</p>
        </div>
        <div className="pz-feat-grid" data-stagger>
          {a.can.items.map((c) => (
            <div key={c.title} className="pz-feat">
              <span className="pz-feat-icon">
                <Icon name={c.icon} size={18} />
              </span>
              <h3 className="headline">{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
        <p className="pz-note" data-reveal>
          <Icon name="shield-check" size={16} />
          {a.cannot}
        </p>
      </section>
      <section className="pz-lsec pz-band" aria-labelledby="connect-title">
        <div className="pz-split">
          <div className="pz-split-copy" data-reveal>
            <h2 id="connect-title" className="title-1">
              {a.connect.title}
            </h2>
            <p className="pz-lsec-sub">{a.connect.sub}</p>
            <ol className="pz-numlist">
              {a.connect.steps.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <span>{s.body}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="pz-codes" data-reveal>
            <Code label={a.connect.endpointLabel} code="{api}/mcp" />
            <Code label={a.connect.keyLabel} code="Authorization: Bearer YOUR_API_KEY" />
            <p className="caption pz-muted">{a.connect.clientsNote}</p>
          </div>
        </div>
      </section>
      <section className="pz-lsec" aria-labelledby="prompts-title">
        <div className="pz-lsec-head" data-reveal>
          <h2 id="prompts-title" className="title-1">
            {a.prompts.title}
          </h2>
          <p className="pz-lsec-sub">{a.prompts.sub}</p>
        </div>
        <ul className="pz-prompts" data-stagger>
          {a.prompts.items.map((p) => (
            <li key={p.text} lang={p.lang} dir={p.lang === 'ar' ? 'rtl' : 'ltr'} className={cx(p.lang === 'ar' && 'is-ar-text')}>
              <Icon name="message-square" size={16} />
              {p.text}
            </li>
          ))}
        </ul>
      </section>
      <section className="pz-lsec" aria-labelledby="inapp-title">
        <div className="pz-split">
          <div className="pz-split-copy" data-reveal>
            <h2 id="inapp-title" className="title-1">
              {a.inApp.title}
            </h2>
            <p className="pz-lsec-sub">{a.inApp.sub}</p>
            <ul className="pz-plan-list">
              {a.inApp.points.map((p) => (
                <li key={p}>
                  <Icon name="check" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="pz-fsec-art" data-reveal data-art>
            <FeatureArt kind="agent" rtl={t.dir === 'rtl'} />
          </div>
        </div>
      </section>
      <section className="pz-lsec" id="connectors" aria-labelledby="connectors-title">
        <div className="pz-lsec-head" data-reveal>
          <span className="pz-placeholder caption pz-center">{a.connectors.badge}</span>
          <h2 id="connectors-title" className="title-1">
            {a.connectors.title}
          </h2>
          <p className="pz-lsec-sub">{a.connectors.sub}</p>
        </div>
        <ul className="pz-connectors" data-stagger>
          {a.connectors.items.map((c) => (
            <li key={c.title}>
              <span className="pz-feat-icon">
                <Icon name={c.icon} size={18} />
              </span>
              <span>
                <strong>{c.title}</strong>
                <span>{c.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="caption pz-muted pz-center-text">{a.connectors.planNote}</p>
      </section>
      <FaqSection id="faq" title={t.pricing.faqTitle} items={a.faq} />
      <CTA t={t} />
    </Shell>
  );
}

export function DevelopersPage({ t }: { t: Dict }) {
  const d = t.developersPage;
  const bullets = (points: string[]) => (
    <ul className="pz-plan-list">
      {points.map((p) => (
        <li key={p}>
          <Icon name="check" />
          {p}
        </li>
      ))}
    </ul>
  );
  return (
    <Shell t={t} path={PATHS.developers}>
      <PageHead t={t} eyebrow={d.eyebrow} title={d.title} sub={d.sub} />
      <section className="pz-lsec" id="api" aria-labelledby="api-title">
        <div className="pz-lsec-head" data-reveal>
          <h2 id="api-title" className="title-1">
            {d.api.title}
          </h2>
          <p className="pz-lsec-sub">{d.api.sub}</p>
        </div>
        <p className="pz-note" data-reveal>
          <Icon name="key" size={16} />
          {d.api.authNote}
        </p>
        <div className="pz-endpoints" data-stagger>
          {d.api.groups.map((g) => (
            <div key={g.title} className="pz-endpoint-group">
              <h3 className="headline">{g.title}</h3>
              <table>
                <tbody>
                  {g.endpoints.map(([method, path, what]) => (
                    <tr key={`${method} ${path}`}>
                      <td>
                        <span className={cx('pz-method', `is-${method.toLowerCase()}`)}>{method}</span>
                      </td>
                      <td dir="ltr">
                        <code>{path}</code>
                      </td>
                      <td>{what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
      <section className="pz-lsec pz-band" id="mcp" aria-labelledby="mcp-title">
        <div className="pz-lsec-head" data-reveal>
          <h2 id="mcp-title" className="title-1">
            {d.mcp.title}
          </h2>
          <p className="pz-lsec-sub">{d.mcp.sub}</p>
        </div>
        <div className="pz-codes is-grid" data-stagger>
          {d.mcp.samples.map((s) => (
            <Code key={s.label} label={s.label} code={s.code} />
          ))}
        </div>
      </section>
      <section className="pz-lsec" aria-label={d.webhooks.title}>
        <div className="pz-cols3" data-stagger>
          {[
            { id: 'webhooks', icon: 'webhook' as const, block: d.webhooks },
            { id: 'automate', icon: 'zap' as const, block: d.automate },
            { id: 'limits', icon: 'shield-check' as const, block: d.limits },
          ].map(({ id, icon, block }) => (
            <div key={id} id={id} className="pz-feat">
              <span className="pz-feat-icon">
                <Icon name={icon} size={18} />
              </span>
              <h2 className="headline">{block.title}</h2>
              <p>{block.sub}</p>
              {bullets(block.points)}
            </div>
          ))}
        </div>
      </section>
      <CTA t={t} />
    </Shell>
  );
}

const GROUPS: ChannelGroup[] = ['professional', 'social', 'video', 'community', 'blog'];

export function ChannelsIndexPage({ t }: { t: Dict }) {
  const c = t.channels;
  const path = localePath(t.lang, PATHS.channels);
  return (
    <Shell t={t} path={PATHS.channels} jsonLd={[breadcrumbs([{ name: crumbHome(t).name, path: crumbHome(t).href }, { name: t.footer.channelsTitle, path }])]}>
      <PageHead t={t} title={c.index.title} sub={c.index.sub} />
      {GROUPS.map((g) => (
        <section key={g} className="pz-lsec pz-lsec-tight" aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`} className="title-2 pz-group-title">
            {c.index.groups[g]}
          </h2>
          <ul className="pz-chcards" data-stagger>
            {CHANNELS.filter((ch) => ch.group === g).map((ch) => (
              <li key={ch.slug}>
                <a className="pz-chcard" href={localePath(t.lang, channelPath(ch.slug))}>
                  <img src={ch.icon} width={36} height={36} alt="" loading="lazy" />
                  <span>
                    <strong>{channelName(t, ch)}</strong>
                    <span>{c.items[ch.slug].h1}</span>
                  </span>
                  <Icon name="chevron-right" className="pz-flip-rtl pz-muted" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="pz-lsec pz-lsec-tight" aria-labelledby="g-more">
        <h2 id="g-more" className="title-2 pz-group-title">
          {c.index.more.title}
        </h2>
        <p className="pz-muted pz-group-sub">{c.index.more.sub}</p>
        <ul className="pz-chgrid is-plain">
          {MORE_CHANNELS.map((m) => (
            <li key={m.name}>
              <span className="pz-chtile">
                <img src={m.icon} width={28} height={28} alt="" loading="lazy" />
                <span>{m.name}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <CTA t={t} />
    </Shell>
  );
}

/** The two questions every channel page answers, filled in from the facts, then the
    network's own questions. */
function channelFaq(t: Dict, facts: ChannelFacts, copy: ChannelCopy) {
  const p = t.channels.page;
  const fill = (s: string) => s.replaceAll('{name}', channelName(t, facts)).replaceAll('{limit}', new Intl.NumberFormat(t.numberLocale).format(facts.limit));
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
  const path = localePath(t.lang, channelPath(slug));
  const crumbs = [crumbHome(t), { name: t.footer.channelsTitle, href: localePath(t.lang, PATHS.channels) }, { name: channelName(t, facts), href: path }];
  const faq = channelFaq(t, facts, copy);
  const comments = facts.comments === true ? p.commentsValue.yes : facts.comments === 'text-only' ? p.commentsValue.text : p.commentsValue.no;
  const fill = (s: string) => s.replaceAll('{name}', channelName(t, facts));
  return (
    <Shell t={t} path={channelPath(slug)} jsonLd={[faqPage(faq), breadcrumbs(crumbs.map((c) => ({ name: c.name, path: c.href })))]}>
      <header className="pz-phead pz-chhead">
        <div className="pz-lsec-head">
          <nav className="pz-crumbs" aria-label={t.nav.breadcrumb}>
            <ol>
              {crumbs.map((c, i) => (
                <li key={c.href}>{i < crumbs.length - 1 ? <a href={c.href}>{c.name}</a> : <span aria-current="page">{c.name}</span>}</li>
              ))}
            </ol>
          </nav>
          <span className="pz-chbadge">
            <img src={facts.icon} width={40} height={40} alt="" />
          </span>
          <h1 className="display" data-hero-in>
            {copy.h1}
          </h1>
          <p className="pz-lsec-sub" data-hero-in>
            {copy.intro}
          </p>
          <p className="pz-hero-cta pz-center" data-hero-in>
            <a className="pz-btn pz-btn-primary pz-btn-lg" href={SIGN_UP_URL}>
              {p.start}
              <Icon name="arrow-right" className="pz-flip-rtl" />
            </a>
          </p>
        </div>
      </header>
      <section className="pz-lsec pz-lsec-tight" aria-labelledby="facts-title">
        <div className="pz-split">
          <div className="pz-split-copy" data-reveal>
            <h2 id="facts-title" className="title-2">
              {p.factsTitle}
            </h2>
            <dl className="pz-facts">
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
            {copy.limitNote ? <p className="caption pz-muted">{copy.limitNote}</p> : null}
            <h3 className="headline">{p.formatsTitle}</h3>
            <ul className="pz-plan-list">
              {copy.formats.map((f) => (
                <li key={f}>
                  <Icon name="check" />
                  {f}
                </li>
              ))}
            </ul>
            <h3 className="headline">{p.mediaTitle}</h3>
            <p className="pz-muted pz-media-rule">{copy.media}</p>
          </div>
          <div data-reveal>
            <ChannelPreview t={t} facts={facts} copy={copy} />
          </div>
        </div>
      </section>
      <section className="pz-lsec" aria-labelledby="why-title">
        <div className="pz-lsec-head" data-reveal>
          <h2 id="why-title" className="title-1">
            {p.featuresTitle}
          </h2>
        </div>
        <div className="pz-feat-grid" data-stagger>
          {copy.features.map((f) => (
            <div key={f.title} className="pz-feat">
              <span className="pz-feat-icon">
                <Icon name="sparkles" size={18} />
              </span>
              <h3 className="headline">{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
        <div className="pz-feat-grid is-4" data-stagger>
          {p.shared.map((f) => (
            <div key={f.title} className="pz-feat is-quiet">
              <span className="pz-feat-icon">
                <Icon name={f.icon} size={18} />
              </span>
              <h3 className="headline">{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>
      <FaqSection id="faq" title={p.faqTitle} items={faq} />
      <section className="pz-lsec pz-lsec-tight" aria-labelledby="related-title">
        <h2 id="related-title" className="title-2 pz-group-title">
          {p.relatedTitle}
        </h2>
        <ul className="pz-chcards">
          {facts.related.map((r) => {
            const rc = channelBySlug(r)!;
            return (
              <li key={r}>
                <a className="pz-chcard" href={localePath(t.lang, channelPath(r))}>
                  <img src={rc.icon} width={36} height={36} alt="" loading="lazy" />
                  <span>
                    <strong>{channelName(t, rc)}</strong>
                    <span>{t.channels.items[r].h1}</span>
                  </span>
                  <Icon name="chevron-right" className="pz-flip-rtl pz-muted" />
                </a>
              </li>
            );
          })}
        </ul>
        <p className="pz-center-text">
          <a className="pz-more-link" href={localePath(t.lang, PATHS.channels)}>
            {t.channelsSection.all}
            <Icon name="arrow-right" className="pz-flip-rtl" />
          </a>
        </p>
      </section>
      <CTA t={t} title={fill(p.ctaTitle)} body={fill(p.ctaBody)} />
    </Shell>
  );
}

