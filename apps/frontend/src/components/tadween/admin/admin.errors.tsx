'use client';

// Post errors: Postiz's GET /admin/errors (server-side paged, filtered by
// platform, user email and "unknown first") in the console's DataTable, with
// the provider's response in a drawer. Same data as Postiz's errors screen.
import React, { FC, useMemo } from 'react';
import copy from 'copy-to-clipboard';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Button,
  DataColumn,
  DataTable,
  Drawer,
  LinkButton,
  Pill,
  Section,
  useOpenRow,
  useTableQuery,
} from '@gitroom/frontend/components/tadween/ui';
import { AdminPage } from './admin.shell';
import {
  AdminErrorRow,
  useAdminErrorPlatforms,
  useAdminErrors,
  useExportAll,
} from './admin.api';

const safeParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const pretty = (value: string) => {
  const parsed = safeParse(value);
  return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
};

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const ownerEmail = (row: AdminErrorRow) => row.organization?.users?.[0]?.user?.email || '';

const ErrorDrawer: FC<{ row: AdminErrorRow | null; onClose: () => void }> = ({ row, onClose }) => {
  const t = useT();
  const toast = useToaster();
  return (
    <Drawer
      open={!!row}
      onClose={onClose}
      size="lg"
      title={row ? `${row.platform} · ${dateTime(row.createdAt)}` : ''}
      description={row ? `${row.organization?.name || ''} · ${ownerEmail(row)}` : undefined}
      footer={
        row ? (
          <>
            <LinkButton href={`/admin/organizations?open=${row.organization?.id}`} variant="ghost" icon="building-2">
              {t('tdw_admin_open_workspace', 'Open workspace')}
            </LinkButton>
            <Button
              variant="primary"
              icon="copy"
              onClick={() => {
                copy(
                  JSON.stringify(
                    { message: safeParse(row.message), body: safeParse(row.body), meta: row },
                    null,
                    2
                  )
                );
                toast.show('Debug code copied to clipboard', 'success');
              }}
            >
              Copy debug code
            </Button>
          </>
        ) : undefined
      }
    >
      {row ? (
        <div className="grid gap-[16px]">
          <Section title="Post">
            <p className="whitespace-pre-wrap text-[14px]">{row.post?.content || '—'}</p>
            <p className="caption pz-muted">Post id {row.postId}</p>
          </Section>
          <Section title="Error">
            <pre className="adm-pre">{pretty(row.message)}</pre>
          </Section>
          <Section title="Request body">
            <pre className="adm-pre">{pretty(row.body)}</pre>
          </Section>
        </div>
      ) : null}
    </Drawer>
  );
};

export const AdminErrorsPage = () => {
  const t = useT();
  const { query, setQuery } = useTableQuery({ filters: ['platform', 'unknownFirst'] });
  const { data: platforms } = useAdminErrorPlatforms();
  // Postiz's endpoint names: limit, email (the search box), platform, unknownFirst.
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(query.page));
    p.set('limit', String(query.pageSize));
    if (query.search) p.set('email', query.search);
    if (query.filters.platform) p.set('platform', query.filters.platform);
    if (query.filters.unknownFirst) p.set('unknownFirst', 'true');
    return p.toString();
  }, [query]);
  const { data, error, isLoading, isValidating, mutate } = useAdminErrors(qs);
  const [openId, setOpenId] = useOpenRow();
  const open = data?.items.find((r) => r.id === openId) || null;
  const exportAll = useExportAll();

  const columns: DataColumn<AdminErrorRow>[] = [
    {
      key: 'createdAt',
      label: 'When',
      title: 'When',
      hideable: false,
      csv: (r) => r.createdAt,
      render: (r) => <span className="time whitespace-nowrap">{dateTime(r.createdAt)}</span>,
    },
    { key: 'platform', label: 'Platform', title: 'Platform', csv: (r) => r.platform, render: (r) => <Pill>{r.platform}</Pill> },
    {
      key: 'workspace',
      label: t('tdw_admin_col_workspace', 'Workspace'),
      title: 'Workspace',
      csv: (r) => r.organization?.name,
      render: (r) => (
        <span className="grid min-w-0">
          <span className="pz-set-label truncate">{r.organization?.name}</span>
          <span className="caption pz-muted truncate">{ownerEmail(r)}</span>
        </span>
      ),
    },
    {
      key: 'message',
      label: 'Error',
      title: 'Error',
      csv: (r) => r.message,
      render: (r) => <span className="caption adm-clamp">{pretty(r.message)}</span>,
    },
    {
      key: 'post',
      label: 'Post',
      title: 'Post',
      defaultHidden: true,
      csv: (r) => r.post?.content,
      render: (r) => <span className="caption adm-clamp">{r.post?.content || '—'}</span>,
    },
  ];

  return (
    <AdminPage
      title={t('tdw_admin_errors', 'Post errors')}
      description="Every failed publish with the provider’s response. Open one to copy the debug code."
    >
      <DataTable
        id="admin-errors"
        columns={columns}
        rows={data?.items || []}
        total={data?.total || 0}
        rowKey={(r) => r.id}
        query={query}
        onQueryChange={setQuery}
        loading={isLoading || isValidating}
        error={error ? error.message : null}
        onRetry={() => mutate()}
        searchPlaceholder="User email"
        filters={[
          {
            key: 'platform',
            label: 'Platform',
            options: (platforms || []).map((p) => ({ value: p, label: p })),
          },
          {
            key: 'unknownFirst',
            label: 'Order',
            options: [{ value: '1', label: 'Unknown errors first' }],
          },
        ]}
        onRowClick={(r) => setOpenId(r.id)}
        activeKey={openId}
        exportAll={() => exportAll<AdminErrorRow>('/admin/errors', qs, 'limit')}
        empty="No failed posts. Nice."
      />
      <ErrorDrawer row={open} onClose={() => setOpenId(null)} />
    </AdminPage>
  );
};
