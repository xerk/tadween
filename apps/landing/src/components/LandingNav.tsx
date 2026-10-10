import type { Dict } from '@/content/types';
import { AI_CLIENTS, KIND_ICON } from '@/lib/aiClients';
import { CHANNELS, type ChannelGroup } from '@/lib/channels';
import { SIGN_IN_URL, SIGN_UP_URL } from '@/lib/config';
import { FEATURE_MENU, featureRefIcon, featureRefPath, type FeatureRef } from '@/lib/features';
import { PATHS, channelPath, clientPath, localePath } from '@/lib/routes';
import { shotSrc } from '@/lib/shots';
import { Icon, cx } from './Icon';
import { Logo } from './Logo';
import { NavController } from './NavController';
import { ThemeToggle } from './ThemeToggle';

const CHANNEL_GROUPS: ChannelGroup[] = ['professional', 'social', 'video', 'community', 'blog'];

/** The site bar: logo, the Features, Channels and Resources mega menus, Pricing, the
    language switch, theme, sign in and trial. Every menu is in the server HTML (so its
    links are crawlable) and starts hidden; NavController opens and closes them. Below
    960px the menus move into a sheet. `altHref` is the same page in the other language;
    `current` is this page's path. */
export function LandingNav({ t, altHref, current }: { t: Dict; altHref: string; current: string }) {
  const lp = (path: string) => localePath(t.lang, path);
  const here = (href: string) => (current === href ? 'page' : current.startsWith(`${href}/`) ? 'true' : undefined);
  const featureNav = (ref: FeatureRef) => (ref === 'agent' ? t.featuresIndex.agentNav : t.features[ref].nav);
  const channelName = (slug: string, fallback: string) => t.channels.items[slug]?.name ?? fallback;

  const trigger = (menu: string, label: string, section?: string) => (
    <li data-menu-hover={menu}>
      <button type="button" className="pz-nav-link" data-menu-trigger={menu} aria-expanded="false" aria-controls={`menu-${menu}`} aria-current={section && here(lp(section)) ? 'true' : undefined}>
        {label}
        <Icon name="chevron-down" size={14} />
      </button>
    </li>
  );

  const external = (on?: boolean) => (on ? { rel: 'noopener', target: '_blank' } : {});

  return (
    <header className="pz-nav" data-nav>
      <div className="pz-container is-wide pz-nav-bar">
        <Logo href={t.base || '/'} label={t.nav.home} />
        <nav aria-label={t.nav.label}>
          <ul className="pz-nav-links">
            {trigger('features', t.nav.features, PATHS.features)}
            {trigger('channels', t.nav.channels, PATHS.channels)}
            {trigger('resources', t.nav.resources)}
            <li>
              <a className="pz-nav-link" href={lp(PATHS.pricing)} aria-current={here(lp(PATHS.pricing))}>
                {t.nav.pricing}
              </a>
            </li>
          </ul>
        </nav>
        <span className="pz-grow" />
        <a className="pz-lang" href={altHref} lang={t.nav.switchTo.lang} hrefLang={t.nav.switchTo.lang} title={t.nav.switchTo.title} aria-label={t.nav.switchTo.title}>
          {t.nav.switchTo.label}
        </a>
        <ThemeToggle label={t.nav.theme} />
        <a className="pz-btn pz-btn-ghost pz-signin" href={SIGN_IN_URL}>
          {t.nav.signIn}
        </a>
        <a className="pz-btn pz-btn-primary" href={SIGN_UP_URL}>
          {t.nav.startTrial}
        </a>
        <button type="button" className="pz-theme pz-burger" data-sheet-trigger aria-expanded="false" aria-controls="site-sheet" aria-label={t.nav.menu} data-label-open={t.nav.menu} data-label-close={t.nav.close}>
          <Icon name="menu" size={20} className="is-menu" />
          <Icon name="x" size={20} className="is-close" />
        </button>
      </div>

      <div className="pz-mega" id="menu-features" data-menu-panel="features" hidden>
        <div className="pz-container is-wide pz-mega-grid">
          <div>
            <ul className="pz-mega-list is-3">
              {FEATURE_MENU.map((ref) => {
                const href = lp(featureRefPath(ref));
                const nav = featureNav(ref);
                return (
                  <li key={ref}>
                    <a className="pz-mega-item" href={href} aria-current={here(href)}>
                      <span className={cx('pz-mega-ic', ref === 'agent' && 'is-smart')}>
                        <Icon name={featureRefIcon(ref)} size={18} />
                      </span>
                      <span>
                        <strong>{nav.label}</strong>
                        {nav.blurb}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="pz-mega-foot">
              <a className="pz-more-link" href={lp(PATHS.features)}>
                {t.nav.allFeatures}
                <Icon name="arrow-right" className="pz-flip-rtl" />
              </a>
            </div>
          </div>
          <a className="pz-mega-feature" href={lp(`${PATHS.features}/board`)}>
            <span className="pz-shot is-bare">
              {(['light', 'dark'] as const).map((theme) => (
                <img key={theme} className={`is-${theme}`} src={shotSrc('board', t.lang, theme)} width={2400} height={1500} alt="" loading="lazy" />
              ))}
            </span>
            <strong>{t.nav.spotlight.title}</strong>
            <span>{t.nav.spotlight.body}</span>
          </a>
        </div>
      </div>

      <div className="pz-mega" id="menu-channels" data-menu-panel="channels" hidden>
        <div className="pz-container is-wide pz-mega-grid">
          <div className="pz-mega-list is-3">
            {CHANNEL_GROUPS.map((g) => (
              <div key={g} className="pz-mega-group">
                <span>{t.channels.index.groups[g]}</span>
                {CHANNELS.filter((c) => c.group === g).map((c) => {
                  const href = lp(channelPath(c.slug));
                  return (
                    <a key={c.slug} className="pz-mega-chan" href={href} aria-current={here(href)}>
                      <img src={c.icon} width={22} height={22} alt="" loading="lazy" />
                      {channelName(c.slug, c.name)}
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
          <a className="pz-mega-feature" href={lp(PATHS.channels)}>
            <strong>{t.channels.index.title}</strong>
            <span>{t.channels.index.sub}</span>
            <span className="pz-more-link">
              {t.nav.allChannels}
              <Icon name="arrow-right" className="pz-flip-rtl" />
            </span>
          </a>
        </div>
      </div>

      <div className="pz-mega" id="menu-resources" data-menu-panel="resources" hidden>
        <div className="pz-container is-wide pz-mega-grid">
          <ul className="pz-mega-list">
            {t.nav.resourceLinks.map((r) => (
              <li key={r.href}>
                <a className="pz-mega-item" href={r.href} {...external(r.external)}>
                  <span className="pz-mega-ic">
                    <Icon name={r.icon} size={18} />
                  </span>
                  <span>
                    <strong>{r.label}</strong>
                    {r.body}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="pz-mega-group is-clients">
            <span>{t.nav.aiClients}</span>
            {AI_CLIENTS.map((c) => {
              const href = lp(clientPath(c.slug));
              return (
                <a key={c.slug} className="pz-mega-chan" href={href} aria-current={here(href)} lang="en" dir="ltr">
                  <Icon name={KIND_ICON[c.kind]} size={18} />
                  {c.name}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pz-sheet" id="site-sheet" data-sheet hidden>
        <details>
          <summary>
            {t.nav.features}
            <Icon name="chevron-down" size={18} />
          </summary>
          <div className="pz-sheet-links">
            {FEATURE_MENU.map((ref) => (
              <a key={ref} href={lp(featureRefPath(ref))}>
                <Icon name={featureRefIcon(ref)} size={18} />
                {featureNav(ref).label}
              </a>
            ))}
            <a href={lp(PATHS.features)}>{t.nav.allFeatures}</a>
          </div>
        </details>
        <details>
          <summary>
            {t.nav.channels}
            <Icon name="chevron-down" size={18} />
          </summary>
          <div className="pz-sheet-links">
            {CHANNELS.map((c) => (
              <a key={c.slug} href={lp(channelPath(c.slug))}>
                <img src={c.icon} width={22} height={22} alt="" loading="lazy" />
                {channelName(c.slug, c.name)}
              </a>
            ))}
            <a href={lp(PATHS.channels)}>{t.nav.allChannels}</a>
          </div>
        </details>
        <details>
          <summary>
            {t.nav.resources}
            <Icon name="chevron-down" size={18} />
          </summary>
          <div className="pz-sheet-links">
            {t.nav.resourceLinks.map((r) => (
              <a key={r.href} href={r.href} {...external(r.external)}>
                <Icon name={r.icon} size={18} />
                {r.label}
              </a>
            ))}
          </div>
        </details>
        <details>
          <summary>
            {t.nav.aiClients}
            <Icon name="chevron-down" size={18} />
          </summary>
          <div className="pz-sheet-links">
            {AI_CLIENTS.map((c) => (
              <a key={c.slug} href={lp(clientPath(c.slug))} lang="en" dir="ltr">
                <Icon name={KIND_ICON[c.kind]} size={18} />
                {c.name}
              </a>
            ))}
            <a href={`${lp(PATHS.agent)}#clients`}>{t.aiClients.page.allClients}</a>
          </div>
        </details>
        <a href={lp(PATHS.pricing)}>{t.nav.pricing}</a>
        <div className="pz-sheet-cta">
          <a className="pz-btn pz-btn-primary pz-btn-lg" href={SIGN_UP_URL}>
            {t.nav.startTrial}
          </a>
          <a className="pz-btn pz-btn-secondary pz-btn-lg" href={SIGN_IN_URL}>
            {t.nav.signIn}
          </a>
        </div>
      </div>
      <NavController />
    </header>
  );
}
