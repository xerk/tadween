'use client';

// The current plan's usage against its limits (channels, team members). AI
// credits have their own card (ai.credits.tsx).
import React, { FC, ReactNode, useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PublicPlan } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { Skeleton, UsageMeter } from '@gitroom/frontend/components/tadween/ui';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';

const useJson = () => {
  const fetch = useFetch();
  return useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(path);
    }
    return res.json();
  }, []);
};

// The launches screen's hook: '/integrations/list' is cached as the array of
// channels, so a second fetcher on that key must not store another shape
const useChannelsUsed = () => {
  const { data, isLoading } = useIntegrationList();
  return isLoading
    ? undefined
    : ((data || []) as { disabled?: boolean }[]).filter((i) => !i.disabled)
        .length;
};

// Only for plans with a team: without one the server refuses the list (402),
// which would open the upgrade paywall over Billing
const useTeamUsed = (enabled: boolean) => {
  const load = useJson();
  const { data } = useSWR(enabled ? '/settings/team' : null, load, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  return data
    ? ((data.users || []) as { role: string }[]).filter(
        (u) => u.role !== 'SUPERADMIN'
      ).length
    : undefined;
};

const Meter: FC<{ label: ReactNode; used?: number; limit: number }> = ({
  label,
  used,
  limit,
}) =>
  used === undefined ? (
    <div className="grid gap-[8px]">
      <Skeleton width="60%" />
      <Skeleton height={4} />
    </div>
  ) : (
    <UsageMeter label={label} used={used} limit={limit} />
  );

// Usage of the current plan's limits (channels, team members), under its
// card on Billing
export const PlanUsage: FC<{ plan: PublicPlan }> = ({ plan }) => {
  const t = useT();
  const channels = useChannelsUsed();
  const team = useTeamUsed(plan.teamMembers !== 0);
  return (
    <div className="tdw-current-usage">
      <Meter
        label={t('tdw_channels', 'Channels')}
        used={channels}
        limit={plan.channels}
      />
      {plan.teamMembers !== 0 ? (
        <Meter
          label={t('tdw_cmp_team', 'Team members')}
          used={team}
          limit={plan.teamMembers}
        />
      ) : null}
    </div>
  );
};
