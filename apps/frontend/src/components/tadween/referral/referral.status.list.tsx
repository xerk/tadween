'use client';

// ReferralStatusList: the workspaces someone invited, as a table: initials
// only (no names, emails or people), where each one is on the way to
// counting, the status, the sign-up and the first payment. An empty state
// until someone joins. Styles: app/tadween/referral.scss.
import React, { FC } from 'react';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { EmptyState, Pill, Table } from '@gitroom/frontend/components/tadween/ui';

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

  return (
    <div className="tdw-partners-scroll tdw-ref-table">
      <Table
        rowKey={(r) => r.id}
        rows={referrals}
        columns={[
          {
            key: 'workspace',
            label: t('tdw_ref_col_workspace', 'Workspace'),
            render: (r) => (
              <span className="tdw-ref-who">
                <span className="tdw-ref-avatar" aria-hidden="true">
                  {r.initials}
                </span>
                <span className="tdw-ref-who-text">
                  <span className="tdw-ref-who-hint">{hint(r)}</span>
                  {r.source === 'CODE' ? (
                    <span className="caption pz-muted">{t('tdw_ref_by_code', 'with your code')}</span>
                  ) : null}
                </span>
              </span>
            ),
          },
          {
            key: 'status',
            label: t('tdw_ref_col_status', 'Status'),
            render: (r) => <Pill tone={TONE[r.status]}>{statusLabel(r.status)}</Pill>,
          },
          {
            key: 'joined',
            label: t('tdw_ref_col_joined', 'Joined'),
            render: (r) => <span className="tdw-partners-num">{date(r.signedUpAt)}</span>,
          },
          {
            key: 'paid',
            label: t('tdw_ref_col_first_paid', 'First paid'),
            render: (r) =>
              r.firstPaidAt ? (
                <span className="tdw-partners-num">{date(r.firstPaidAt)}</span>
              ) : (
                <span className="pz-muted">—</span>
              ),
          },
        ]}
      />
    </div>
  );
};
