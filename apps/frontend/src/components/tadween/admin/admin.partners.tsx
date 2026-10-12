'use client';

// Growth → Partners: every workspace's partner row (REFERRER for Invite & earn,
// AFFILIATE for invited creators), server-side paged, sorted, searched and
// filtered (GET /admin/console/partners). "Add affiliate" turns a user's
// workspace into an affiliate. A row opens a drawer with its numbers and the
// actions: suspend, kind, commission, ambassador, apply rewards now and the
// ladder rewards applied by hand in Stripe. Rules: docs/tadween/partners.md.
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
  Switch,
  Table,
  tableQueryString,
  useOpenRow,
  useTableQuery,
} from '@gitroom/frontend/components/tadween/ui';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';
import { AdminPage } from './admin.shell';
import {
  AdminPartner,
  countQuery,
  date,
  useAdminMutation,
  useAdminPartners,
  useExportAll,
} from './admin.api';

const usd = (cents: number) => formatUsd(cents / 100);

// Blank = no value; anything else must be a whole number in the range
const parseWhole = (value: string, min: number, max: number) => {
  const text = value.trim();
  if (!text) {
    return null;
  }
  const n = Number(text);
  return Number.isInteger(n) && n >= min && n <= max ? n : NaN;
};

export const PartnerKindPill: FC<{ kind: AdminPartner['kind'] }> = ({ kind }) => {
  const t = useT();
  return kind === 'AFFILIATE' ? (
    <Pill tone="brand" icon="award">
      {t('tdw_admin_partner_affiliate', 'Affiliate')}
    </Pill>
  ) : (
    <Pill icon="user-plus">{t('tdw_admin_partner_referrer', 'Referrer')}</Pill>
  );
};

export const PartnerStatusPill: FC<{ status: AdminPartner['status'] }> = ({ status }) => {
  const t = useT();
  return status === 'ACTIVE' ? (
    <Pill tone="ok" icon="check">
      {t('tdw_admin_status_active', 'Active')}
    </Pill>
  ) : (
    <Pill tone="warn" icon="lock">
      {t('tdw_admin_partner_suspended', 'Suspended')}
    </Pill>
  );
};

const Detail: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="adm-field">
    <span className="caption pz-muted">{label}</span>
    <span className="adm-field-value">{children}</span>
  </div>
);

// ── Add affiliate ───────────────────────────────────────────────────────────
const AddAffiliateDialog: FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, onClose, onDone }) => {
  const t = useT();
  const toast = useToaster();
  const save = useAdminMutation();
  const [email, setEmail] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (open) {
      setEmail('');
      setRate('');
      setErr('');
    }
  }, [open]);

  const commissionRate = parseWhole(rate, 1, 90);
  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await save('/admin/console/partners', 'POST', {
        email: email.trim(),
        ...(commissionRate !== null ? { commissionRate } : {}),
      });
      toast.show(t('tdw_admin_affiliate_added', '{{email}} is now an affiliate', { email: email.trim() }));
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
      open={open}
      onClose={onClose}
      title={t('tdw_admin_add_affiliate', 'Add affiliate')}
      description={t(
        'tdw_admin_add_affiliate_desc',
        'The user’s own workspace becomes an affiliate: commission on paid invoices instead of the rewards ladder, and a longer trial for their audience.'
      )}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('tdw_admin_cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!/^\S+@\S+\.\S+$/.test(email.trim()) || Number.isNaN(commissionRate)}
            onClick={submit}
          >
            {t('tdw_admin_add_affiliate', 'Add affiliate')}
          </Button>
        </>
      }
    >
      <div className="grid gap-[12px]">
        {err ? (
          <Banner tone="error" title={t('tdw_admin_affiliate_error', 'Couldn’t add the affiliate.')}>
            {err}
          </Banner>
        ) : null}
        <Input
          type="email"
          dir="ltr"
          label={t('tdw_admin_email', 'Email')}
          placeholder="creator@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          inputMode="numeric"
          dir="ltr"
          label={t('tdw_admin_commission_rate', 'Commission rate (%)')}
          hint={t('tdw_admin_commission_rate_hint', 'Optional, 1–90. Blank uses the tier rate: 30%, 35% from 10 paying customers, 40% from 30.')}
          error={Number.isNaN(commissionRate) ? t('tdw_admin_rate_invalid', 'A whole number from 1 to 90') : undefined}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </div>
    </Dialog>
  );
};

// ── Detail drawer ───────────────────────────────────────────────────────────
const PartnerDrawer: FC<{
  partner: AdminPartner | null;
  onClose: () => void;
  onChanged: () => void;
}> = ({ partner, onClose, onChanged }) => {
  const t = useT();
  const toast = useToaster();
  const save = useAdminMutation();
  const [busy, setBusy] = useState<string | null>(null);
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  useEffect(() => {
    setRate(partner?.commissionRate ? String(partner.commissionRate) : '');
    setMonths(partner ? String(partner.commissionMonths) : '');
  }, [partner?.id, partner?.commissionRate, partner?.commissionMonths]);

  const run = async (key: string, action: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await action();
      toast.show(done);
      onChanged();
    } catch (e) {
      toast.show((e as Error).message, 'warning');
    } finally {
      setBusy(null);
    }
  };

  const update = (key: string, body: Record<string, unknown>, done: string) =>
    run(key, () => save(`/admin/console/partners/${partner!.id}`, 'PUT', body), done);

  const commissionRate = parseWhole(rate, 1, 90);
  const commissionMonths = parseWhole(months, 1, 120);
  const commissionChanged =
    !!partner &&
    (commissionRate !== partner.commissionRate || commissionMonths !== partner.commissionMonths);

  const manualLabel = (note: string | null) =>
    note === 'founder_for_life'
      ? t('tdw_admin_reward_founder', 'Founder price for life')
      : t('tdw_admin_reward_next_plan', 'Next plan free for 12 months');

  return (
    <Drawer
      open={!!partner}
      onClose={onClose}
      size="lg"
      title={partner ? partner.organization?.name || partner.code : ''}
      description={
        partner
          ? `${partner.code} · ${partner.user?.email || '—'} · ${t('tdw_admin_created', 'Created')} ${date(partner.createdAt)}`
          : undefined
      }
      footer={
        partner ? (
          <>
            {partner.status === 'ACTIVE' ? (
              <Button
                variant="ghost"
                className="is-danger"
                icon="lock"
                loading={busy === 'status'}
                onClick={() =>
                  update('status', { status: 'SUSPENDED' }, t('tdw_admin_partner_suspended_done', 'Partner suspended'))
                }
              >
                {t('tdw_admin_suspend', 'Suspend')}
              </Button>
            ) : (
              <Button
                icon="check"
                loading={busy === 'status'}
                onClick={() =>
                  update('status', { status: 'ACTIVE' }, t('tdw_admin_partner_reactivated', 'Partner reactivated'))
                }
              >
                {t('tdw_admin_reactivate', 'Reactivate')}
              </Button>
            )}
            <Button
              variant="primary"
              icon="refresh-cw"
              loading={busy === 'apply'}
              onClick={() =>
                run(
                  'apply',
                  () => save(`/admin/console/partners/${partner.id}/apply`, 'POST'),
                  t('tdw_admin_rewards_applied', 'Rewards applied')
                )
              }
            >
              {t('tdw_admin_apply_now', 'Apply rewards now')}
            </Button>
          </>
        ) : undefined
      }
    >
      {partner ? (
        <div className="grid gap-[20px]">
          <div className="flex gap-[8px] flex-wrap">
            <PartnerKindPill kind={partner.kind} />
            <PartnerStatusPill status={partner.status} />
            {partner.ambassador ? (
              <Pill tone="brand" icon="badge-check">
                {t('tdw_admin_ambassador', 'Ambassador')}
              </Pill>
            ) : null}
          </div>

          <Section title={t('tdw_admin_partner_numbers', 'Numbers')}>
            <div className="tdw-stat-grid">
              <StatTile label={t('tdw_admin_col_referrals', 'Referrals')} value={partner.referrals.toLocaleString('en-US')} />
              <StatTile label={t('tdw_admin_col_qualified', 'Qualified')} value={partner.qualified.toLocaleString('en-US')} />
              <StatTile label={t('tdw_admin_col_paying', 'Paying')} value={partner.paying.toLocaleString('en-US')} />
              <StatTile label={t('tdw_admin_col_pending', 'Pending')} value={usd(partner.pendingCents)} />
              <StatTile label={t('tdw_admin_col_available', 'Available')} value={usd(partner.availableCents)} />
              <StatTile label={t('tdw_admin_col_paid', 'Paid')} value={usd(partner.paidCents)} />
            </div>
          </Section>

          <Section title={t('tdw_admin_partner_program', 'Program')}>
            <div className="grid gap-[16px]">
              <div className="adm-key-row">
                <Detail label={t('tdw_admin_col_kind', 'Kind')}>
                  {partner.kind === 'AFFILIATE'
                    ? t('tdw_admin_kind_affiliate_desc', 'Affiliate: commission on paid invoices')
                    : t('tdw_admin_kind_referrer_desc', 'Referrer: the Invite & earn rewards ladder')}
                </Detail>
                <Button
                  size="sm"
                  loading={busy === 'kind'}
                  onClick={() =>
                    update(
                      'kind',
                      { kind: partner.kind === 'AFFILIATE' ? 'REFERRER' : 'AFFILIATE' },
                      t('tdw_admin_partner_saved', 'Partner saved')
                    )
                  }
                >
                  {partner.kind === 'AFFILIATE'
                    ? t('tdw_admin_make_referrer', 'Make referrer')
                    : t('tdw_admin_make_affiliate', 'Make affiliate')}
                </Button>
              </div>
              <div className="tdw-partners-admin-commission">
                <Input
                  inputMode="numeric"
                  dir="ltr"
                  label={t('tdw_admin_commission_rate', 'Commission rate (%)')}
                  placeholder={t('tdw_admin_tier_rate', 'Tier rate')}
                  hint={t('tdw_admin_commission_blank', 'Blank uses the tier rate.')}
                  error={Number.isNaN(commissionRate) ? t('tdw_admin_rate_invalid', 'A whole number from 1 to 90') : undefined}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
                <Input
                  inputMode="numeric"
                  dir="ltr"
                  label={t('tdw_admin_commission_months', 'Commission months')}
                  error={
                    Number.isNaN(commissionMonths) || commissionMonths === null
                      ? t('tdw_admin_months_invalid', 'A whole number from 1 to 120')
                      : undefined
                  }
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                />
                <Button
                  variant="primary"
                  loading={busy === 'commission'}
                  disabled={
                    !commissionChanged ||
                    Number.isNaN(commissionRate) ||
                    Number.isNaN(commissionMonths) ||
                    commissionMonths === null
                  }
                  onClick={() =>
                    update(
                      'commission',
                      { commissionRate, commissionMonths },
                      t('tdw_admin_partner_saved', 'Partner saved')
                    )
                  }
                >
                  {t('tdw_admin_save', 'Save')}
                </Button>
              </div>
              <Switch
                checked={partner.ambassador}
                disabled={busy === 'ambassador'}
                label={t('tdw_admin_ambassador', 'Ambassador')}
                description={t('tdw_admin_ambassador_desc', 'The badge on Invite & earn. Given automatically at 5 qualified referrals.')}
                onChange={(ambassador) =>
                  update('ambassador', { ambassador }, t('tdw_admin_partner_saved', 'Partner saved'))
                }
              />
            </div>
          </Section>

          <Section
            title={t('tdw_admin_manual_rewards', 'Rewards to apply by hand')}
            description={t(
              'tdw_admin_manual_rewards_desc',
              'Applied by hand in Stripe: a 100% coupon for 12 months on the next plan, or moving the subscription to the founder price. Mark each one applied once it’s done.'
            )}
          >
            <Table
              dense
              rowKey={(r) => r.id}
              rows={partner.manualRewards}
              empty={t('tdw_admin_no_manual_rewards', 'Nothing to apply')}
              columns={[
                {
                  key: 'reward',
                  label: t('tdw_admin_reward', 'Reward'),
                  render: (r) => (
                    <span className="grid min-w-0">
                      <span className="pz-set-label">{manualLabel(r.note)}</span>
                      <span className="caption pz-muted">
                        {t('tdw_admin_ladder_step', 'Step {{n}}', { n: r.step ?? '—' })} · {date(r.createdAt)}
                      </span>
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: '',
                  align: 'right',
                  render: (r) => (
                    <Button
                      size="sm"
                      icon="check"
                      loading={busy === r.id}
                      onClick={() =>
                        run(
                          r.id,
                          () => save(`/admin/console/partners/rewards/${r.id}/applied`, 'POST'),
                          t('tdw_admin_reward_marked', 'Marked applied')
                        )
                      }
                    >
                      {t('tdw_admin_mark_applied', 'Mark applied')}
                    </Button>
                  ),
                },
              ]}
            />
          </Section>

          {partner.kind === 'AFFILIATE' ? (
            <Section title={t('tdw_admin_payout_settings', 'Payout settings')}>
              <div className="adm-fields">
                <Detail label={t('tdw_admin_payout_preference', 'Preference')}>
                  {partner.payoutPreference === 'CASH'
                    ? t('tdw_admin_payout_cash', 'Cash, monthly')
                    : t('tdw_admin_payout_balance', 'Tadween balance')}
                </Detail>
                <Detail label={t('tdw_admin_col_method', 'Method')}>{partner.payoutMethod || '—'}</Detail>
                <Detail label={t('tdw_admin_col_country', 'Country')}>{partner.country || '—'}</Detail>
                <Detail label={t('tdw_admin_mawthooq', 'Mawthooq licence')}>{partner.mawthooqNumber || '—'}</Detail>
                <Detail label={t('tdw_admin_w8ben', 'W-8BEN confirmed')}>{date(partner.taxFormAcceptedAt)}</Detail>
                <Detail label={t('tdw_admin_approved', 'Approved')}>{date(partner.approvedAt)}</Detail>
              </div>
            </Section>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
};

// ── Summary strip: totals of the whole list by kind and status ─────────────
const usePartnerCounts = () => {
  const all = useAdminPartners(countQuery());
  const affiliates = useAdminPartners(countQuery({ kind: 'AFFILIATE' }));
  const referrers = useAdminPartners(countQuery({ kind: 'REFERRER' }));
  const suspended = useAdminPartners(countQuery({ status: 'SUSPENDED' }));
  return {
    all,
    affiliates,
    referrers,
    suspended,
    refresh: () => [all, affiliates, referrers, suspended].forEach((c) => c.mutate()),
  };
};

const PartnersSummary: FC<{ counts: ReturnType<typeof usePartnerCounts> }> = ({ counts }) => {
  const t = useT();
  const n = (v?: number) => (v ?? 0).toLocaleString('en-US');
  return (
    <div className="tdw-stat-grid">
      <StatTile
        loading={!counts.all.data}
        label={t('tdw_admin_partners_total', 'Partners')}
        value={n(counts.all.data?.total)}
        hint={t('tdw_admin_partners_total_hint', 'Workspaces with a referral code')}
        href="/admin/partners"
      />
      <StatTile
        loading={!counts.affiliates.data}
        label={t('tdw_admin_partners_affiliates', 'Affiliates')}
        value={n(counts.affiliates.data?.total)}
        hint={t('tdw_admin_partners_affiliates_hint', 'Earn commission')}
        href="/admin/partners?kind=AFFILIATE"
      />
      <StatTile
        loading={!counts.referrers.data}
        label={t('tdw_admin_partners_referrers', 'Referrers')}
        value={n(counts.referrers.data?.total)}
        hint={t('tdw_admin_partners_referrers_hint', 'Climb the Invite & earn ladder')}
        href="/admin/partners?kind=REFERRER"
      />
      <StatTile
        loading={!counts.suspended.data}
        label={t('tdw_admin_partner_suspended', 'Suspended')}
        value={n(counts.suspended.data?.total)}
        tone={counts.suspended.data?.total ? 'warn' : 'neutral'}
        hint={t('tdw_admin_partners_suspended_hint', 'Links paused')}
        href="/admin/partners?status=SUSPENDED"
      />
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
export const AdminPartnersPage = () => {
  const t = useT();
  const { query, setQuery } = useTableQuery({ filters: ['kind', 'status'] });
  const qs = tableQueryString(query);
  const { data, error, isLoading, isValidating, mutate } = useAdminPartners(qs);
  const [openId, setOpenId] = useOpenRow();
  const [adding, setAdding] = useState(false);
  const exportAll = useExportAll();
  const counts = usePartnerCounts();
  // no single-partner endpoint: the drawer shows a row of the current page
  const open = data?.items.find((p) => p.id === openId) || null;

  const columns: DataColumn<AdminPartner>[] = [
    {
      key: 'code',
      label: t('tdw_admin_col_partner', 'Partner'),
      title: 'Partner',
      sortable: true,
      hideable: false,
      csv: (p) => p.code,
      render: (p) => (
        <span className="grid min-w-0">
          <span className="pz-set-label truncate">{p.organization?.name || '—'}</span>
          <span className="caption pz-muted truncate">
            <code className="pz-code">{p.code}</code> · {p.user?.email || '—'}
          </span>
        </span>
      ),
    },
    { key: 'workspace', label: t('tdw_admin_col_workspace', 'Workspace'), title: 'Workspace', defaultHidden: true, csv: (p) => p.organization?.name, render: (p) => p.organization?.name || '—' },
    { key: 'email', label: t('tdw_admin_col_owner', 'Owner email'), title: 'Owner email', defaultHidden: true, csv: (p) => p.user?.email, render: (p) => p.user?.email || '—' },
    {
      key: 'kind',
      label: t('tdw_admin_col_kind', 'Kind'),
      title: 'Kind',
      csv: (p) => p.kind,
      render: (p) => (
        <span className="inline-flex gap-[6px] flex-wrap">
          <PartnerKindPill kind={p.kind} />
          {p.ambassador ? (
            <Pill tone="brand" icon="badge-check">
              {t('tdw_admin_ambassador', 'Ambassador')}
            </Pill>
          ) : null}
        </span>
      ),
    },
    { key: 'status', label: t('tdw_admin_col_status', 'Status'), title: 'Status', csv: (p) => p.status, render: (p) => <PartnerStatusPill status={p.status} /> },
    { key: 'referrals', label: t('tdw_admin_col_referrals', 'Referrals'), title: 'Referrals', sortable: true, align: 'right', csv: (p) => p.referrals, render: (p) => <span className="time">{p.referrals}</span> },
    { key: 'qualified', label: t('tdw_admin_col_qualified', 'Qualified'), title: 'Qualified', align: 'right', csv: (p) => p.qualified, render: (p) => <span className="time">{p.qualified}</span> },
    { key: 'paying', label: t('tdw_admin_col_paying', 'Paying'), title: 'Paying', align: 'right', csv: (p) => p.paying, render: (p) => <span className="time">{p.paying}</span> },
    { key: 'pending', label: t('tdw_admin_col_pending', 'Pending'), title: 'Pending (USD)', align: 'right', csv: (p) => (p.pendingCents / 100).toFixed(2), render: (p) => <span className="time">{usd(p.pendingCents)}</span> },
    { key: 'available', label: t('tdw_admin_col_available', 'Available'), title: 'Available (USD)', align: 'right', csv: (p) => (p.availableCents / 100).toFixed(2), render: (p) => <span className="time">{usd(p.availableCents)}</span> },
    { key: 'paid', label: t('tdw_admin_col_paid', 'Paid'), title: 'Paid (USD)', align: 'right', csv: (p) => (p.paidCents / 100).toFixed(2), render: (p) => <span className="time">{usd(p.paidCents)}</span> },
    { key: 'createdAt', label: t('tdw_admin_col_created', 'Created'), title: 'Created', sortable: true, csv: (p) => p.createdAt, render: (p) => <span className="time">{date(p.createdAt)}</span> },
  ];

  return (
    <AdminPage
      title={t('tdw_admin_partners', 'Partners')}
      description={t(
        'tdw_admin_partners_desc',
        'Every workspace’s referral code. Referrers climb the Invite & earn ladder; affiliates earn commission on paid invoices. Open one to change its program or apply rewards.'
      )}
      action={
        <Button variant="primary" icon="user-plus" onClick={() => setAdding(true)}>
          {t('tdw_admin_add_affiliate', 'Add affiliate')}
        </Button>
      }
    >
      <PartnersSummary counts={counts} />
      <DataTable
        id="admin-partners"
        columns={columns}
        rows={data?.items || []}
        total={data?.total || 0}
        rowKey={(p) => p.id}
        query={query}
        onQueryChange={setQuery}
        loading={isLoading || isValidating}
        error={error ? error.message : null}
        onRetry={() => mutate()}
        searchPlaceholder={t('tdw_admin_search_partners', 'Code, workspace id or user id')}
        filters={[
          {
            key: 'kind',
            label: t('tdw_admin_col_kind', 'Kind'),
            options: [
              { value: 'AFFILIATE', label: t('tdw_admin_partner_affiliate', 'Affiliate') },
              { value: 'REFERRER', label: t('tdw_admin_partner_referrer', 'Referrer') },
            ],
          },
          {
            key: 'status',
            label: t('tdw_admin_col_status', 'Status'),
            options: [
              { value: 'ACTIVE', label: t('tdw_admin_status_active', 'Active') },
              { value: 'SUSPENDED', label: t('tdw_admin_partner_suspended', 'Suspended') },
            ],
          },
        ]}
        onRowClick={(p) => setOpenId(p.id)}
        activeKey={openId}
        exportAll={() => exportAll<AdminPartner>('/admin/console/partners', qs)}
        empty={t('tdw_admin_no_partners', 'No partners yet. A workspace gets a code the first time it opens Invite & earn.')}
      />
      <PartnerDrawer
        partner={open}
        onClose={() => setOpenId(null)}
        onChanged={() => {
          mutate();
          counts.refresh();
        }}
      />
      <AddAffiliateDialog
        open={adding}
        onClose={() => setAdding(false)}
        onDone={() => {
          mutate();
          counts.refresh();
        }}
      />
    </AdminPage>
  );
};
