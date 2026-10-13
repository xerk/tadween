'use client';

import { FC, useMemo } from 'react';
import Link from 'next/link';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  useInstanceSettings,
  useTadweenPricing,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { Icon } from '@gitroom/frontend/components/tadween/ui';
import { isOnFreeTrial } from '@gitroom/frontend/components/tadween/billing/trial.banner';

// "Upgrade" in the sidebar (above Settings, an entry of layout/top.menu.tsx)
// and in the top bar, both to /billing. Shown when billing is on, the user
// can manage this workspace's billing (the account menu's Billing rule; super
// admins too on a workspace without a subscription), the plan isn't lifetime,
// and there is a higher plan. During a free trial the top banner
// (trial.banner.tsx) is the only place that talks about the plan.
// Styles: app/tadween/shell.scss.

// null: no Upgrade
export const useUpgradeOffer = () => {
  const user = useUser();
  const { billingEnabled } = useVariables();
  const { data: settings } = useInstanceSettings();
  const { pricing, visible } = useTadweenPricing();

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
    if (isOnFreeTrial(user)) {
      return null;
    }
    const top = Math.max(...visible(false).map(([, v]) => v.month_price));
    if ((pricing[tier]?.month_price || 0) >= top) {
      return null;
    }
    return {};
  }, [billingEnabled, user, settings, pricing, visible]);
};

// Top bar: a soft pill on desktop, the icon alone on phones
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
