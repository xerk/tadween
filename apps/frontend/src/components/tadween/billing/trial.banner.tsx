'use client';

// A calm line above the app while the workspace is on a free trial: days
// left, and a way to add a card before Stripe ends the trial.
import React, { FC, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Icon, TadweenScope } from '@gitroom/frontend/components/tadween/ui';

const useTrialInfo = (enabled: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(path);
    }
    return (await res.json()) as {
      trialEnd: string | null;
      hasPaymentMethod: boolean;
    };
  }, []);
  return useSWR(enabled ? '/billing/trial' : null, load, {
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });
};

export const TrialBanner: FC = () => {
  const t = useT();
  const user = useUser();
  const { data } = useTrialInfo(!!user?.isTrailing);
  if (!user?.isTrailing || !data?.trialEnd) {
    return null;
  }
  const days = Math.max(
    0,
    Math.ceil((new Date(data.trialEnd).getTime() - Date.now()) / 86_400_000)
  );
  return (
    <TadweenScope>
      <div className="tdw-trial-bar" role="status">
        <Icon name="sparkles" size={16} />
        <span>
          {days === 1
            ? t('tdw_trial_days_left_one', '1 day left in your trial')
            : t('tdw_trial_days_left', '{{n}} days left in your trial', {
                n: days,
              })}
        </span>
        <span className="tdw-trial-sep" aria-hidden="true">
          ·
        </span>
        <Link href="/billing" className="tdw-trial-link">
          {data.hasPaymentMethod
            ? t('tdw_manage_billing', 'Manage billing')
            : t('tdw_add_payment_method', 'Add payment method')}
        </Link>
      </div>
    </TadweenScope>
  );
};
