'use client';

// A calm line above the app while the workspace is on a free trial: days
// left, and a way to add a card before Stripe ends the trial. When the last
// renewal failed (Stripe past_due/unpaid) it asks for a new card instead:
// that is not a trial, even though Organization.isTrailing is set for it.
import React, { FC, useCallback, useState } from 'react';
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

// Stripe statuses of a failed renewal (PAYMENT_FAILED_STATUSES on the server)
export const isPaymentFailed = (status?: string | null) =>
  status === 'past_due' || status === 'unpaid';

const PaymentFailedBar: FC = () => {
  const t = useT();
  const user = useUser();
  const fetch = useFetch();
  const [opening, setOpening] = useState(false);
  // Card and invoices live in the Stripe customer portal
  const openPortal = useCallback(async () => {
    setOpening(true);
    const tab = window.open('', '_blank');
    try {
      const { portal } = await (await fetch('/billing/portal')).json();
      if (portal && tab) {
        tab.location.href = portal;
      } else {
        tab?.close();
      }
    } finally {
      setOpening(false);
    }
  }, []);
  const manages = ['ADMIN', 'SUPERADMIN'].includes(user?.role || '');
  return (
    <TadweenScope>
      <div className="tdw-trial-bar is-failed" role="alert">
        <Icon name="triangle-alert" size={16} />
        <span>
          {manages
            ? t(
                'tdw_payment_failed_bar',
                'Your last payment failed. Update your card to keep posting.'
              )
            : t(
                'tdw_payment_failed_bar_member',
                'The last payment for this workspace failed. Ask an admin to update the card.'
              )}
        </span>
        {manages ? (
          <>
            <span className="tdw-trial-sep" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              className="tdw-trial-link"
              disabled={opening}
              onClick={openPortal}
            >
              {t('tdw_update_card', 'Update card')}
            </button>
          </>
        ) : null}
      </div>
    </TadweenScope>
  );
};

export const TrialBanner: FC = () => {
  const t = useT();
  const user = useUser();
  const failed = isPaymentFailed(user?.subscriptionStatus);
  const { data } = useTrialInfo(!!user?.isTrailing && !failed);
  if (failed) {
    return <PaymentFailedBar />;
  }
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
