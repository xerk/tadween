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
    fields: CredentialField[];
  };
}

// One provider app credential as the console sees it: never the value.
export interface CredentialField {
  name: string;
  set: boolean;
  source: 'console' | 'env' | null;
  unreadable: boolean;
  secret: boolean;
  last4: string | null;
  updatedAt: string | null;
  editable: boolean;
  envOnlyReason: string | null;
  usedBy: string[];
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
        deletedAt: string | null;
      } | null;
      _count: { Integration: number };
    };
  }[];
}

// Every server-side admin list answers in this shape.
export interface AdminListPage<T> {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  items: T[];
}

export type AdminUsersPage = AdminListPage<AdminUser>;

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'cancelled'
  | 'lifetime'
  | 'none';

interface AdminSubscription {
  subscriptionTier: Tier;
  period: 'MONTHLY' | 'YEARLY';
  isLifetime: boolean;
  provider: string;
  identifier: string | null;
  cancelAt: string | null;
  totalChannels: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt: string | null;
}

interface AdminLimits {
  planName: string | null;
  channels: number | null;
  members: number | null; // -1 unlimited, 0 owner only
}

export interface AdminOrganization {
  id: string;
  name: string;
  createdAt: string;
  paymentId: string | null;
  isTrailing: boolean;
  allowTrial: boolean;
  subscription: AdminSubscription | null;
  status: SubscriptionStatus;
  tier: Tier | null;
  owner: {
    membershipId: string;
    id: string;
    email: string;
    name: string | null;
  } | null;
  usage: { channels: number; members: number };
  limits: AdminLimits;
}

export interface AdminOrganizationDetail
  extends Omit<AdminOrganization, 'owner' | 'usage'> {
  users: {
    id: string; // UserOrganization id — what impersonation takes
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
    disabled: boolean;
    createdAt: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      lastName: string | null;
      activated: boolean;
      isSuperAdmin: boolean;
      lastOnline: string;
    };
  }[];
  Integration: {
    id: string;
    name: string;
    providerIdentifier: string;
    picture: string | null;
    disabled: boolean;
    refreshNeeded: boolean;
    inBetweenSteps: boolean;
    createdAt: string;
  }[];
  usage: {
    publishedMonth: number;
    publishedTotal: number;
    scheduled: number;
    failed30d: number;
  };
}

// Postiz's own GET /admin/errors (already server-side paged and filtered).
export interface AdminErrorRow {
  id: string;
  message: string;
  body: string;
  platform: string;
  postId: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    users: { user: { id: string; email: string; name: string | null } }[];
  };
  post: { id: string; content: string | null };
}

export interface AdminErrorsPage {
  items: AdminErrorRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
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

// `query` is tableQueryString(...) from the DataTable.
export const useAdminUsers = (query: string) =>
  useSWR<AdminUsersPage>(
    `/admin/console/users?${query}`,
    useLoader<AdminUsersPage>(),
    { ...swrOptions, keepPreviousData: true }
  );

// A user that isn't on the current page (opened from search or a link).
export const useAdminUser = (id: string | null) =>
  useSWR<AdminUser>(
    id ? `/admin/console/users/${encodeURIComponent(id)}` : null,
    useLoader<AdminUser>(),
    swrOptions
  );

export const useAdminOrganizations = (query: string) =>
  useSWR<AdminListPage<AdminOrganization>>(
    `/admin/console/organizations?${query}`,
    useLoader<AdminListPage<AdminOrganization>>(),
    { ...swrOptions, keepPreviousData: true }
  );

export const useAdminOrganization = (id: string | null) =>
  useSWR<AdminOrganizationDetail>(
    id ? `/admin/console/organizations/${id}` : null,
    useLoader<AdminOrganizationDetail>(),
    swrOptions
  );

export const useAdminErrors = (query: string) =>
  useSWR<AdminErrorsPage>(
    `/admin/errors?${query}`,
    useLoader<AdminErrorsPage>(),
    { ...swrOptions, keepPreviousData: true }
  );

export const useAdminErrorPlatforms = () =>
  useSWR<string[]>('/admin/errors/platforms', useLoader<string[]>(), swrOptions);

// Top-bar search: a few organizations and users matching the text.
export const useAdminSearchOrganizations = (search: string) =>
  useSWR<AdminListPage<AdminOrganization>>(
    search
      ? `/admin/console/organizations?pageSize=5&search=${encodeURIComponent(search)}`
      : null,
    useLoader<AdminListPage<AdminOrganization>>(),
    { ...swrOptions, keepPreviousData: true }
  );

export const useAdminSearchUsers = (search: string) =>
  useSWR<AdminUsersPage>(
    search
      ? `/admin/console/users?pageSize=5&search=${encodeURIComponent(search)}`
      : null,
    useLoader<AdminUsersPage>(),
    { ...swrOptions, keepPreviousData: true }
  );

// CSV export of a whole server-side query: every page at the maximum size,
// capped so a click can't pull an unbounded table.
const EXPORT_MAX_PAGES = 50;
export const useExportAll = () => {
  const fetch = useFetch();
  return useCallback(
    async <T,>(path: string, query: string, sizeParam = 'pageSize'): Promise<T[]> => {
      const all: T[] = [];
      const params = new URLSearchParams(query);
      params.set(sizeParam, '100');
      for (let page = 0; page < EXPORT_MAX_PAGES; page++) {
        params.set('page', String(page));
        const res = await fetch(`${path}?${params.toString()}`);
        if (!res.ok) {
          throw new Error(await readError(res));
        }
        const body: { items: T[]; total: number } = await res.json();
        all.push(...body.items);
        if (all.length >= body.total || !body.items.length) {
          break;
        }
      }
      return all;
    },
    []
  );
};

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

export const date = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export const TIER_LABEL: Record<string, string> = {
  FREE: 'Free',
  STANDARD: 'Standard',
  PRO: 'Pro',
  TEAM: 'Team',
  ULTIMATE: 'Ultimate',
};
