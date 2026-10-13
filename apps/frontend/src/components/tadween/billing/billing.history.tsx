'use client';

// Billing history on Billing, as Postiz's BillingHistory
// (components/billing/billing.history.component.tsx): every invoice from
// GET /billing/invoices with its plan, amount, dates and status, a search, a
// status filter, CSV export and a link to view or download each invoice.
// Drawn with the Tadween kit.
import React, { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useTadweenPricing } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import {
  Button,
  cx,
  Icon,
  Input,
  Select,
  Table,
} from '@gitroom/frontend/components/tadween/ui';

// PaymentInvoice (payment.provider.interface.ts)
interface Invoice {
  id: string;
  number: string | null;
  tier: string | null;
  period: string | null;
  description: string | null;
  amount: number;
  currency: string;
  created: number;
  periodEnd: number;
  status: 'paid' | 'pending' | 'failed' | 'void';
  downloadUrl: string | null;
  viewUrl: string | null;
}

const PAGE_SIZE = 10;

const useInvoices = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(path);
    }
    return (await res.json()) as Invoice[];
  }, []);
  return useSWR('/billing/invoices', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};

const formatAmount = (amount: number, currency: string) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(
    amount / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2)
  );
};

const formatDate = (unix: number | null) =>
  unix
    ? newDayjs(unix * 1000)
        .local()
        .format('D MMM YYYY')
    : '';

export const BillingHistory: FC = () => {
  const t = useT();
  const { planFor } = useTadweenPricing();
  const { data, isLoading, error } = useInvoices();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const statuses: Record<Invoice['status'], { label: string; tone: string }> =
    useMemo(
      () => ({
        paid: { label: t('tdw_invoice_paid', 'Paid'), tone: 'is-ok' },
        pending: {
          label: t('tdw_invoice_pending', 'Pending'),
          tone: 'is-warn',
        },
        failed: { label: t('tdw_invoice_failed', 'Failed'), tone: 'is-bad' },
        void: { label: t('tdw_invoice_void', 'Void'), tone: '' },
      }),
      [t]
    );

  // $0 invoices (a trial starting) aren't payments: they stay out
  const rows = useMemo(
    () =>
      (data || [])
        .filter((invoice) => invoice.amount > 0)
        .map((invoice) => ({
          ...invoice,
          plan:
            (invoice.tier && planFor(invoice.tier)?.name) ||
            invoice.description ||
            t('tdw_subscription', 'Subscription'),
          periodLabel:
            invoice.period === 'YEARLY'
              ? t('tdw_yearly', 'Yearly')
              : invoice.period === 'MONTHLY'
              ? t('tdw_monthly', 'Monthly')
              : '',
          amountLabel: formatAmount(invoice.amount, invoice.currency),
          purchaseDate: formatDate(invoice.created),
          endDate: formatDate(invoice.periodEnd),
          statusInfo: statuses[invoice.status] || statuses.void,
        })),
    [data, statuses, planFor]
  );
  type Row = (typeof rows)[number];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (status === 'all' || row.status === status) &&
        (!query ||
          [
            row.plan,
            row.periodLabel,
            row.number,
            row.amountLabel,
            row.purchaseDate,
            row.endDate,
            row.statusInfo.label,
          ].some((value) => value?.toLowerCase().includes(query)))
    );
  }, [rows, search, status]);

  const exportCsv = useCallback(() => {
    const escape = (value: string | null) =>
      `"${(value || '').replace(/"/g, '""')}"`;
    const lines = [
      [
        t('tdw_plan', 'Plan'),
        t('tdw_invoice_amount', 'Amount'),
        t('tdw_invoice_date', 'Purchase date'),
        t('tdw_invoice_end', 'End date'),
        t('tdw_invoice_status', 'Status'),
        t('tdw_invoice', 'Invoice'),
      ],
      ...filtered.map((row) => [
        [row.plan, row.periodLabel].filter(Boolean).join(' - '),
        row.amountLabel,
        row.purchaseDate,
        row.endDate,
        row.statusInfo.label,
        row.viewUrl || row.downloadUrl || row.number,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ['﻿' + lines.map((line) => line.map(escape).join(',')).join('\n')],
        { type: 'text/csv;charset=utf-8' }
      )
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'billing-history.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [filtered, t]);

  if (isLoading || error || !rows.length) {
    return null;
  }

  return (
    <section className="tdw-history" aria-labelledby="tdw-history-title">
      <header className="tdw-history-head">
        <h2 id="tdw-history-title" className="tdw-section-title">
          {t('tdw_billing_history', 'Billing history')}
        </h2>
        <div className="tdw-history-tools">
          <Input
            icon="search"
            aria-label={t('tdw_invoice_search', 'Search invoices')}
            placeholder={t('tdw_invoice_search', 'Search invoices')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisible(PAGE_SIZE);
            }}
          />
          <Select<string>
            size="sm"
            aria-label={t('tdw_invoice_status', 'Status')}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setVisible(PAGE_SIZE);
            }}
            options={[
              { value: 'all', label: t('tdw_invoice_all', 'All statuses') },
              ...Object.entries(statuses).map(([value, s]) => ({
                value,
                label: s.label,
              })),
            ]}
          />
          <Button
            size="sm"
            icon="download"
            disabled={!filtered.length}
            onClick={exportCsv}
          >
            {t('tdw_export', 'Export')}
          </Button>
        </div>
      </header>
      <div className="tdw-history-table">
        <Table<Row>
          rowKey={(row) => row.id}
          rows={filtered.slice(0, visible)}
          empty={t('tdw_invoice_none_match', 'No invoices match your search')}
          columns={[
            {
              key: 'plan',
              label: t('tdw_plan', 'Plan'),
              render: (row) => (
                <span className="tdw-history-plan">
                  <strong>{row.plan}</strong>
                  {row.periodLabel || row.number ? (
                    <span>
                      {[row.periodLabel, row.number]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  ) : null}
                </span>
              ),
            },
            {
              key: 'amount',
              label: t('tdw_invoice_amount', 'Amount'),
              render: (row) => <span className="time">{row.amountLabel}</span>,
            },
            {
              key: 'date',
              label: t('tdw_invoice_date', 'Purchase date'),
              render: (row) => <bdi>{row.purchaseDate}</bdi>,
            },
            {
              key: 'end',
              label: t('tdw_invoice_end', 'End date'),
              render: (row) => <bdi>{row.endDate}</bdi>,
            },
            {
              key: 'status',
              label: t('tdw_invoice_status', 'Status'),
              render: (row) => (
                <span className={cx('tdw-history-status', row.statusInfo.tone)}>
                  {row.statusInfo.label}
                </span>
              ),
            },
            {
              key: 'actions',
              label: (
                <span className="pz-sr">{t('tdw_invoice', 'Invoice')}</span>
              ),
              width: 88,
              render: (row) => (
                <span className="tdw-history-actions">
                  {row.downloadUrl ? (
                    <a
                      href={row.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('tdw_invoice_download', 'Download invoice')}
                      title={t('tdw_invoice_download', 'Download invoice')}
                    >
                      <Icon name="download" size={16} />
                    </a>
                  ) : null}
                  {row.viewUrl ? (
                    <a
                      href={row.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('tdw_invoice_view', 'View invoice')}
                      title={t('tdw_invoice_view', 'View invoice')}
                    >
                      <Icon name="external-link" size={16} />
                    </a>
                  ) : null}
                </span>
              ),
            },
          ]}
        />
      </div>
      {filtered.length > visible ? (
        <Button
          variant="ghost"
          size="sm"
          className="tdw-history-more"
          onClick={() => setVisible((n) => n + PAGE_SIZE)}
        >
          {t('tdw_show_more', 'Show more')}
        </Button>
      ) : null}
    </section>
  );
};
