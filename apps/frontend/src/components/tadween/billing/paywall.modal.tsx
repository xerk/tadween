'use client';

// The upgrade paywall: opened when the server refuses an action because of a
// plan limit (HTTP 402 from PoliciesGuard, with its `section`) or when the app
// knows ahead that a limit is reached. It names what is needed, shows usage,
// compares the plans on that one limit and sends to /billing with the plan
// that unlocks it preselected. Super admins never see it.
import React, { FC, useCallback, useEffect, useState } from 'react';
import { EventEmitter } from 'events';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useCloseAllModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  PublicPlan,
  useTadweenPricing,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';
import {
  Button,
  cx,
  Dialog,
  Icon,
} from '@gitroom/frontend/components/tadween/ui';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';
import {
  FounderNote,
  usePlanFeatureText,
} from '@gitroom/frontend/components/tadween/billing/plans.view';

const paywallEmitter = new EventEmitter();

// `section` is the server's Sections value (permission.exception.class.ts)
export const openPaywall = (reason: { section?: string; message?: string }) =>
  paywallEmitter.emit('open', reason);

// Which generated plan row a refused section is about
const ROW: Record<string, string> = {
  channel: 'channels',
  team_members: 'team',
  ai: 'ai_images',
  ai_credits: 'ai_images',
  webhooks: 'webhooks',
  posts_per_month: 'posts',
};

const rank = (v?: number) => (v === undefined ? 0 : v < 0 ? Infinity : v);

const useActiveChannels = (enabled: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()).integrations || [];
  }, []);
  const { data } = useSWR(enabled ? '/integrations/list' : null, load, {
    revalidateOnFocus: false,
  });
  return data
    ? (data as { disabled?: boolean }[]).filter((i) => !i.disabled).length
    : undefined;
};

export const PaywallModal: FC = () => {
  const t = useT();
  const user = useUser();
  const router = useRouter();
  const closeAllModals = useCloseAllModals();
  const text = usePlanFeatureText();
  const { plans, planFor } = useTadweenPricing();
  const [reason, setReason] = useState<{
    section?: string;
    message?: string;
  } | null>(null);
  const channelsUsed = useActiveChannels(reason?.section === 'channel');

  useEffect(() => {
    const open = (r: { section?: string; message?: string }) => setReason(r);
    paywallEmitter.on('open', open);
    return () => {
      paywallEmitter.off('open', open);
    };
  }, []);

  if (user?.billingExempt) {
    return null;
  }

  const row = ROW[reason?.section || ''] || 'channels';
  const current = planFor(user?.tier?.current || '');
  const value = (p?: PublicPlan) =>
    p?.featureItems.find((i) => i.key === row)?.value;
  const sorted = [...plans].sort(
    (a, b) => a.monthlyPriceUsd - b.monthlyPriceUsd
  );
  // The cheapest plan that raises this limit (or any plan for a workspace without one)
  const unlock =
    sorted.find(
      (p) => p !== current && rank(value(p)) > rank(value(current))
    ) ||
    // Without a plan, any plan unlocks it; on the top plan nothing does
    (!current
      ? sorted.find((p) => p.mostPopular) || sorted[sorted.length - 1]
      : undefined);

  const title =
    reason?.section === 'channel'
      ? t('tdw_paywall_channels', 'Connect more channels')
      : reason?.section === 'team_members'
      ? t('tdw_paywall_team', 'Invite more team members')
      : reason?.section === 'ai'
      ? t('tdw_paywall_ai', 'Get more AI images')
      : reason?.section === 'ai_credits'
      ? t('tdw_paywall_ai_credits', 'You’ve used your AI credits this month')
      : reason?.section === 'webhooks'
      ? t('tdw_paywall_webhooks', 'Add more webhooks')
      : t('tdw_paywall_generic', 'Upgrade your plan');

  const close = () => setReason(null);
  // Out of AI credits: a top-up pack is the other way out
  const credits = reason?.section === 'ai_credits';
  return (
    <Dialog
      open={!!reason && plans.length > 0}
      onClose={close}
      title={title}
      description={
        unlock
          ? t('tdw_paywall_desc', '{{name}} gives you {{what}}.', {
              name: unlock.name,
              // lower-case the start only: "AI" stays upper case
              what: text(
                unlock.featureItems.find((i) => i.key === row) || { key: row }
              ).replace(/^\S+/, (w) =>
                w === w.toUpperCase() ? w : w.toLowerCase()
              ),
            })
          : reason?.message ||
            t(
              'tdw_paywall_top_plan',
              'You have reached the limit of your plan.'
            )
      }
      footer={
        <>
          <span className="flex-1" />
          <Button variant="ghost" onClick={close}>
            {unlock ? t('tdw_not_now', 'Not now') : t('tdw_close', 'Close')}
          </Button>
          {credits ? (
            <Button
              variant={unlock ? 'secondary' : 'primary'}
              icon="sparkles"
              onClick={() => {
                close();
                modals.closeAll();
                router.push('/billing?credits=1');
              }}
            >
              {t('tdw_buy_more_credits', 'Buy more credits')}
            </Button>
          ) : null}
          {unlock ? (
            <Button
              variant="primary"
              onClick={async () => {
                close();
                // The refused action's modal (invite, composer…) would stay
                // open over Billing: close it like its close button does, so
                // a composer with unsaved text asks first and can be kept
                if (
                  !(await closeAllModals({
                    description: t(
                      'are_you_sure_you_want_to_close_this_modal_all_data_will_be_lost',
                      'Are you sure you want to close this modal? (all data will be lost)'
                    ),
                    approveLabel: t('yes_close_it', 'Yes, close it!'),
                    cancelLabel: t('no', 'No'),
                  }))
                ) {
                  return;
                }
                router.push(`/billing?plan=${unlock.tier}`);
              }}
            >
              {t('tdw_upgrade_to', 'Upgrade to {{name}}', {
                name: unlock.name,
              })}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="tdw-paywall-modal">
        {reason?.section === 'channel' &&
        channelsUsed !== undefined &&
        current ? (
          <p className="tdw-paywall-usage">
            <Icon name="layers" size={16} />
            {t(
              'tdw_paywall_channels_used',
              '{{used}} of {{limit}} channels used',
              {
                used: channelsUsed,
                limit: current.channels,
              }
            )}
          </p>
        ) : null}
        <div className="tdw-paywall-compare">
          {sorted.map((p) => {
            const item = p.featureItems.find((i) => i.key === row);
            return (
              <div
                key={p.key}
                className={cx(
                  'tdw-paywall-plan',
                  p === unlock && 'is-unlock',
                  p === current && 'is-current'
                )}
              >
                <span className="tdw-paywall-plan-name">
                  {p.name}
                  {p === current ? (
                    <span className="tdw-plan-flag is-current">
                      {t('tdw_your_plan', 'Your plan')}
                    </span>
                  ) : null}
                </span>
                <span className="tdw-paywall-plan-row">
                  {item ? text(item) : t('tdw_not_included', 'Not included')}
                </span>
                <span className="tdw-paywall-plan-price">
                  {formatUsd(p.monthlyPriceUsd)}
                  {t('tdw_per_month_short', '/month')}
                </span>
                <FounderNote plan={p} period="MONTHLY" compact />
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
};
