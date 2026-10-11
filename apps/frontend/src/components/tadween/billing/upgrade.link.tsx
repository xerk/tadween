'use client';

import { FC, useCallback, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  useInstanceSettings,
  useTadweenPricing,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { Icon } from '@gitroom/frontend/components/tadween/ui';

// "Upgrade" in the sidebar (above Settings, an entry of layout/top.menu.tsx)
// and in the top bar, both to
// /billing. Shown when billing is on, the user can manage this workspace's
// billing (the account menu's Billing rule; super admins too on a workspace
// without a subscription), the plan isn't lifetime, and there is a higher plan
// or the workspace is on a trial. Styles: app/tadween/shell.scss.

const DAY = 86400000;
// Older subscription rows carry no trial end: StripeService's default trial
const TRIAL_DAYS = 7;

// The billing page's own request (same key), only while on a trial. The row
// carries Stripe's real trial end (trialEndsAt, written by the webhooks)
const useTrialSubscription = (trial: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  return useSWR<{
    subscription?: {
      createdAt: string;
      trialEndsAt?: string | null;
      status?: string | null;
    };
  }>(
    trial ? '/user/subscription' : null,
    load,
    { revalidateOnFocus: false }
  );
};

// null: no Upgrade. Otherwise the trial's days left, when on a trial.
export const useUpgradeOffer = () => {
  const user = useUser();
  const { billingEnabled } = useVariables();
  const { data: settings } = useInstanceSettings();
  const { pricing, visible } = useTadweenPricing();
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
      // wait for the subscription, so the label doesn't change under the user
      if (!sub) {
        return null;
      }
      // A failed renewal (past_due) is not a trial: the app's banner asks
      // for a card instead
      if (['past_due', 'unpaid'].includes(sub.subscription?.status || '')) {
        return { daysLeft: null };
      }
      const ends = sub.subscription?.trialEndsAt
        ? new Date(sub.subscription.trialEndsAt).getTime()
        : sub.subscription?.createdAt
        ? new Date(sub.subscription.createdAt).getTime() + TRIAL_DAYS * DAY
        : 0;
      const left = ends ? Math.ceil((ends - Date.now()) / DAY) : 0;
      return { daysLeft: left > 0 ? left : null };
    }
    const top = Math.max(...visible(false).map(([, v]) => v.month_price));
    if ((pricing[tier]?.month_price || 0) >= top) {
      return null;
    }
    return { daysLeft: null };
  }, [billingEnabled, user, settings, trial, sub, pricing, visible]);
};

// Top bar: a soft pill on desktop, the icon alone on phones. The trial's days
// left are shown once, on the sidebar line (and the trial banner), not here
export const UpgradeButton: FC = () => {
  const t = useT();
  const offer = useUpgradeOffer();
  const label = t('tdw_upgrade', 'Upgrade');
  if (!offer) {
    return null;
  }
  return (
    <Link href="/billing" className="tdw-upgrade-pill" aria-label={label}>
      <Icon name="sparkles" size={16} />
      <span className="tdw-upgrade-label">{label}</span>
    </Link>
  );
};

// Sidebar, above the account: the trial's days left, neutral with only the
// icon in colour (hidden in the icon rail)
export const UpgradeTrialLine: FC = () => {
  const t = useT();
  const offer = useUpgradeOffer();
  if (!offer?.daysLeft) {
    return null;
  }
  return (
    <div className="tdw-side-trial">
      <Icon name="sparkles" size={14} />
      <span>
        {t('tdw_trial_days_left', '{{count}} days left in your trial', {
          count: offer.daysLeft,
        })}
      </span>
      <Link href="/billing" className="tdw-side-trial-link">
        {t('tdw_choose_plan', 'Choose plan')}
      </Link>
    </div>
  );
};
