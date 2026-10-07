import type { ReactNode } from 'react';
import type { Dict } from '@/content/types';
import { fontVars } from '@/lib/fonts';
import { themeScript } from '@/lib/theme';
import '@/app/tokens.css';
import '@/app/landing.css';

/** <html> for one language. English and Arabic are separate root layouts so `/ar` gets
    lang="ar" dir="rtl" in the server HTML. The inline script sets the theme before paint. */
export function RootDocument({ t, children }: { t: Dict; children: ReactNode }) {
  return (
    <html lang={t.lang} dir={t.dir} className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
