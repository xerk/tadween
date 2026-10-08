'use client';

// Data hooks for the super-admin console (GET /admin/console/*). One SWR hook
// per resource, as the rest of the app does.
import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import type { PricingInterface } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

export type Tier = 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE';
export type RegistrationMode = 'open' | 'invite' | 'closed';

export interface AdminOverview {
  users: number;
  inactiveUsers: number;
  organizations: number;
  channels: number;
  disabledChannels: number;
  refreshNeeded: number;
  scheduled: number;
  failed24h: number;
  published24h: number;
  subscriptions: { tier: Tier; count: number }[];
}

export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
  group: string;
  hides: string;
  applied: boolean;
}

export interface Branding {
  instanceName: string;
  supportEmail: string;
  defaultLanguage: string;
  defaultTimezone: string;
  websiteUrl: string;
  termsUrl: string;
  privacyUrl: string;
  docsUrl: string;
  supportUrl: string;
  tutorialVideoUrl: string;
}

export interface AdminSettings {
  registration: { mode: RegistrationMode };
  features: Record<string, boolean>;
  branding: Branding;
  featureDefinitions: FeatureDefinition[];
  env: {
    DISABLE_REGISTRATION: boolean;
    INVITE_ONLY_REGISTRATION: boolean;
    TADWEEN_DISABLED_FEATURES: string;
  };
}

export interface AdminProvider {
  identifier: string;
  name: string;
  enabled: boolean;
  position: number;
  saved: boolean;
  hiddenByEnv: boolean;
  credentials: {
    needsCredentials: boolean;
    configured: boolean;
    env: { name: string; set: boolean }[];
    note?: string;
  };
}

export interface AdminPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  tier: Tier;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  monthlyPriceEgp: number;
  yearlyPriceEgp: number;
  trialDays: number;
  mostPopular: boolean;
  channels: number;
  teamMembers: number;
  postsPerMonth: number;
  aiCredits: number;
  features: string[];
  providerPriceIdMonthly: string | null;
  providerPriceIdYearly: string | null;
  active: boolean;
  position: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  lastName: string | null;
  providerName: string;
  activated: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  lastOnline: string;
  organizations: {
    id: string; // UserOrganization id — what impersonation takes
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
    disabled: boolean;
    organization: {
      id: string;
      name: string;
      subscription: {
        subscriptionTier: Tier;
        period: 'MONTHLY' | 'YEARLY';
        isLifetime: boolean;
        provider: string;
        cancelAt: string | null;
      } | null;
      _count: { Integration: number };
    };
  }[];
}

export interface AdminUsersPage {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  users: AdminUser[];
}

const useLoader = <T,>() => {
  const fetch = useFetch();
  return useCallback(async (path: string): Promise<T> => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(await readError(res));
    }
    return res.json();
  }, []);
};

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

export const useAdminOverview = () =>
  useSWR<AdminOverview>('/admin/console/overview', useLoader<AdminOverview>(), swrOptions);

export const useAdminSettings = () =>
  useSWR<AdminSettings>('/admin/console/settings', useLoader<AdminSettings>(), swrOptions);

export const useAdminProviders = () =>
  useSWR<AdminProvider[]>('/admin/console/providers', useLoader<AdminProvider[]>(), swrOptions);

export const useAdminPlans = () =>
  useSWR<{ plans: AdminPlan[]; postizPricing: PricingInterface }>(
    '/admin/console/plans',
    useLoader<{ plans: AdminPlan[]; postizPricing: PricingInterface }>(),
    swrOptions
  );

export const useAdminUsers = (search: string, page: number) =>
  useSWR<AdminUsersPage>(
    `/admin/console/users?search=${encodeURIComponent(search)}&page=${page}`,
    useLoader<AdminUsersPage>(),
    { ...swrOptions, keepPreviousData: true }
  );

// Nest returns { message } (string or validation list) on errors.
export const readError = async (res: Response) => {
  try {
    const body = await res.json();
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message;
    return message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
};

// Mutations: returns the parsed body, or throws with the server's message.
export const useAdminMutation = () => {
  const fetch = useFetch();
  return useCallback(
    async <T = unknown,>(
      path: string,
      method: 'POST' | 'PUT' | 'DELETE',
      body?: unknown
    ): Promise<T> => {
      const res = await fetch(path, {
        method,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) {
        throw new Error(await readError(res));
      }
      const text = await res.text();
      return (text ? JSON.parse(text) : undefined) as T;
    },
    []
  );
};

export const TIER_LABEL: Record<string, string> = {
  FREE: 'Free',
  STANDARD: 'Standard',
  PRO: 'Pro',
  TEAM: 'Team',
  ULTIMATE: 'Ultimate',
};
