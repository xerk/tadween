'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useCallback, useMemo, useState } from 'react';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import {
  Button,
  Input,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import { CheckList } from '@gitroom/frontend/components/tadween/billing/pricing';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useRouter } from 'next/navigation';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const LifetimeDeal = () => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const [code, setCode] = useState('');
  const toast = useToaster();
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const fireEvents = useFireEvents();
  const claim = useCallback(async () => {
    const { success } = await (
      await fetch('/billing/lifetime', {
        body: JSON.stringify({
          code,
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();
    if (success) {
      mutate('/user/self');
      toast.show('Successfully claimed the code');
      fireEvents('lifetime_claimed');
    } else {
      toast.show('Code already claimed or invalid code', 'warning');
    }
    setCode('');
  }, [code]);
  const nextPackage = useMemo(() => {
    if (user?.tier?.current === 'STANDARD') {
      return 'PRO';
    }
    return 'STANDARD';
  }, [user?.tier]);
  const features = useMemo(() => {
    if (!user?.tier) {
      return [];
    }
    const currentPricing = user?.tier;
    const channelsOr = currentPricing.channel;
    const list = [];
    list.push(
      `${user.totalChannels} ${
        user.totalChannels === 1 ? 'channel' : 'channels'
      }`
    );
    list.push(
      `${
        currentPricing.posts_per_month > 10000
          ? 'Unlimited'
          : currentPricing.posts_per_month
      } posts per month`
    );
    if (currentPricing.team_members) {
      list.push(`Unlimited team members`);
    }
    if (currentPricing?.ai) {
      list.push(`AI auto-complete`);
    }
    return list;
  }, [user]);
  const nextFeature = useMemo(() => {
    if (!user?.tier) {
      return [];
    }
    const currentPricing = pricing[nextPackage];
    const channelsOr = currentPricing.channel;
    const list = [];
    list.push(`${channelsOr} ${channelsOr === 1 ? 'channel' : 'channels'}`);
    list.push(
      `${
        currentPricing.posts_per_month > 10000
          ? 'Unlimited'
          : currentPricing.posts_per_month
      } posts per month`
    );
    if (currentPricing.team_members) {
      list.push(`Unlimited team members`);
    }
    if (currentPricing?.ai) {
      list.push(`AI auto-complete`);
    }
    return list;
  }, [user, nextPackage]);
  if (!user?.tier) {
    return null;
  }
  if (user?.id && user?.tier?.current !== 'FREE' && !user?.isLifetime) {
    router.replace('/billing');
    return null;
  }
  // Tadween: design-system cards; the claim logic above is unchanged
  const next =
    user?.tier?.current === 'PRO'
      ? 'EXTRA'
      : !user?.tier?.current
      ? 'FREE'
      : user?.tier?.current === 'STANDARD'
      ? 'PRO'
      : 'STANDARD';
  return (
    <TadweenScope className="tdw-billing">
      <div className="pz-billing-grid">
        <section className="pz-bill-card">
          <span className="caption pz-muted">
            {t('tdw_current_package', 'Current package')}
          </span>
          <h3 className="title-2 m-0">
            {user?.totalChannels > 8 ? 'EXTRA' : user?.tier?.current}
          </h3>
          <CheckList items={features} />
        </section>
        <section className="pz-bill-card">
          <span className="caption pz-muted">
            {t('tdw_next_package', 'Next package')}
          </span>
          <h3 className="title-2 m-0">{next}</h3>
          <CheckList
            items={
              user?.tier?.current === 'PRO'
                ? [`${(user?.totalChannels || 0) + 5} channels`]
                : nextFeature
            }
          />
          <div className="flex items-end gap-[8px] mt-[8px]">
            <Input
              className="flex-1"
              label={t('label_code', 'Code')}
              placeholder={t('tdw_enter_code', 'Enter your code')}
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              variant="primary"
              disabled={code.length < 4}
              onClick={claim}
            >
              {t('tdw_claim_code', 'Claim code')}
            </Button>
          </div>
        </section>
      </div>
    </TadweenScope>
  );
};
