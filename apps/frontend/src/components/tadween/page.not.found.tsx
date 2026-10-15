'use client';

// The 404 page (app/(app)/not-found.tsx): the brand mark, a translated
// message and a way home, in the reader's theme and direction.
import { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { EmptyState, TadweenScope } from '@gitroom/frontend/components/tadween/ui';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';

export const PageNotFound: FC = () => {
  const t = useT();
  return (
    <TadweenScope className="tdw-404">
      <a href="/" className="tdw-404-logo" aria-label={t('tdw_home', 'Home')}>
        <Logo />
      </a>
      <main className="tdw-404-main">
        <EmptyState
          size="lg"
          icon="search"
          title={t('tdw_404_title', "This page doesn't exist")}
          body={t(
            'tdw_404_body',
            'The link may be old or mistyped. Everything else is where you left it.'
          )}
          action={
            <a href="/" className="pz-btn pz-btn-primary pz-btn-md no-underline">
              {t('tdw_404_home', 'Go to Tadween')}
            </a>
          }
        />
      </main>
    </TadweenScope>
  );
};
