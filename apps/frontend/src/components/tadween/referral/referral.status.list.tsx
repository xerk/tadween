'use client';

// ReferralStatusList: the workspaces someone invited, as a compact list:
// initials only (no names, emails or people), when they joined, where each
// one is on the way to counting, and a status pill. The first 5, then
// "Show all". Styles: app/tadween/referral.scss.
import React, { FC, useId, useState } from 'react';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Pill } from '@gitroom/frontend/components/tadween/ui';

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

// rows shown before "Show all"
const FIRST = 5;

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
  const [all, setAll] = useState(false);
  const listId = useId();
  const date = (d: string | null) => (d ? dayjs(d).format('D MMM YYYY') : null);

  const hint = (r: ReferralListItem) =>
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

  const shown = all ? referrals : referrals.slice(0, FIRST);

  return (
    <div className="tdw-ref-people">
      <ul id={listId} className="tdw-ref-list">
        {shown.map((r) => (
          <li key={r.id} className="tdw-ref-item">
            <span className="tdw-ref-avatar" aria-hidden="true">
              {r.initials}
            </span>
            <span className="tdw-ref-item-text">
              <span className="tdw-ref-item-title">
                {t('tdw_ref_joined_on', 'Joined {{date}}', { date: date(r.signedUpAt) })}
                {r.source === 'CODE' ? ` · ${t('tdw_ref_by_code', 'with your code')}` : null}
              </span>
              <span className="tdw-ref-item-sub">{hint(r)}</span>
            </span>
            <Pill tone={TONE[r.status]}>{statusLabel(r.status)}</Pill>
          </li>
        ))}
      </ul>
      {referrals.length > FIRST ? (
        <button type="button" className="tdw-ref-text-btn" onClick={() => setAll(!all)} aria-expanded={all} aria-controls={listId}>
          {all
            ? t('tdw_ref_show_less', 'Show less')
            : t('tdw_ref_show_all', 'Show all ({{count}})', { count: referrals.length })}
        </button>
      ) : null}
    </div>
  );
};
