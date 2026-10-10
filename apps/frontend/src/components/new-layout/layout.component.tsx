'use client';

import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { tadweenFont as jakartaSans } from '@gitroom/frontend/app/fonts';
import {
  SidebarHeader,
  useSidebarCollapsed,
} from '@gitroom/frontend/components/tadween/shell/sidebar';
import { AccountMenu } from '@gitroom/frontend/components/tadween/shell/account.menu';
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
import { TopMenu } from '@gitroom/frontend/components/layout/top.menu';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import { StreakComponent } from '@gitroom/frontend/components/layout/streak.component';
import {
  UpgradeButton,
  UpgradeTrialLine,
} from '@gitroom/frontend/components/tadween/billing/upgrade.link';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';
import { TrialTracker } from '@gitroom/frontend/components/layout/gtm.component';
import { setSentryUser } from '@gitroom/react/sentry/initialize.sentry.client';


export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const copilotConnection = useCopilotConnection();

  const { backendUrl, billingEnabled, isGeneral } = useVariables();

  // The Sentry feedback button lives in the account menu (tadween/shell/account.menu.tsx)
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebar = useSidebarCollapsed();
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
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

  if (!user) return null;

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
            <ContinueProvider />
            <div
              className={clsx(
                'flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px] mobile:p-[8px] mobile:pb-[80px]',
                jakartaSans.className
              )}
            >
              {/* Tadween: the full admin bar while impersonating; otherwise the
                  admin tools are one pill in the top bar (here only when the
                  first-billing screen replaces the top bar) */}
              <div>
                {user?.admin &&
                (user?.impersonate ||
                  (user.tier === 'FREE' && isGeneral && billingEnabled)) ? (
                  <Impersonate />
                ) : (
                  <div />
                )}
              </div>
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                <FirstBillingComponent />
              ) : (
                <>
                  <AnnouncementBanner />
                  <div className="flex-1 flex gap-[8px] mobile:gap-0">
                    <Support />
                    {menuOpen && (
                      <div
                        className="hidden mobile:block fixed inset-0 bg-newBackdrop opacity-60 z-[var(--tdw-z-nav)]"
                        onClick={() => setMenuOpen(false)}
                      />
                    )}
                    <div
                      className={clsx(
                        'tdw-side flex flex-col bg-newBgColorInner rounded-[12px] mobile:fixed mobile:top-0 mobile:bottom-0 mobile:start-0 mobile:z-[calc(var(--tdw-z-nav)+1)] mobile:rounded-none mobile:overflow-y-auto mobile:overflow-x-hidden',
                        !menuOpen && 'mobile:hidden',
                        sidebar.collapsed && 'is-collapsed'
                      )}
                      onClick={() => setMenuOpen(false)}
                    >
                      <div
                        id="left-menu"
                        className={clsx(
                          'tdw-side-inner fixed h-full flex flex-1 top-0 mobile:static mobile:h-auto mobile:min-h-full mobile:mx-auto',
                          user?.admin &&
                            user?.impersonate &&
                            'pt-[60px] max-h-[1000px]:w-[500px]'
                        )}
                      >
                        <div className="tdw-side-body flex flex-col h-full gap-[32px] mobile:gap-[16px] flex-1 py-[12px]">
                          <SidebarHeader
                            collapsed={sidebar.collapsed}
                            onToggle={sidebar.toggle}
                          />
                          <SidebarCreatePost />
                          <TopMenu>
                            <SidebarChannels collapsed={sidebar.collapsed} />
                          </TopMenu>
                          <UpgradeTrialLine />
                          <AccountMenu />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 bg-newBgLineColor rounded-[12px] overflow-hidden flex flex-col gap-[1px] blurMe">
                      <div
                        className={clsx(
                          'tdw-topbar flex bg-newBgColorInner px-[20px] mobile:px-[12px] gap-[12px] items-center',
                          isBareTopBar(pathname)
                            ? 'is-bare h-[48px] mobile:h-[56px]'
                            : 'h-[68px] mobile:h-[56px]'
                        )}
                      >
                        <button
                          className="hidden mobile:flex items-center justify-center w-[36px] h-[36px] -ms-[6px] rounded-[8px] text-textItemBlur hover:text-newTextColor hover:bg-boxFocused"
                          onClick={() => setMenuOpen(true)}
                          aria-label="Open menu"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M3 6H21M3 12H21M3 18H21"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        <div className="tdw-topbar-title flex flex-1 min-w-0">
                          <Title />
                        </div>
                        <div className="tdw-topbar-actions flex items-center gap-[6px] text-textItemBlur">
                          {user?.admin && !user?.impersonate ? <Impersonate /> : null}
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
                </>
              )}
            </div>
          </CheckPayment>
        </MantineWrapper>
      </AiProvider>
    </ContextWrapper>
  );
};
