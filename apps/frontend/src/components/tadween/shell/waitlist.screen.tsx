'use client';

import { FC } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { LanguageSwitch } from '@gitroom/frontend/components/billing/first.billing.component';
import { cx, Icon, TadweenScope } from '@gitroom/frontend/components/tadween/ui';

const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

// Tadween free launch: replaces the app while the workspace waits for a free
// spot (/user/self → waitlisted). Same frame as the first billing screen: the
// brand, the workspace switcher, theme, language and log out; the body says
// where the workspace is in line and what happens next. Nothing here calls an
// API the waitlist refuses. Styles: app/tadween/onboarding.scss (.tdw-wl).
export const WaitlistScreen: FC<{ position: number | null }> = ({
  position,
}) => {
  const t = useT();
  const { i18n } = useTranslation();
  const ar = i18n.resolvedLanguage === 'ar';
  return (
    <TadweenScope className={cx('tdw-fb', 'tdw-wl', ar && 'is-ar')}>
      <header className="tdw-fb-head">
        <span className="pz-ob-logo">
          <Logo />
          <span className="pz-ob-logo-word">Tadween</span>
        </span>
        <div className="tdw-fb-tools">
          <OrganizationSelector />
          <span className="tdw-fb-icon">
            <ModeComponent />
          </span>
          <LanguageSwitch />
          <span className="tdw-fb-icon">
            <LogoutComponent isIcon={true} />
          </span>
        </div>
      </header>
      <main className="tdw-wl-body">
        <section className="tdw-wl-card" aria-labelledby="tdw-wl-title">
          <span className="tdw-wl-mark" aria-hidden="true">
            <Icon name="clock" size={24} />
          </span>
          <h1 id="tdw-wl-title" className="tdw-wl-title">
            {t('tdw_waitlist_title', 'You’re on the waitlist')}
          </h1>
          <p className="tdw-wl-lead">
            {t(
              'tdw_waitlist_lead',
              'Tadween is free during early access, and the free spots are taken for now. Your workspace is saved and waiting.'
            )}
          </p>
          {position ? (
            <div className="tdw-wl-position">
              <span className="tdw-wl-position-label">
                {t('tdw_waitlist_position', 'Your place in line')}
              </span>
              <span className="tdw-wl-position-value">
                {/* Western digits in Arabic too */}
                {new Intl.NumberFormat('en-US').format(position)}
              </span>
            </div>
          ) : null}
          <ul className="tdw-wl-steps">
            <li>
              <Icon name="check" size={16} />
              {t(
                'tdw_waitlist_step_order',
                'We let people in in the order they signed up.'
              )}
            </li>
            <li>
              <Icon name="check" size={16} />
              {t(
                'tdw_waitlist_step_email',
                'When it’s your turn, we email you and you can start right away.'
              )}
            </li>
          </ul>
        </section>
      </main>
    </TadweenScope>
  );
};
