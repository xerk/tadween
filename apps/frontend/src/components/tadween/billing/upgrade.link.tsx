'use client';

import { FC, useCallback, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  useInstanceSettings,
  useTadweenPricing,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { MenuItem } from '@gitroom/frontend/components/new-layout/menu-item';
import { Icon } from '@gitroom/frontend/components/tadween/ui';

// "Upgrade" in the sidebar (above Settings) and in the top bar, both to
// /billing. Shown when billing is on, the user can manage this workspace's
// billing (the account menu's Billing rule; super admins too on a workspace
// without a subscription), the plan isn't lifetime, and there is a higher plan
// or the workspace is on a trial. Styles: app/tadween/shell.scss.

const DAY = 86400000;

// The billing page's own request (same key), only while on a trial: the trial
// started with the subscription row
const useTrialSubscription = (trial: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  return useSWR<{ subscription?: { createdAt: string } }>(
    trial ? '/user/subscription' : null,
    load,
    { revalidateOnFocus: false }
  );
};

// null: no Upgrade. Otherwise the trial's days left, when on a trial.
const useUpgradeOffer = () => {
  const user = useUser();
  const { billingEnabled } = useVariables();
  const { data: settings } = useInstanceSettings();
  const { pricing, visible, planFor } = useTadweenPricing();
  const trial = !!user?.isTrailing;
  const { data: sub } = useTrialSubscription(trial);

  return useMemo(() => {
    // nothing until /user/self and /instance/settings are in, so it never flashes
    if (!billingEnabled || !user?.orgId || !settings || user.isLifetime) {
      return null;
    }
    const tier = user.tier?.current || 'FREE';
    const manages =
      ['ADMIN', 'SUPERADMIN'].includes(user.role) ||
      (user.isSuperAdmin && tier === 'FREE');
    if (!manages) {
      return null;
    }
    if (trial) {
      const started = sub?.subscription?.createdAt;
      const days = planFor(tier)?.trialDays || 7;
      const left = started
        ? Math.ceil(days - (Date.now() - new Date(started).getTime()) / DAY)
        : 0;
      return { daysLeft: left > 0 ? left : null };
    }
    const top = Math.max(...visible(false).map(([, v]) => v.month_price));
    if ((pricing[tier]?.month_price || 0) >= top) {
      return null;
    }
    return { daysLeft: null };
  }, [billingEnabled, user, settings, trial, sub, pricing, visible, planFor]);
};

const useUpgradeLabel = (daysLeft: number | null) => {
  const t = useT();
  return daysLeft
    ? t('tdw_upgrade_days_left', 'Upgrade · {{n}} days left', {
        n: daysLeft,
      })
    : t('tdw_upgrade', 'Upgrade');
};

// Sidebar entry, rendered right above Settings (layout/top.menu.tsx)
export const UpgradeMenuItem: FC = () => {
  const offer = useUpgradeOffer();
  const label = useUpgradeLabel(offer?.daysLeft || null);
  if (!offer) {
    return null;
  }
  return (
    <MenuItem
      path="/billing"
      label={label}
      icon={<Icon name="sparkles" size={20} />}
      className="is-upgrade"
    />
  );
};

// Top bar: a soft pill on desktop, the icon alone on phones
export const UpgradeButton: FC = () => {
  const offer = useUpgradeOffer();
  const label = useUpgradeLabel(offer?.daysLeft || null);
  if (!offer) {
    return null;
  }
  return (
    <Link
      href="/billing"
      className={clsx('tdw-upgrade-pill', offer.daysLeft && 'is-trial')}
      aria-label={label}
    >
      <Icon name="sparkles" size={16} />
      <span className="tdw-upgrade-label">{label}</span>
    </Link>
  );
};
