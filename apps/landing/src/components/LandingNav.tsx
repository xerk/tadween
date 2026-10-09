import type { Dict } from '@/content/types';
import { SIGN_IN_URL, SIGN_UP_URL } from '@/lib/config';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

/** Translucent top bar: logo, page links, language switch, theme, sign in and trial.
    `altHref` is the same page in the other language; `current` is this page's path.
    Below 900px the links move into a disclosure menu (no script needed). */
export function LandingNav({ t, altHref, current }: { t: Dict; altHref: string; current?: string }) {
  const other = t.nav.switchTo;
  const isCurrent = (href: string) => current === href || (!!current && current.startsWith(`${href}/`));
  const links = t.nav.links.map((l) => (
    <a key={l.href} href={l.href} aria-current={isCurrent(l.href) ? 'page' : undefined}>
      {l.label}
    </a>
  ));
  return (
    <header className="pz-lnav">
      <Logo href={t.base || '/'} label={t.nav.home} />
      <nav className="pz-lnav-links" aria-label={t.nav.label}>
        {links}
      </nav>
      <span className="pz-grow" />
      <a className="pz-lang" href={altHref} lang={other.lang} hrefLang={other.lang} title={other.title} aria-label={other.title}>
        {other.label}
      </a>
      <ThemeToggle label={t.nav.theme} />
      <a className="pz-btn pz-btn-ghost pz-signin" href={SIGN_IN_URL}>
        {t.nav.signIn}
      </a>
      <a className="pz-btn pz-btn-primary" href={SIGN_UP_URL}>
        {t.nav.startTrial}
      </a>
      <details className="pz-mnav">
        <summary className="pz-theme" aria-label={t.nav.menu} title={t.nav.menu}>
          <Icon name="menu" size={18} className="is-open-ico" />
          <Icon name="x" size={18} className="is-close-ico" />
        </summary>
        <nav className="pz-mnav-panel" aria-label={t.nav.label}>
          {links}
          <a href={SIGN_IN_URL}>{t.nav.signIn}</a>
        </nav>
      </details>
    </header>
  );
}
