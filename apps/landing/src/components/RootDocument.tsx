import type { ReactNode } from 'react';
import Script from 'next/script';
import type { Dict } from '@/content/types';
import { fontVars } from '@/lib/fonts';
import { themeScript } from '@/lib/theme';
import { ReferralCapture } from './ReferralCapture';
import '@/app/tokens.css';
import '@/app/landing.css';

const CRISP_WEBSITE_ID = 'd2b8ee57-fdd8-4b31-88ae-bc6478b3e722';
const crispScript = `window.$crisp=[];window.CRISP_WEBSITE_ID="${CRISP_WEBSITE_ID}";(function(){var d=document,s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`;

/** <html> for one language. English and Arabic are separate root layouts so `/ar` gets
    lang="ar" dir="rtl" in the server HTML. The inline script sets the theme before paint;
    ReferralCapture hands a ?ref= code on to the app's links. */
export function RootDocument({ t, children }: { t: Dict; children: ReactNode }) {
  return (
    <html lang={t.lang} dir={t.dir} className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <ReferralCapture />
        <Script id="crisp-chat" strategy="afterInteractive">
          {crispScript}
        </Script>
      </body>
    </html>
  );
}
