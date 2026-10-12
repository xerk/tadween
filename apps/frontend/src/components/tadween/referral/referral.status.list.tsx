'use client';

// ReferralStatusList: the workspaces someone invited, shown by initials only
// (no names, emails or people), with where each one is on the way to
// counting. Styles: app/tadween/referral.scss.
import React, { FC } from 'react';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { EmptyState, Pill } from '@gitroom/frontend/components/tadween/ui';

export type ReferralStatus = 'SIGNED_UP' | 'PAID' | 'QUALIFIED' | 'REJECTED' | 'REFUNDED';

export interface ReferralListItem {
  id: string;
  initials: string;
  status: ReferralStatus;
  source: 'LINK' | 'CODE';
  signedUpAt: string;
  firstPaidAt: string | null;
  qualifiedAt: string | null;
}

const TONE: Record<ReferralStatus, 'neutral' | 'brand' | 'ok' | 'bad' | 'warn'> = {
  SIGNED_UP: 'neutral',
  PAID: 'brand',
  QUALIFIED: 'ok',
  REJECTED: 'bad',
  REFUNDED: 'warn',
};

export const useReferralStatusLabel = () => {
  const t = useT();
  return (status: ReferralStatus) =>
    ({
      SIGNED_UP: t('tdw_ref_status_signed_up', 'Signed up'),
      PAID: t('tdw_ref_status_paid', 'Paid once'),
      QUALIFIED: t('tdw_ref_status_qualified', 'Counts'),
      REJECTED: t('tdw_ref_status_rejected', 'Not eligible'),
      REFUNDED: t('tdw_ref_status_refunded', 'Refunded'),
    }[status]);
};

export const ReferralStatusList: FC<{ referrals: ReferralListItem[] }> = ({
  referrals,
}) => {
  const t = useT();
  const statusLabel = useReferralStatusLabel();
  const date = (d: string | null) => (d ? dayjs(d).format('D MMM YYYY') : null);

  if (!referrals.length) {
    return (
      <EmptyState
        size="sm"
        icon="users"
        title={t('tdw_ref_none_title', 'No one has joined yet')}
        body={t(
          'tdw_ref_none_body',
          'Share your link. Everyone who signs up with it shows here.'
        )}
      />
    );
  }

  return (
    <ul className="tdw-ref-list">
      {referrals.map((r) => {
        const hint =
          r.status === 'QUALIFIED'
            ? t('tdw_ref_hint_qualified', 'Counts on your ladder since {{date}}', {
                date: date(r.qualifiedAt),
              })
            : r.status === 'PAID'
            ? t('tdw_ref_hint_paid', 'Counts after their second payment')
            : r.status === 'SIGNED_UP'
            ? t('tdw_ref_hint_signed_up', 'Counts once they pay')
            : r.status === 'REFUNDED'
            ? t('tdw_ref_hint_refunded', 'Their payment was refunded')
            : t('tdw_ref_hint_rejected', 'This sign-up doesn’t count');
        return (
          <li key={r.id} className="tdw-ref-row">
            <span className="tdw-ref-avatar" aria-hidden="true">
              {r.initials}
            </span>
            <span className="tdw-ref-row-text">
              <span className="tdw-ref-row-title">
                {t('tdw_ref_joined', 'Joined {{date}}', { date: date(r.signedUpAt) })}
                {r.source === 'CODE' ? (
                  <span className="tdw-ref-row-source">
                    {' · '}
                    {t('tdw_ref_by_code', 'with your code')}
                  </span>
                ) : null}
              </span>
              <span className="tdw-ref-row-hint">{hint}</span>
            </span>
            <Pill tone={TONE[r.status]}>{statusLabel(r.status)}</Pill>
          </li>
        );
      })}
    </ul>
  );
};
