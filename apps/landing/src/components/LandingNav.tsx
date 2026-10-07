import type { Dict } from '@/content/types';
import { SIGN_IN_URL, SIGN_UP_URL } from '@/lib/config';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

/** Translucent top bar: logo, section links, language switch, theme, sign in and trial.
    `altHref` is the same page in the other language. */
export function LandingNav({ t, altHref, current }: { t: Dict; altHref: string; current?: string }) {
  const other = t.nav.switchTo;
  return (
    <header className="pz-lnav">
      <Logo href={t.base || '/'} label={t.nav.home} />
      <nav className="pz-lnav-links" aria-label={t.nav.label}>
        {t.nav.links.map((l) => (
          <a key={l.href} href={l.href} aria-current={current === l.href ? 'page' : undefined}>
            {l.label}
          </a>
        ))}
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
    </header>
  );
}
