'use client';

// Data hooks for the super-admin console (GET /admin/console/*). One SWR hook
// per resource, as the rest of the app does.
import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { emptyQuery, tableQueryString } from '@gitroom/frontend/components/tadween/ui';
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
  // In the focus list (FOCUS_PROVIDERS or TADWEEN_ENABLED_PROVIDERS)
  focus: boolean;
  // Position when no order is saved: the focus networks first, then Postiz's order
  defaultPosition: number;
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
  // The list price
  monthlyPriceUsd: number;
  // Derived on the server from the monthly price and the yearly discount
  yearlyPriceUsd: number;
  // Charged instead while the founder window is open (null: no offer)
  founderMonthlyPriceUsd: number | null;
  // -1 unlimited, 0 none, null = the tier's static value
  webhooks: number | null;
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

export interface AdminOnboardingAnswers {
  source: string;
  sourceOther: string | null;
  role: string;
  roleOther: string | null;
  goal: string;
  goalOther: string | null;
  company: string | null;
  website: string | null;
  createdAt: string;
}

// GET /admin/console/onboarding: users per answer, and the latest ones with
// free text or a company
export interface AdminOnboarding {
  answered: number;
  sources: { value: string; count: number }[];
  roles: { value: string; count: number }[];
  goals: { value: string; count: number }[];
  recent: {
    id: string;
    sourceOther: string | null;
    roleOther: string | null;
    goalOther: string | null;
    company: string | null;
    website: string | null;
    role: string;
    createdAt: string;
    user: { id: string; email: string; name: string | null };
  }[];
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
  // "About you" answers; null when skipped or never asked
  onboarding: AdminOnboardingAnswers | null;
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
  | 'past_due'
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
  // Stripe's status (null before it reported one) and the price it charges
  status: string | null;
  priceCents: number | null;
  createdAt: string;
  updatedAt?: string;
  deletedAt: string | null;
}

interface AdminLimits {
  planName: string | null;
  channels: number | null;
  members: number | null; // seats including the owner, -1 unlimited
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

export const useAdminOnboarding = () =>
  useSWR<AdminOnboarding>('/admin/console/onboarding', useLoader<AdminOnboarding>(), swrOptions);

export const useAdminSettings = () =>
  useSWR<AdminSettings>('/admin/console/settings', useLoader<AdminSettings>(), swrOptions);

export const useAdminProviders = () =>
  useSWR<AdminProvider[]>('/admin/console/providers', useLoader<AdminProvider[]>(), swrOptions);

export interface AdminPlansData {
  plans: AdminPlan[];
  yearlyDiscountPercent: number;
  // Live subscriptions per tier
  subscribers: Record<string, number>;
  postizPricing: PricingInterface;
  founderWindow: { cap: number; startsAt: string | null; endsAt: string | null };
  founder: { open: boolean; cap: number; spotsLeft: number; endsAt: string | null };
}

export const useAdminPlans = () =>
  useSWR<AdminPlansData>(
    '/admin/console/plans',
    useLoader<AdminPlansData>(),
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

// ── Growth: partners program (GET /admin/console/partners|referrals|payouts) ──
export type PartnerKind = 'REFERRER' | 'AFFILIATE';
export type PartnerStatus = 'ACTIVE' | 'SUSPENDED';
export type ReferralStatus = 'SIGNED_UP' | 'PAID' | 'QUALIFIED' | 'REJECTED' | 'REFUNDED';

export interface AdminPartner {
  id: string;
  organizationId: string;
  userId: string;
  kind: PartnerKind;
  status: PartnerStatus;
  code: string;
  tier: number;
  // percent set by an admin; null = the tier's rate
  commissionRate: number | null;
  commissionMonths: number;
  ambassador: boolean;
  country: string | null;
  mawthooqNumber: string | null;
  payoutPreference: 'BALANCE' | 'CASH';
  payoutMethod: string | null;
  taxFormAcceptedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  organization: { id: string; name: string } | null;
  user: { id: string; email: string; name: string | null } | null;
  referrals: number;
  qualified: number;
  paying: number;
  // USD cents
  pendingCents: number;
  availableCents: number;
  paidCents: number;
  // ladder steps applied by hand in Stripe (next_plan_year, founder_for_life)
  manualRewards: { id: string; step: number | null; note: string | null; createdAt: string }[];
}

export interface AdminReferral {
  id: string;
  organizationId: string;
  userId: string | null;
  source: 'LINK' | 'CODE';
  status: ReferralStatus;
  signedUpAt: string;
  firstPaidAt: string | null;
  qualifiedAt: string | null;
  rejectionReason: string | null;
  // shared_ip, shared_agent
  fraudFlags: string[];
  organization: { id: string; name: string | null };
  partner: {
    id: string;
    code: string;
    kind: PartnerKind;
    organizationId: string;
    organizationName: string | null;
  };
  invoices: number;
}

export interface AdminPayoutRow {
  id: string;
  partnerId: string;
  amountCents: number;
  // wise | payoneer | bank | manual | balance
  method: string;
  reference: string | null;
  status: 'PAID' | 'CANCELLED';
  paidAt: string | null;
  createdAt: string;
  partner: { code: string; organizationId: string };
  organization: string | null;
}

// An affiliate due a cash payout this month (details only in the CSV export)
export interface AdminDuePayout {
  partnerId: string;
  code: string;
  organization: string | null;
  email: string | null;
  country: string | null;
  mawthooqNumber: string | null;
  method: string | null;
  ready: boolean;
  amountCents: number;
  rewards: number;
}

export interface AdminPayoutsData extends AdminListPage<AdminPayoutRow> {
  due: AdminDuePayout[];
  minimumCents: number;
}

// The query of a list's total for one filter (page size 1; only `total` is
// read). Feeds the summary strips above the Growth tables.
export const countQuery = (filters: Record<string, string> = {}) =>
  tableQueryString({ ...emptyQuery(1), filters });

export const useAdminPartners = (query: string) =>
  useSWR<AdminListPage<AdminPartner>>(
    `/admin/console/partners?${query}`,
    useLoader<AdminListPage<AdminPartner>>(),
    { ...swrOptions, keepPreviousData: true }
  );

export const useAdminReferrals = (query: string) =>
  useSWR<AdminListPage<AdminReferral>>(
    `/admin/console/referrals?${query}`,
    useLoader<AdminListPage<AdminReferral>>(),
    { ...swrOptions, keepPreviousData: true }
  );

export const useAdminPayouts = (query: string) =>
  useSWR<AdminPayoutsData>(
    `/admin/console/payouts?${query}`,
    useLoader<AdminPayoutsData>(),
    { ...swrOptions, keepPreviousData: true }
  );

// A file the API sends as an attachment (CSV exports), saved through the
// browser with the session cookie
export const useAdminDownload = () => {
  const fetch = useFetch();
  return useCallback(async (path: string, filename: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(await readError(res));
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);
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

// "About you" onboarding answers (OnboardingAnswersDto values)
export const ONBOARDING_LABEL: Record<
  'source' | 'role' | 'goal',
  Record<string, string>
> = {
  source: {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    youtube: 'YouTube',
    linkedin: 'LinkedIn',
    x: 'X',
    facebook: 'Facebook',
    google: 'Google search',
    ai_assistant: 'AI assistant',
    friend: 'Friend or colleague',
    other: 'Other',
  },
  role: {
    creator: 'Creator',
    freelancer: 'Freelancer',
    agency: 'Agency',
    small_business: 'Small business',
    company_team: 'Company team',
    other: 'Other',
  },
  goal: {
    grow_audience: 'Grow an audience',
    save_time: 'Save time',
    manage_clients: 'Manage clients',
    grow_business: 'Grow a business',
    other: 'Other',
  },
};

// An answer with its "other" text, e.g. "Other: a podcast"
export const onboardingAnswer = (
  question: 'source' | 'role' | 'goal',
  value: string,
  other?: string | null
) => {
  const label = ONBOARDING_LABEL[question][value] || value;
  return other ? `${label}: ${other}` : label;
};
