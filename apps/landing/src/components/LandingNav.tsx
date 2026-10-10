import type { Dict } from '@/content/types';
import { SIGN_IN_URL, SIGN_UP_URL } from '@/lib/config';
import { PATHS, clientPath, localePath } from '@/lib/routes';
import { AI_CLIENTS } from '@/lib/aiClients';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { NavController } from './NavController';
import { ThemeToggle } from './ThemeToggle';

/** The site bar: logo, the four main pages (AI agent opens a small menu of the AI tool
    pages, with their marks), the language switch, theme, sign in and trial.
    Below 960px the links move into a sheet that the menu button opens (NavController).
    `altHref` is the same page in the other language; `current` is this page's path. */
export function LandingNav({ t, altHref, current }: { t: Dict; altHref: string; current: string }) {
  const lp = (path: string) => localePath(t.lang, path);
  const here = (href: string) => (current === href ? 'page' : current.startsWith(`${href}/`) ? 'true' : undefined);
  const links = [
    { href: lp(PATHS.features), label: t.nav.features },
    { href: lp(PATHS.channels), label: t.nav.channels },
    { href: lp(PATHS.agent), label: t.nav.agent },
    { href: lp(PATHS.pricing), label: t.nav.pricing },
  ];
  const clients = AI_CLIENTS.map((c) => ({ href: lp(clientPath(c.slug)), name: c.name, logo: c.logo }));

  return (
    <header className="pz-nav" data-nav>
      <div className="pz-container is-wide pz-nav-bar">
        <Logo href={t.base || '/'} label={t.nav.home} />
        <nav aria-label={t.nav.label}>
          <ul className="pz-nav-links">
            {links.map((l) =>
              l.href === lp(PATHS.agent) ? (
                <li key={l.href} className="pz-nav-dd">
                  <a className="pz-nav-link" href={l.href} aria-current={here(l.href) ?? (clients.some((c) => current === c.href) ? 'true' : undefined)} aria-haspopup="true">
                    {l.label}
                    <Icon name="chevron-down" size={14} />
                  </a>
                  <ul className="pz-nav-menu">
                    <li>
                      <a href={l.href} aria-current={here(l.href)}>
                        <span className="pz-nav-menu-ic">
                          <Icon name="sparkles" size={16} />
                        </span>
                        {l.label}
                      </a>
                    </li>
                    {clients.map((c) => (
                      <li key={c.href}>
                        <a href={c.href} aria-current={here(c.href)}>
                          <span className="pz-nav-menu-ic">
                            <img src={c.logo} width={16} height={16} alt="" />
                          </span>
                          <span lang="en" dir="ltr">{c.name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={l.href}>
                  <a className="pz-nav-link" href={l.href} aria-current={here(l.href)}>
                    {l.label}
                  </a>
                </li>
              )
            )}
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

      <div className="pz-sheet" id="site-sheet" data-sheet hidden>
        {links.map((l) => (
          <div key={l.href} className="pz-sheet-group">
            <a href={l.href} aria-current={here(l.href)}>
              {l.label}
            </a>
            {l.href === lp(PATHS.agent)
              ? clients.map((c) => (
                  <a key={c.href} className="pz-sheet-sub" href={c.href} aria-current={here(c.href)}>
                    <img src={c.logo} width={18} height={18} alt="" />
                    <span lang="en" dir="ltr">{c.name}</span>
                  </a>
                ))
              : null}
          </div>
        ))}
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
