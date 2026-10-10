import type { Dict } from '@/content/types';
import { SIGN_IN_URL, SIGN_UP_URL } from '@/lib/config';
import { PATHS, localePath } from '@/lib/routes';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { NavController } from './NavController';
import { ThemeToggle } from './ThemeToggle';

/** The site bar: logo, the four main pages, the language switch, theme, sign in and trial.
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

  return (
    <header className="pz-nav" data-nav>
      <div className="pz-container is-wide pz-nav-bar">
        <Logo href={t.base || '/'} label={t.nav.home} />
        <nav aria-label={t.nav.label}>
          <ul className="pz-nav-links">
            {links.map((l) => (
              <li key={l.href}>
                <a className="pz-nav-link" href={l.href} aria-current={here(l.href)}>
                  {l.label}
                </a>
              </li>
            ))}
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

      <nav className="pz-sheet" id="site-sheet" aria-label={t.nav.label} data-sheet hidden>
        {links.map((l) => (
          <a key={l.href} href={l.href} aria-current={here(l.href)}>
            {l.label}
          </a>
        ))}
        <div className="pz-sheet-cta">
          <a className="pz-btn pz-btn-primary pz-btn-lg" href={SIGN_UP_URL}>
            {t.nav.startTrial}
          </a>
          <a className="pz-btn pz-btn-secondary pz-btn-lg" href={SIGN_IN_URL}>
            {t.nav.signIn}
          </a>
        </div>
      </nav>
      <NavController />
    </header>
  );
}
