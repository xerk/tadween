'use client';

import { createContext, FC, ReactNode, useContext } from 'react';
import { User } from '@prisma/client';
import {
  pricing,
  PricingInnerInterface,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { useTadweenPricing } from '@gitroom/frontend/components/tadween/instance/instance.settings';
export const UserContext = createContext<
  | undefined
  | (User & {
      orgId: string;
      tier: PricingInnerInterface;
      publicApi: string;
      role: 'USER' | 'ADMIN' | 'SUPERADMIN';
      totalChannels: number;
      isLifetime?: boolean;
      impersonate: boolean;
      allowTrial: boolean;
      isTrailing: boolean;
      // Stripe's status (past_due: the last renewal failed) and trial end
      subscriptionStatus?: string | null;
      trialEndsAt?: string | null;
      streakSince: string | null;
      // Super admin acting as themselves: no paywall or plan gates
      billingExempt?: boolean;
    })
>(undefined);
export const ContextWrapper: FC<{
  user: User & {
    orgId: string;
    tier: 'FREE' | 'STANDARD' | 'PRO' | 'ULTIMATE' | 'TEAM';
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
    publicApi: string;
    totalChannels: number;
    billingExempt?: boolean;
  };
  children: ReactNode;
}> = ({ user, children }) => {
  // Tadween: plan limits set in /admin overlay the static pricing map
  const { pricing: plans } = useTadweenPricing();
  // A super admin on a workspace without a plan gets the top tier's gates
  // (the real tier still drives /billing, which reads the subscription)
  const tier =
    user?.billingExempt && user.tier === 'FREE' ? 'ULTIMATE' : user?.tier;
  const values = user
    ? {
        ...user,
        tier: plans[tier] || pricing[tier],
      }
    : ({} as any);
  return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};
export const useUser = () => useContext(UserContext);
