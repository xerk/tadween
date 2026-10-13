export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import {
  cookieName,
  fallbackLng,
  headerName,
} from '@gitroom/react/translation/i18n.config';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { AuthControls } from '@gitroom/frontend/components/tadween/auth/auth.parts';

export const metadata: Metadata = {
  title: 'Authorize access',
};

// Consent screen of MCP / OAuth clients: the auth shell (lockup, language and
// theme controls; same cookies, painted on the shell so the first render has
// the right theme and direction) with one centred card and no brand pane.
// Styles: app/tadween/auth.scss (shell) and app/tadween/oauth.scss (card).
export default async function OAuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const mode = cookieStore.get('mode')?.value === 'light' ? 'light' : 'dark';
  // no cookie yet (first visit): proxy.ts detected the language from the country / browser
  const language =
    cookieStore.get(cookieName)?.value ||
    (await headers()).get(headerName) ||
    fallbackLng;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <MantineWrapper>
      <Toaster />
      <div
        className={`tdw-ui tdw-auth tdw-consent-shell ${mode}`}
        dir={dir}
        lang={language}
      >
        <header className="tdw-auth-top">
          <span className="tdw-auth-lockup">
            <Logo />
            <span>Tadween</span>
          </span>
          <AuthControls />
        </header>
        <main className="tdw-auth-main">{children}</main>
      </div>
    </MantineWrapper>
  );
}
