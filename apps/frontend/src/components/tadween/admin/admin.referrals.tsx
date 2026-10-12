'use client';

// Growth → Referrals: every workspace that joined with a partner's link or
// code (GET /admin/console/referrals), with its status and fraud flags (a
// sign-up IP or browser shared with the partner's members: flagged, never
// blocked). A row opens a drawer where the referral can be rejected, which
// voids its rewards and commission.
import React, { FC, useEffect, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  DataColumn,
  DataTable,
  Dialog,
  Drawer,
  Input,
  Pill,
  Section,
  StatTile,
  tableQueryString,
  useOpenRow,
  useTableQuery,
} from '@gitroom/frontend/components/tadween/ui';
import { AdminPage } from './admin.shell';
import {
  AdminReferral,
  ReferralStatus,
  countQuery,
  date,
  useAdminMutation,
  useAdminReferrals,
  useExportAll,
} from './admin.api';

const STATUS: Record<ReferralStatus, { label: string; key: string; tone: 'ok' | 'warn' | 'bad' | 'brand' | 'neutral'; icon: string }> = {
  SIGNED_UP: { label: 'Signed up', key: 'tdw_admin_ref_signed_up', tone: 'neutral', icon: 'user-plus' },
  PAID: { label: 'Paid', key: 'tdw_admin_ref_paid', tone: 'brand', icon: 'credit-card' },
  QUALIFIED: { label: 'Qualified', key: 'tdw_admin_ref_qualified', tone: 'ok', icon: 'check' },
  REJECTED: { label: 'Rejected', key: 'tdw_admin_ref_rejected', tone: 'bad', icon: 'circle-x' },
  REFUNDED: { label: 'Refunded', key: 'tdw_admin_ref_refunded', tone: 'warn', icon: 'refresh-cw' },
};

const ReferralStatusPill: FC<{ status: ReferralStatus }> = ({ status }) => {
  const t = useT();
  const s = STATUS[status];
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {t(s.key, s.label)}
    </Pill>
  );
};

const FraudFlags: FC<{ flags: string[] }> = ({ flags }) => {
  const t = useT();
  if (!flags.length) {
    return <span className="pz-muted">—</span>;
  }
  return (
    <span className="inline-flex gap-[6px] flex-wrap">
      {flags.map((f) => (
        <Pill key={f} tone="warn" icon="triangle-alert">
          {f === 'shared_ip'
            ? t('tdw_admin_flag_shared_ip', 'Shared IP')
            : f === 'shared_agent'
            ? t('tdw_admin_flag_shared_browser', 'Shared browser')
            : f}
        </Pill>
      ))}
    </span>
  );
};

// Machine reasons written by the server; anything else was typed by an admin
const useRejectionReason = () => {
  const t = useT();
  return (reason: string | null) =>
    !reason
      ? '—'
      : reason === 'same_billing_account'
      ? t('tdw_admin_reason_same_billing', 'Same billing account as the partner')
      : reason === 'same_card'
      ? t('tdw_admin_reason_same_card', 'Paid with the partner’s card')
      : reason === 'rejected_by_admin'
      ? t('tdw_admin_reason_admin', 'Rejected by an admin')
      : reason;
};

const Detail: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="adm-field">
    <span className="caption pz-muted">{label}</span>
    <span className="adm-field-value">{children}</span>
  </div>
);

// ── Reject ──────────────────────────────────────────────────────────────────
const RejectDialog: FC<{
  referral: AdminReferral | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ referral, onClose, onDone }) => {
  const t = useT();
  const toast = useToaster();
  const save = useAdminMutation();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (referral) {
      setReason('');
      setErr('');
    }
  }, [referral]);

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await save(`/admin/console/referrals/${referral!.id}/reject`, 'POST', {
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      toast.show(t('tdw_admin_referral_rejected', 'Referral rejected'));
      onDone();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!referral}
      onClose={onClose}
      size="sm"
      title={t('tdw_admin_reject_referral', 'Reject this referral?')}
      description={t(
        'tdw_admin_reject_referral_desc',
        'It stops counting for {{code}}: its pending and available rewards and commission are voided. This can’t be undone.',
        { code: referral?.partner.code || '' }
      )}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('tdw_admin_cancel', 'Cancel')}
          </Button>
          <Button variant="destructive" loading={saving} onClick={submit}>
            {t('tdw_admin_reject', 'Reject')}
          </Button>
        </>
      }
    >
      <div className="grid gap-[12px]">
        {err ? (
          <Banner tone="error" title={t('tdw_admin_reject_error', 'Couldn’t reject the referral.')}>
            {err}
          </Banner>
        ) : null}
        <Input
          label={t('tdw_admin_reject_reason', 'Reason (optional)')}
          placeholder={t('tdw_admin_reject_reason_ph', 'e.g. the partner’s own second workspace')}
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </Dialog>
  );
};

// ── Detail drawer ───────────────────────────────────────────────────────────
const ReferralDrawer: FC<{
  referral: AdminReferral | null;
  onClose: () => void;
  onReject: (r: AdminReferral) => void;
}> = ({ referral, onClose, onReject }) => {
  const t = useT();
  const reasonText = useRejectionReason();
  const canReject = !!referral && referral.status !== 'REJECTED';
  return (
    <Drawer
      open={!!referral}
      onClose={onClose}
      title={referral ? referral.organization.name || referral.organizationId : ''}
      description={
        referral
          ? `${t('tdw_admin_signed_up', 'Signed up')} ${date(referral.signedUpAt)} · ${referral.organizationId}`
          : undefined
      }
      footer={
        canReject ? (
          <Button variant="ghost" className="is-danger" icon="circle-x" onClick={() => onReject(referral!)}>
            {t('tdw_admin_reject', 'Reject')}
          </Button>
        ) : undefined
      }
    >
      {referral ? (
        <div className="grid gap-[20px]">
          <div className="flex gap-[8px] flex-wrap">
            <ReferralStatusPill status={referral.status} />
            <FraudFlags flags={referral.fraudFlags} />
          </div>
          {referral.fraudFlags.length ? (
            <Banner tone="warning" title={t('tdw_admin_flagged_title', 'Flagged for review.')}>
              {t(
                'tdw_admin_flagged_body',
                'This workspace signed up from the same IP address or browser as a member of the partner’s workspace. It could be a colleague, or a self-referral.'
              )}
            </Banner>
          ) : null}
          <Section title={t('tdw_admin_referral', 'Referral')}>
            <div className="adm-fields">
              <Detail label={t('tdw_admin_col_partner', 'Partner')}>
                <a href={`/admin/partners?q=${encodeURIComponent(referral.partner.code)}`}>
                  <code className="pz-code">{referral.partner.code}</code>
                </a>
                <span className="caption pz-muted"> · {referral.partner.organizationName || '—'}</span>
              </Detail>
              <Detail label={t('tdw_admin_col_source', 'Source')}>
                {referral.source === 'CODE'
                  ? t('tdw_admin_source_code', 'Code typed after sign-up')
                  : t('tdw_admin_source_link', 'Invite link')}
              </Detail>
              <Detail label={t('tdw_admin_col_first_paid', 'First paid')}>{date(referral.firstPaidAt)}</Detail>
              <Detail label={t('tdw_admin_col_qualified', 'Qualified')}>{date(referral.qualifiedAt)}</Detail>
              <Detail label={t('tdw_admin_col_invoices', 'Paid invoices')}>{referral.invoices}</Detail>
              <Detail label={t('tdw_admin_col_reason', 'Rejection reason')}>{reasonText(referral.rejectionReason)}</Detail>
            </div>
          </Section>
        </div>
      ) : null}
    </Drawer>
  );
};

// ── Summary strip: totals of the whole list by status ──────────────────────
const useReferralCounts = () => {
  const all = useAdminReferrals(countQuery());
  const qualified = useAdminReferrals(countQuery({ status: 'QUALIFIED' }));
  const paid = useAdminReferrals(countQuery({ status: 'PAID' }));
  const flagged = useAdminReferrals(countQuery({ flags: 'flagged' }));
  return {
    all,
    qualified,
    paid,
    flagged,
    refresh: () => [all, qualified, paid, flagged].forEach((c) => c.mutate()),
  };
};

const ReferralsSummary: FC<{ counts: ReturnType<typeof useReferralCounts> }> = ({ counts }) => {
  const t = useT();
  const n = (v?: number) => (v ?? 0).toLocaleString('en-US');
  return (
    <div className="tdw-stat-grid">
      <StatTile
        loading={!counts.all.data}
        label={t('tdw_admin_referrals', 'Referrals')}
        value={n(counts.all.data?.total)}
        hint={t('tdw_admin_referrals_total_hint', 'Workspaces that joined with a code')}
        href="/admin/referrals"
      />
      <StatTile
        loading={!counts.paid.data}
        label={t('tdw_admin_ref_paid', 'Paid')}
        value={n(counts.paid.data?.total)}
        hint={t('tdw_admin_referrals_paid_hint', 'Waiting for a second payment')}
        href="/admin/referrals?status=PAID"
      />
      <StatTile
        loading={!counts.qualified.data}
        label={t('tdw_admin_ref_qualified', 'Qualified')}
        value={n(counts.qualified.data?.total)}
        hint={t('tdw_admin_referrals_qualified_hint', 'On a referrer’s ladder')}
        href="/admin/referrals?status=QUALIFIED"
      />
      <StatTile
        loading={!counts.flagged.data}
        label={t('tdw_admin_flagged', 'Flagged')}
        value={n(counts.flagged.data?.total)}
        tone={counts.flagged.data?.total ? 'warn' : 'neutral'}
        hint={t('tdw_admin_referrals_flagged_hint', 'Shared IP or browser; review them')}
        href="/admin/referrals?flags=flagged"
      />
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
export const AdminReferralsPage = () => {
  const t = useT();
  const { query, setQuery } = useTableQuery({ filters: ['status', 'flags'] });
  const qs = tableQueryString(query);
  const { data, error, isLoading, isValidating, mutate } = useAdminReferrals(qs);
  const [openId, setOpenId] = useOpenRow();
  const [rejecting, setRejecting] = useState<AdminReferral | null>(null);
  const exportAll = useExportAll();
  const reasonText = useRejectionReason();
  const counts = useReferralCounts();
  const open = data?.items.find((r) => r.id === openId) || null;

  const columns: DataColumn<AdminReferral>[] = [
    {
      key: 'workspace',
      label: t('tdw_admin_col_referred', 'Referred workspace'),
      title: 'Referred workspace',
      hideable: false,
      csv: (r) => r.organization.name,
      render: (r) => (
        <span className="grid min-w-0">
          <span className="pz-set-label truncate">{r.organization.name || '—'}</span>
          <span className="caption pz-muted truncate">{r.organizationId}</span>
        </span>
      ),
    },
    {
      key: 'partner',
      label: t('tdw_admin_col_partner', 'Partner'),
      title: 'Partner',
      csv: (r) => `${r.partner.code} ${r.partner.organizationName || ''}`.trim(),
      render: (r) => (
        <span className="grid min-w-0">
          <code className="pz-code">{r.partner.code}</code>
          <span className="caption pz-muted truncate">{r.partner.organizationName || '—'}</span>
        </span>
      ),
    },
    {
      key: 'source',
      label: t('tdw_admin_col_source', 'Source'),
      title: 'Source',
      csv: (r) => r.source,
      render: (r) => (
        <Pill icon={r.source === 'CODE' ? 'hash' : 'link'}>
          {r.source === 'CODE' ? t('tdw_admin_source_code_short', 'Code') : t('tdw_admin_source_link_short', 'Link')}
        </Pill>
      ),
    },
    { key: 'status', label: t('tdw_admin_col_status', 'Status'), title: 'Status', sortable: true, csv: (r) => r.status, render: (r) => <ReferralStatusPill status={r.status} /> },
    { key: 'flags', label: t('tdw_admin_col_flags', 'Flags'), title: 'Flags', csv: (r) => r.fraudFlags.join(' '), render: (r) => <FraudFlags flags={r.fraudFlags} /> },
    {
      key: 'reason',
      label: t('tdw_admin_col_reason', 'Rejection reason'),
      title: 'Rejection reason',
      defaultHidden: true,
      csv: (r) => r.rejectionReason,
      render: (r) => <span className="caption">{reasonText(r.rejectionReason)}</span>,
    },
    { key: 'signedUpAt', label: t('tdw_admin_signed_up', 'Signed up'), title: 'Signed up', sortable: true, csv: (r) => r.signedUpAt, render: (r) => <span className="time">{date(r.signedUpAt)}</span> },
    { key: 'firstPaidAt', label: t('tdw_admin_col_first_paid', 'First paid'), title: 'First paid', sortable: true, csv: (r) => r.firstPaidAt, render: (r) => <span className="time">{date(r.firstPaidAt)}</span> },
    { key: 'qualifiedAt', label: t('tdw_admin_col_qualified', 'Qualified'), title: 'Qualified', csv: (r) => r.qualifiedAt, render: (r) => <span className="time">{date(r.qualifiedAt)}</span> },
    { key: 'invoices', label: t('tdw_admin_col_invoices', 'Paid invoices'), title: 'Paid invoices', align: 'right', csv: (r) => r.invoices, render: (r) => <span className="time">{r.invoices}</span> },
  ];

  return (
    <AdminPage
      title={t('tdw_admin_referrals', 'Referrals')}
      description={t(
        'tdw_admin_referrals_desc',
        'Workspaces that joined with a partner’s link or code. Flags mark a sign-up from the same IP or browser as the partner’s members; review them and reject self-referrals.'
      )}
    >
      <ReferralsSummary counts={counts} />
      <DataTable
        id="admin-referrals"
        columns={columns}
        rows={data?.items || []}
        total={data?.total || 0}
        rowKey={(r) => r.id}
        query={query}
        onQueryChange={setQuery}
        loading={isLoading || isValidating}
        error={error ? error.message : null}
        onRetry={() => mutate()}
        searchPlaceholder={t('tdw_admin_search_referrals', 'Partner code, workspace id or partner id')}
        filters={[
          {
            key: 'status',
            label: t('tdw_admin_col_status', 'Status'),
            options: (Object.keys(STATUS) as ReferralStatus[]).map((s) => ({
              value: s,
              label: t(STATUS[s].key, STATUS[s].label),
            })),
          },
          {
            key: 'flags',
            label: t('tdw_admin_col_flags', 'Flags'),
            options: [{ value: 'flagged', label: t('tdw_admin_flagged', 'Flagged') }],
          },
        ]}
        onRowClick={(r) => setOpenId(r.id)}
        activeKey={openId}
        exportAll={() => exportAll<AdminReferral>('/admin/console/referrals', qs)}
        empty={t('tdw_admin_no_referrals', 'No referrals yet.')}
      />
      <ReferralDrawer
        referral={rejecting ? null : open}
        onClose={() => setOpenId(null)}
        onReject={(r) => setRejecting(r)}
      />
      <RejectDialog
        referral={rejecting}
        onClose={() => setRejecting(null)}
        onDone={() => {
          mutate();
          counts.refresh();
        }}
      />
    </AdminPage>
  );
};
