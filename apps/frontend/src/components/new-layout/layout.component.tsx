'use client';

import React, { ReactNode, useCallback, useEffect } from 'react';
import { tadweenFont as jakartaSans } from '@gitroom/frontend/app/fonts';
import {
  SidebarHeader,
  useSidebarCollapsed,
} from '@gitroom/frontend/components/tadween/shell/sidebar';
import { AccountMenu } from '@gitroom/frontend/components/tadween/shell/account.menu';
import { MobileDock } from '@gitroom/frontend/components/tadween/shell/dock';
import { usePhoneLayout } from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';
import {
  SidebarChannels,
  SidebarCreatePost,
} from '@gitroom/frontend/components/tadween/shell/sidebar.channels';

import clsx from 'clsx';
import {
  useCopilotConnection,
  useFetch,
} from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { usePathname, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CheckPayment } from '@gitroom/frontend/components/layout/check.payment';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
import { ShowMediaBoxModal } from '@gitroom/frontend/components/media/media.component';
import { ShowLinkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { MediaSettingsLayout } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { ShowPostSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { NewSubscription } from '@gitroom/frontend/components/layout/new.subscription';
import { Support } from '@gitroom/frontend/components/layout/support';
import { ContinueProvider } from '@gitroom/frontend/components/layout/continue.provider';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { AiProvider } from '@gitroom/frontend/components/tadween/instance/ai.guard';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Impersonate } from '@gitroom/frontend/components/layout/impersonate';
import { AnnouncementBanner } from '@gitroom/frontend/components/layout/announcement.banner';
import {
  isBareTopBar,
  Title,
} from '@gitroom/frontend/components/layout/title';
import { TrialBanner } from '@gitroom/frontend/components/tadween/billing/trial.banner';
import { OfflineBanner } from '@gitroom/frontend/components/tadween/shell/offline.banner';
import { PaywallModal } from '@gitroom/frontend/components/tadween/billing/paywall.modal';
import { TopMenu } from '@gitroom/frontend/components/layout/top.menu';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import { StreakComponent } from '@gitroom/frontend/components/layout/streak.component';
import { UpgradeButton } from '@gitroom/frontend/components/tadween/billing/upgrade.link';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import {
  FirstBillingComponent,
  useFirstBilling,
} from '@gitroom/frontend/components/billing/first.billing.component';
import { Onboarding } from '@gitroom/frontend/components/onboarding/onboarding';
import { BootScreen } from '@gitroom/frontend/components/tadween/shell/boot.screen';
import { TrialTracker } from '@gitroom/frontend/components/layout/gtm.component';
import { setSentryUser } from '@gitroom/react/sentry/initialize.sentry.client';
import { useFeatureRouteGuard } from '@gitroom/frontend/components/tadween/instance/instance.settings';


export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const copilotConnection = useCopilotConnection();

  const { backendUrl, billingEnabled, isGeneral } = useVariables();

  // The Sentry feedback button lives in the account menu (tadween/shell/account.menu.tsx)
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sidebar = useSidebarCollapsed();
  const phone = usePhoneLayout();
  // a page whose feature the admin switched off goes to Today
  useFeatureRouteGuard();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user, mutate } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  useEffect(() => {
    setSentryUser(
      user ? { id: user.id, email: user.email, orgId: user.orgId } : null
    );
  }, [user]);

  // As Postiz: a workspace without a plan sees the first billing screen in
  // place of the app; super admins never
  const needsPlan =
    !!user &&
    user.tier === 'FREE' &&
    isGeneral &&
    billingEnabled &&
    !user.billingExempt;
  // ...and so does a new workspace right after sign-up while its free trial
  // runs without a card (until it pays or picks "Maybe later")
  const firstBilling = useFirstBilling(
    billingEnabled && !user?.billingExempt ? user : undefined,
    needsPlan
  );

  if (!user || !firstBilling.ready) {
    return (
      <BootScreen
        variant={
          firstBilling.show || (billingEnabled && firstBilling.requested)
            ? 'billing'
            : 'app'
        }
      />
    );
  }

  return (
    <ContextWrapper user={user}>
      <AiProvider
        {...copilotConnection}
        runtimeUrl={backendUrl + '/copilot/chat'}
        useSingleEndpoint={true}
        showDevConsole={false}
        enableInspector={false}
      >
        <MantineWrapper>
          <ToolTip />
          <Toaster />
          <TrialTracker />
          <CheckPayment check={searchParams.get('check') || ''} mutate={mutate}>
            <ShowMediaBoxModal />
            <ShowLinkedinCompany />
            <MediaSettingsLayout />
            <ShowPostSelector />
            <PreConditionComponent />
            <NewSubscription />
            <PaywallModal />
            <ContinueProvider />
            {/* Postiz's onboarding modal (?onboarding=true), once the app shows */}
            {firstBilling.show ? null : <Onboarding />}
            <div
              className={clsx(
                'tdw-shell flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px] mobile:p-[8px]',
                user?.admin && user?.impersonate && 'is-impersonating',
                jakartaSans.className
              )}
            >
              {/* Tadween: the full admin bar while impersonating; otherwise the
                  admin tools are one pill in the top bar (here only when the
                  billing screen replaces the top bar) */}
              <div className="tdw-adminbar-slot">
                {user?.admin && (user?.impersonate || firstBilling.show) ? (
                  <Impersonate />
                ) : (
                  <div />
                )}
              </div>
              {firstBilling.show ? (
                <FirstBillingComponent
                  onDone={() => {
                    firstBilling.dismiss();
                    mutate();
                  }}
                />
              ) : (
                <>
                  <AnnouncementBanner />
                  <div className="flex-1 flex gap-[8px] mobile:gap-0">
                    <Support />
                    {/* phones: the bottom dock in place of the sidebar */}
                    {phone ? (
                      <MobileDock />
                    ) : (
                      <div
                        className={clsx(
                          'tdw-side flex flex-col bg-newBgColorInner rounded-[12px]',
                          sidebar.collapsed && 'is-collapsed'
                        )}
                      >
                        <div
                          id="left-menu"
                          className="tdw-side-inner fixed h-full flex flex-1 top-0"
                        >
                          <div className="tdw-side-body flex flex-col h-full gap-[32px] flex-1 py-[12px]">
                            <SidebarHeader
                              collapsed={sidebar.collapsed}
                              onToggle={sidebar.toggle}
                            />
                            <SidebarCreatePost />
                            <TopMenu>
                              <SidebarChannels collapsed={sidebar.collapsed} />
                            </TopMenu>
                            <AccountMenu />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="tdw-main flex-1 min-w-0 flex flex-col gap-[8px]">
                      {/* the trial / payment-failed bar floats as its own rounded
                        card above the page card, like the sidebar beside it */}
                      <OfflineBanner />
                      {billingEnabled && <TrialBanner />}
                      <div className="flex-1 min-w-0 bg-newBgLineColor rounded-[12px] overflow-hidden flex flex-col gap-[1px] blurMe">
                        <div
                          className={clsx(
                            'tdw-topbar flex bg-newBgColorInner px-[20px] mobile:px-[12px] gap-[12px] items-center',
                            isBareTopBar(pathname)
                              ? 'is-bare h-[48px] mobile:h-[56px]'
                              : 'h-[68px] mobile:h-[56px]'
                          )}
                        >
                          <div className="tdw-topbar-title flex flex-1 min-w-0">
                            <Title />
                          </div>
                          <div className="tdw-topbar-actions flex items-center gap-[6px] text-textItemBlur">
                            {/* the admin tools pill only inside the admin console;
                              elsewhere the sidebar's Admin item leads there */}
                            {user?.admin &&
                            !user?.impersonate &&
                            /^\/admin(\/|$)/.test(pathname) ? (
                              <Impersonate />
                            ) : null}
                            <UpgradeButton />
                            <StreakComponent />
                            <NotificationComponent />
                          </div>
                        </div>
                        <div className="flex flex-1 min-w-0 gap-[1px] mobile:flex-col">
                          {children}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CheckPayment>
        </MantineWrapper>
      </AiProvider>
    </ContextWrapper>
  );
};
