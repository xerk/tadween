import type { Metadata } from 'next';
import { en } from '@/content/en';
import { fontVars } from '@/lib/fonts';
import { themeScript } from '@/lib/theme';
import { Logo } from '@/components/Logo';
import './tokens.css';
import './landing.css';

export const metadata: Metadata = {
  title: 'Page not found — Tadween',
};

/** One 404 for both languages (the app has two root layouts). */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <main className="pz-sec pz-container" style={{ minHeight: '100svh', display: 'grid', placeItems: 'center' }}>
          <div className="pz-sec-head">
            <div style={{ justifySelf: 'center' }}>
              <Logo href="/" label={en.nav.home} />
            </div>
            <h1 className="t-h2">This page doesn’t exist.</h1>
            <p className="t-lead" lang="ar" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
              هذه الصفحة غير موجودة.
            </p>
            <p style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: 0 }}>
              <a className="pz-btn pz-btn-primary" href="/">
                Go to the home page
              </a>
              <a className="pz-btn pz-btn-secondary" href="/ar" lang="ar">
                الصفحة الرئيسية
              </a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
