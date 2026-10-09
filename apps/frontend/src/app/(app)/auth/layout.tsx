export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { cookies, headers } from 'next/headers';
import {
  cookieName,
  fallbackLng,
  headerName,
} from '@gitroom/react/translation/i18n.config';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { AuthBrand } from '@gitroom/frontend/components/tadween/auth/auth.brand';
import { AuthControls } from '@gitroom/frontend/components/tadween/auth/auth.parts';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));

// Tadween sign-in / sign-up shell: the form pane (lockup + language/theme
// controls, then the card) beside the brand pane. Styles: app/tadween/auth.scss.
// Theme and direction are read from the same cookies the app uses and painted on
// the shell itself, so the first render is already right (no dark/LTR flash);
// AuthControls keeps <body>/<html> and the shell in sync after that.
export default async function AuthLayout({
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
      <ReturnUrlComponent />
      <div className={`tdw-ui tdw-auth ${mode}`} dir={dir} lang={language}>
        <header className="tdw-auth-top">
          <span className="tdw-auth-lockup">
            <Logo />
            <span>Tadween</span>
          </span>
          <AuthControls />
        </header>
        <main className="tdw-auth-main">
          <div className="tdw-auth-card">{children}</div>
        </main>
        <AuthBrand />
      </div>
    </MantineWrapper>
  );
}
