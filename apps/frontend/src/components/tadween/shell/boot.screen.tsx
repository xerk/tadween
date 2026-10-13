'use client';

import { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { Skeleton, TadweenScope } from '@gitroom/frontend/components/tadween/ui';

// The design system's Loading pattern for the first load of the app (while
// /user/self is on its way): the brand mark, a calm progress line along the
// top edge, and skeletons in the shape of what is about to appear: the
// onboarding frame after sign-up, the app shell otherwise. Never a spinner in
// a box. Styles: app/tadween/onboarding.scss. Reduced motion stops the line
// and the shimmer.
export const BootScreen: FC<{ variant: 'app' | 'onboarding' }> = ({ variant }) => {
  const t = useT();
  return (
    <TadweenScope className="tdw-boot">
      <span className="tdw-boot-line" role="progressbar" aria-label={t('tdw_loading', 'Loading…')} />
      {variant === 'onboarding' ? (
        <div className="pz-ob" aria-hidden="true">
          <header className="pz-ob-head">
            <span className="pz-ob-logo">
              <Logo />
              <span className="pz-ob-logo-word">Tadween</span>
            </span>
            <span className="tdw-boot-progress">
              <Skeleton height={4} radius={2} />
              <Skeleton height={4} radius={2} />
              <Skeleton height={4} radius={2} />
              <Skeleton height={4} radius={2} />
            </span>
            <Skeleton width={84} height={28} radius={8} />
          </header>
          <div className="pz-ob-stage">
            <div className="tdw-boot-step">
              <Skeleton width={48} height={48} radius={12} />
              <Skeleton width="70%" height={34} radius={8} />
              <Skeleton width="90%" height={16} />
              <Skeleton height={68} radius={10} />
              <Skeleton height={64} radius={14} />
            </div>
          </div>
          <footer className="pz-ob-foot">
            <span className="pz-ob-foot-note" />
            <Skeleton width={120} height={40} radius={10} />
          </footer>
        </div>
      ) : (
        <div className="tdw-boot-shell" aria-hidden="true">
          {/* the sidebar; phones get the top bar and the dock instead (CSS) */}
          <aside className="tdw-boot-side">
            <span className="tdw-boot-brand">
              <Logo />
              <Skeleton width={96} height={14} />
            </span>
            <Skeleton height={40} radius={10} />
            <span className="tdw-boot-nav">
              {[72, 88, 64, 80, 70, 60].map((w, i) => (
                <Skeleton key={i} width={`${w}%`} height={14} />
              ))}
            </span>
          </aside>
          <main className="tdw-boot-main">
            <div className="tdw-boot-top">
              <span className="tdw-boot-phone-mark">
                <Logo />
              </span>
              <Skeleton width={180} height={20} radius={6} />
            </div>
            <div className="tdw-boot-body">
              <Skeleton width="40%" height={30} radius={8} />
              <Skeleton width="60%" height={16} />
              <div className="tdw-boot-cards">
                <Skeleton height={180} radius={14} />
                <Skeleton height={180} radius={14} />
              </div>
              <Skeleton height={120} radius={14} />
            </div>
          </main>
        </div>
      )}
    </TadweenScope>
  );
};
