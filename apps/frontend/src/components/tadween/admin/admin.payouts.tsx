'use client';

// Growth → Payouts: the monthly cash run for affiliates (GET
// /admin/console/payouts). "Due this month" lists affiliates who chose cash
// and have at least the minimum available; the CSV export carries their payout
// details for the Wise batch, and "Mark paid" records the transfer. Below,
// every payout made, cash and Tadween balance.
import React, { FC, useEffect, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  DataColumn,
  DataTable,
  Dialog,
  Input,
  Pill,
  Section,
  Select,
  Table,
  tableQueryString,
  useTableQuery,
} from '@gitroom/frontend/components/tadween/ui';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';
import { AdminPage } from './admin.shell';
import {
  AdminDuePayout,
  AdminPayoutRow,
  date,
  useAdminDownload,
  useAdminMutation,
  useAdminPayouts,
} from './admin.api';

const usd = (cents: number) => formatUsd(cents / 100);

type PayoutMethod = 'wise' | 'payoneer' | 'bank' | 'manual';
const METHODS: PayoutMethod[] = ['wise', 'payoneer', 'bank', 'manual'];

const useMethodLabel = () => {
  const t = useT();
  return (method: string | null) =>
    method === 'wise'
      ? 'Wise'
      : method === 'payoneer'
      ? 'Payoneer'
      : method === 'bank'
      ? t('tdw_admin_method_bank', 'Bank transfer')
      : method === 'balance'
      ? t('tdw_admin_method_balance', 'Tadween balance')
      : method === 'manual'
      ? t('tdw_admin_method_manual', 'Other')
      : '—';
};

// ── Mark paid ───────────────────────────────────────────────────────────────
const MarkPaidDialog: FC<{
  payout: AdminDuePayout | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ payout, onClose, onDone }) => {
  const t = useT();
  const toast = useToaster();
  const save = useAdminMutation();
  const methodLabel = useMethodLabel();
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState<PayoutMethod>('wise');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (payout) {
      setReference('');
      setMethod(METHODS.includes(payout.method as PayoutMethod) ? (payout.method as PayoutMethod) : 'wise');
      setErr('');
    }
  }, [payout]);

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      const done = await save<{ amountCents: number }>(`/admin/console/payouts/${payout!.partnerId}`, 'POST', {
        reference: reference.trim(),
        amountCents: payout!.amountCents,
        method,
      });
      toast.show(
        t('tdw_admin_payout_marked', '{{amount}} to {{code}} marked paid', {
          amount: usd(done?.amountCents ?? payout!.amountCents),
          code: payout!.code,
        })
      );
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
      open={!!payout}
      onClose={onClose}
      size="sm"
      title={t('tdw_admin_mark_paid_title', 'Mark {{amount}} paid?', { amount: payout ? usd(payout.amountCents) : '' })}
      description={t(
        'tdw_admin_mark_paid_desc',
        'To {{code}} ({{workspace}}). Every available commission of this affiliate is settled in this payout.',
        { code: payout?.code || '', workspace: payout?.organization || '—' }
      )}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('tdw_admin_cancel', 'Cancel')}
          </Button>
          <Button variant="primary" icon="check" loading={saving} disabled={!reference.trim()} onClick={submit}>
            {t('tdw_admin_mark_paid', 'Mark paid')}
          </Button>
        </>
      }
    >
      <div className="grid gap-[12px]">
        {err ? (
          <Banner tone="error" title={t('tdw_admin_mark_paid_error', 'Couldn’t record the payout.')}>
            {err}
          </Banner>
        ) : null}
        <Input
          dir="ltr"
          label={t('tdw_admin_payout_reference', 'Transfer reference')}
          hint={t('tdw_admin_payout_reference_hint', 'The Wise transfer id, or the Payoneer / bank reference.')}
          maxLength={200}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <Select<PayoutMethod>
          label={t('tdw_admin_col_method', 'Method')}
          value={method}
          onChange={setMethod}
          options={METHODS.map((m) => ({ value: m, label: methodLabel(m) }))}
        />
      </div>
    </Dialog>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
export const AdminPayoutsPage = () => {
  const t = useT();
  const toast = useToaster();
  const methodLabel = useMethodLabel();
  const download = useAdminDownload();
  const { query, setQuery } = useTableQuery({});
  const qs = tableQueryString(query);
  const { data, error, isLoading, isValidating, mutate } = useAdminPayouts(qs);
  const [paying, setPaying] = useState<AdminDuePayout | null>(null);
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await download(
        '/admin/console/payouts/export',
        `tadween-payouts-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (e) {
      toast.show((e as Error).message, 'warning');
    } finally {
      setExporting(false);
    }
  };

  const due = data?.due || [];
  const dueTotal = due.reduce((all, d) => all + d.amountCents, 0);

  const columns: DataColumn<AdminPayoutRow>[] = [
    { key: 'date', label: t('tdw_admin_col_date', 'Date'), title: 'Date', hideable: false, csv: (p) => p.paidAt || p.createdAt, render: (p) => <span className="time">{date(p.paidAt || p.createdAt)}</span> },
    {
      key: 'partner',
      label: t('tdw_admin_col_partner', 'Partner'),
      title: 'Partner',
      csv: (p) => p.partner.code,
      render: (p) => (
        <span className="grid min-w-0">
          <code className="pz-code">{p.partner.code}</code>
          <span className="caption pz-muted truncate">{p.organization || '—'}</span>
        </span>
      ),
    },
    { key: 'method', label: t('tdw_admin_col_method', 'Method'), title: 'Method', csv: (p) => p.method, render: (p) => methodLabel(p.method) },
    {
      key: 'reference',
      label: t('tdw_admin_payout_reference', 'Transfer reference'),
      title: 'Reference',
      csv: (p) => p.reference,
      render: (p) => (p.reference ? <code className="pz-code">{p.reference}</code> : <span className="pz-muted">—</span>),
    },
    { key: 'amount', label: t('tdw_admin_col_amount', 'Amount'), title: 'Amount (USD)', align: 'right', csv: (p) => (p.amountCents / 100).toFixed(2), render: (p) => <span className="time">{usd(p.amountCents)}</span> },
    {
      key: 'status',
      label: t('tdw_admin_col_status', 'Status'),
      title: 'Status',
      csv: (p) => p.status,
      render: (p) =>
        p.status === 'PAID' ? (
          <Pill tone="ok" icon="check">
            {t('tdw_admin_payout_paid', 'Paid')}
          </Pill>
        ) : (
          <Pill icon="minus">{t('tdw_admin_payout_cancelled', 'Cancelled')}</Pill>
        ),
    },
  ];

  return (
    <AdminPage
      title={t('tdw_admin_payouts', 'Payouts')}
      description={t(
        'tdw_admin_payouts_desc',
        'Affiliate commission paid out: cash once a month for affiliates who asked for it, Tadween balance automatically for everyone else.'
      )}
    >
      <Banner tone="info" icon="calendar-days" title={t('tdw_admin_payout_runbook_title', 'Monthly on the 15th:')}>
        {t(
          'tdw_admin_payout_runbook',
          'export, pay each line in Wise, paste the Wise transfer id as reference and mark paid.'
        )}
      </Banner>

      <Section
        title={t('tdw_admin_due_title', 'Due this month')}
        description={t(
          'tdw_admin_due_desc',
          'Affiliates who chose cash with at least {{min}} available. “Ready” means W-8BEN, country, payout details (and Mawthooq in Saudi Arabia) are on file. Total {{total}}.',
          { min: usd(data?.minimumCents ?? 5000), total: usd(dueTotal) }
        )}
        action={
          <Button icon="download" loading={exporting} disabled={!due.length} onClick={exportCsv}>
            {t('tdw_admin_export_csv', 'Export CSV')}
          </Button>
        }
      >
        {error ? (
          <Banner tone="error" title={t('tdw_admin_payouts_error', 'Couldn’t load payouts.')}>
            {error.message}
          </Banner>
        ) : (
          <div className="tdw-partners-scroll">
            <Table
              dense
              loading={isLoading}
              rowKey={(d) => d.partnerId}
              rows={due}
              empty={t('tdw_admin_nothing_due', 'Nothing due this month.')}
              columns={[
                {
                  key: 'partner',
                  label: t('tdw_admin_col_partner', 'Partner'),
                  render: (d) => (
                    <span className="grid min-w-0">
                      <span className="pz-set-label truncate">{d.organization || '—'}</span>
                      <span className="caption pz-muted truncate">
                        <code className="pz-code">{d.code}</code> · {d.email || '—'}
                      </span>
                    </span>
                  ),
                },
                {
                  key: 'country',
                  label: t('tdw_admin_col_country', 'Country'),
                  render: (d) => (
                    <span className="caption grid">
                      <span>{d.country || '—'}</span>
                      {d.country === 'SA' ? (
                        <span className="pz-muted">
                          {t('tdw_admin_mawthooq', 'Mawthooq licence')}: {d.mawthooqNumber || '—'}
                        </span>
                      ) : null}
                    </span>
                  ),
                },
                { key: 'method', label: t('tdw_admin_col_method', 'Method'), render: (d) => methodLabel(d.method) },
                { key: 'amount', label: t('tdw_admin_col_amount', 'Amount'), align: 'right', render: (d) => <span className="tdw-partners-num">{usd(d.amountCents)}</span> },
                {
                  key: 'ready',
                  label: t('tdw_admin_col_ready', 'Ready'),
                  render: (d) =>
                    d.ready ? (
                      <Pill tone="ok" icon="check">
                        {t('tdw_admin_yes', 'Yes')}
                      </Pill>
                    ) : (
                      <Pill tone="warn" icon="triangle-alert">
                        {t('tdw_admin_missing_details', 'Missing details')}
                      </Pill>
                    ),
                },
                {
                  key: 'actions',
                  label: '',
                  align: 'right',
                  render: (d) => (
                    <Button size="sm" icon="check" onClick={() => setPaying(d)}>
                      {t('tdw_admin_mark_paid', 'Mark paid')}
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Section>

      <Section title={t('tdw_admin_past_payouts', 'Past payouts')}>
        <DataTable
          id="admin-payouts"
          columns={columns}
          rows={data?.items || []}
          total={data?.total || 0}
          rowKey={(p) => p.id}
          query={query}
          onQueryChange={setQuery}
          searchable={false}
          loading={isLoading || isValidating}
          error={error ? error.message : null}
          onRetry={() => mutate()}
          empty={t('tdw_admin_no_payouts', 'No payouts yet.')}
        />
      </Section>

      <MarkPaidDialog payout={paying} onClose={() => setPaying(null)} onDone={() => mutate()} />
    </AdminPage>
  );
};
