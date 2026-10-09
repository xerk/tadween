'use client';

// Subscribers: every workspace with its subscription, server-side paged,
// sorted, searched and filtered (GET /admin/console/organizations). A row opens
// the workspace in a drawer: subscription, usage, members and channels, with
// the actions the console already had (impersonate, change plan).
import React, { FC, useState } from 'react';
import copy from 'copy-to-clipboard';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  DataColumn,
  DataTable,
  Drawer,
  IconButton,
  Pill,
  Section,
  Skeleton,
  StatTile,
  Table,
  tableQueryString,
  useOpenRow,
  useTableQuery,
} from '@gitroom/frontend/components/tadween/ui';
import { AdminPage } from './admin.shell';
import {
  AdminOrganization,
  SubscriptionStatus,
  date,
  TIER_LABEL,
  useAdminMutation,
  useAdminOrganization,
  useAdminOrganizations,
  useExportAll,
} from './admin.api';
import { ChangePlanDialog, PlanTarget } from './admin.change.plan';

const STATUS: Record<SubscriptionStatus, { label: string; key: string; tone: 'ok' | 'warn' | 'brand' | 'neutral'; icon: string }> = {
  active: { label: 'Active', key: 'tdw_admin_status_active', tone: 'ok', icon: 'check' },
  trialing: { label: 'Trialing', key: 'tdw_admin_status_trialing', tone: 'brand', icon: 'clock' },
  cancelled: { label: 'Cancelled', key: 'tdw_admin_status_cancelled', tone: 'warn', icon: 'circle-x' },
  lifetime: { label: 'Lifetime', key: 'tdw_admin_status_lifetime', tone: 'brand', icon: 'star' },
  none: { label: 'No subscription', key: 'tdw_admin_status_none', tone: 'neutral', icon: 'minus' },
};

export const StatusPill: FC<{ status: SubscriptionStatus }> = ({ status }) => {
  const t = useT();
  const s = STATUS[status];
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {t(s.key, s.label)}
    </Pill>
  );
};

const limitText = (used: number, limit: number | null) =>
  limit === null ? String(used) : limit < 0 ? `${used} / ∞` : `${used} / ${limit}`;

const Usage: FC<{ used: number; limit: number | null }> = ({ used, limit }) => (
  <span className={limit !== null && limit >= 0 && used > limit ? 'time text-[var(--tdw-warning)]' : 'time'}>
    {limitText(used, limit)}
  </span>
);

const planOf = (o: { tier: string | null; limits: { planName: string | null } }) =>
  o.tier ? o.limits.planName || TIER_LABEL[o.tier] : null;

// ── Detail drawer ───────────────────────────────────────────────────────────
const Field: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="adm-field">
    <span className="caption pz-muted">{label}</span>
    <span className="adm-field-value">{children}</span>
  </div>
);

const CopyValue: FC<{ value: string | null | undefined }> = ({ value }) => {
  const t = useT();
  const toast = useToaster();
  return value ? (
    <span className="inline-flex items-center gap-[4px] min-w-0">
      <code className="pz-code truncate">{value}</code>
      <IconButton
        size="sm"
        icon="copy"
        label={t('tdw_admin_copy', 'Copy')}
        onClick={() => {
          copy(value);
          toast.show(t('tdw_admin_copied', 'Copied'));
        }}
      />
    </span>
  ) : (
    <span className="pz-muted">—</span>
  );
};

const OrganizationDrawer: FC<{
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}> = ({ id, onClose, onChanged }) => {
  const t = useT();
  const toast = useToaster();
  const save = useAdminMutation();
  const { data: org, error, mutate } = useAdminOrganization(id);
  const [planFor, setPlanFor] = useState<PlanTarget | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Postiz's impersonation: POST /user/impersonate with the membership id.
  const impersonate = async (membershipId: string) => {
    setBusy(membershipId);
    try {
      await save('/user/impersonate', 'POST', { id: membershipId });
      window.location.href = '/launches';
    } catch (e) {
      toast.show((e as Error).message, 'warning');
      setBusy(null);
    }
  };

  const owner = org?.users.find((u) => u.role === 'SUPERADMIN') || org?.users[0];
  const sub = org?.subscription && !org.subscription.deletedAt ? org.subscription : null;
  return (
    <>
      <Drawer
        open={!!id && !planFor}
        onClose={onClose}
        size="lg"
        title={org?.name || t('tdw_admin_workspace', 'Workspace')}
        description={org ? `${t('tdw_admin_created', 'Created')} ${date(org.createdAt)} · ${org.id}` : undefined}
        footer={
          org ? (
            <>
              {owner ? (
                <Button icon="user" loading={busy === owner.id} loadingLabel="Opening…" onClick={() => impersonate(owner.id)}>
                  {t('tdw_admin_impersonate_owner', 'Impersonate owner')}
                </Button>
              ) : null}
              <Button
                variant="primary"
                icon="credit-card"
                onClick={() => setPlanFor({ id: org.id, name: org.name, tier: org.tier || 'FREE' })}
              >
                {t('tdw_admin_change_plan', 'Change plan')}
              </Button>
            </>
          ) : undefined
        }
      >
        {error ? (
          <Banner tone="error" title={t('tdw_admin_workspace_error', 'Couldn’t load this workspace.')}>
            {error.message}
          </Banner>
        ) : !org ? (
          <div className="grid gap-[12px]">
            <Skeleton height={20} width="60%" />
            <Skeleton height={80} />
            <Skeleton height={160} />
          </div>
        ) : (
          <div className="grid gap-[20px]">
            <Section title={t('tdw_admin_subscription', 'Subscription')}>
              <div className="adm-fields">
                <Field label={t('tdw_admin_col_status', 'Status')}>
                  <StatusPill status={org.status} />
                </Field>
                <Field label={t('tdw_admin_col_plan', 'Plan')}>
                  {planOf(org) || t('tdw_admin_no_plan', 'No plan')}
                  {org.tier ? <span className="caption pz-muted"> · {TIER_LABEL[org.tier]}</span> : null}
                </Field>
                <Field label={t('tdw_admin_col_billing', 'Billing')}>
                  {sub
                    ? `${sub.period === 'YEARLY' ? t('tdw_admin_yearly', 'Yearly') : t('tdw_admin_monthly', 'Monthly')} · ${sub.provider}`
                    : '—'}
                </Field>
                <Field label={t('tdw_admin_since', 'Subscribed since')}>{date(sub?.createdAt)}</Field>
                <Field label={t('tdw_admin_col_ends', 'Cancels on')}>{date(sub?.cancelAt)}</Field>
                <Field label={t('tdw_admin_trial', 'Trial')}>
                  {org.isTrailing
                    ? t('tdw_admin_trial_in', 'In trial')
                    : org.allowTrial
                    ? t('tdw_admin_trial_can', 'Can start a trial')
                    : t('tdw_admin_trial_none', 'No trial')}
                </Field>
                <Field label={t('tdw_admin_customer_id', 'Customer id')}>
                  <CopyValue value={org.paymentId} />
                </Field>
                <Field label={t('tdw_admin_subscription_id', 'Subscription id')}>
                  <CopyValue value={sub?.identifier} />
                </Field>
              </div>
              <p className="caption pz-muted mt-[8px]">
                {t(
                  'tdw_admin_period_note',
                  'The current period end and invoice history live in Stripe; Tadween only stores the cancel date. Refunds, coupons and cancelling are in the Admin menu of the app while you impersonate this workspace.'
                )}
              </p>
            </Section>

            <Section title={t('tdw_admin_usage', 'Usage')}>
              <div className="tdw-stat-grid">
                <StatTile label={t('tdw_admin_col_channels', 'Channels')} value={limitText(org.Integration.length, org.limits.channels)} />
                <StatTile
                  label={t('tdw_admin_col_members', 'Members')}
                  value={limitText(org.users.filter((u) => !u.disabled).length, org.limits.members === null ? null : org.limits.members)}
                />
                <StatTile label={t('tdw_admin_published_month', 'Published this month')} value={org.usage.publishedMonth.toLocaleString('en-US')} />
                <StatTile label={t('tdw_admin_scheduled', 'Scheduled')} value={org.usage.scheduled.toLocaleString('en-US')} />
                <StatTile
                  label={t('tdw_admin_failed_30', 'Failed, 30 days')}
                  value={org.usage.failed30d.toLocaleString('en-US')}
                  tone={org.usage.failed30d ? 'bad' : 'neutral'}
                />
                <StatTile label={t('tdw_admin_published_total', 'Published, all time')} value={org.usage.publishedTotal.toLocaleString('en-US')} />
              </div>
            </Section>

            <Section title={`${t('tdw_admin_col_members', 'Members')} · ${org.users.length}`}>
              <Table
                dense
                rowKey={(m) => m.id}
                rows={[...org.users].sort((a, b) => Number(b.role === 'SUPERADMIN') - Number(a.role === 'SUPERADMIN'))}
                empty={t('tdw_admin_no_members', 'No members')}
                columns={[
                  {
                    key: 'user',
                    label: t('tdw_admin_user', 'User'),
                    render: (m) => (
                      <span className="grid min-w-0">
                        <span className="pz-set-label truncate">
                          {[m.user.name, m.user.lastName].filter(Boolean).join(' ') || m.user.email}
                        </span>
                        <span className="caption pz-muted truncate">{m.user.email}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'role',
                    label: t('tdw_admin_role', 'Role'),
                    render: (m) => (
                      <span className="inline-flex gap-[6px] flex-wrap">
                        <Pill>
                          {m.role === 'SUPERADMIN'
                            ? t('tdw_admin_role_owner', 'Owner')
                            : m.role === 'ADMIN'
                            ? t('tdw_admin_role_admin', 'Admin')
                            : t('tdw_admin_role_member', 'Member')}
                        </Pill>
                        {m.disabled ? <Pill tone="warn">{t('tdw_admin_disabled', 'Disabled')}</Pill> : null}
                        {!m.user.activated ? (
                          <Pill tone="warn" icon="lock">
                            {t('tdw_admin_inactive', 'Inactive')}
                          </Pill>
                        ) : null}
                      </span>
                    ),
                  },
                  {
                    key: 'actions',
                    label: '',
                    align: 'right',
                    render: (m) => (
                      <Button size="sm" variant="ghost" loading={busy === m.id} loadingLabel="Opening…" onClick={() => impersonate(m.id)}>
                        {t('tdw_admin_impersonate', 'Impersonate')}
                      </Button>
                    ),
                  },
                ]}
              />
            </Section>

            <Section title={`${t('tdw_admin_col_channels', 'Channels')} · ${org.Integration.length}`}>
              <Table
                dense
                rowKey={(c) => c.id}
                rows={org.Integration}
                empty={t('tdw_admin_no_channels', 'No channels connected')}
                columns={[
                  {
                    key: 'name',
                    label: t('tdw_admin_channel', 'Channel'),
                    render: (c) => (
                      <span className="grid min-w-0">
                        <span className="pz-set-label truncate">{c.name}</span>
                        <span className="caption pz-muted">{c.providerIdentifier}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'state',
                    label: t('tdw_admin_col_status', 'Status'),
                    render: (c) =>
                      c.disabled ? (
                        <Pill icon="minus">{t('tdw_admin_disabled', 'Disabled')}</Pill>
                      ) : c.refreshNeeded || c.inBetweenSteps ? (
                        <Pill tone="warn" icon="refresh-cw">{t('tdw_admin_reconnect', 'Needs reconnecting')}</Pill>
                      ) : (
                        <Pill tone="ok" icon="check">{t('tdw_admin_connected', 'Connected')}</Pill>
                      ),
                  },
                  { key: 'created', label: t('tdw_admin_col_created', 'Created'), render: (c) => <span className="time">{date(c.createdAt)}</span> },
                ]}
              />
            </Section>
          </div>
        )}
      </Drawer>
      <ChangePlanDialog
        workspace={planFor}
        onClose={() => setPlanFor(null)}
        onDone={() => {
          mutate();
          onChanged();
        }}
      />
    </>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
const FILTERS = ['tier', 'status'];

export const AdminOrganizationsPage = () => {
  const t = useT();
  const toast = useToaster();
  const { query, setQuery } = useTableQuery({ filters: FILTERS });
  const qs = tableQueryString(query);
  const { data, error, isLoading, isValidating, mutate } = useAdminOrganizations(qs);
  const [openId, setOpenId] = useOpenRow();
  const exportAll = useExportAll();

  const columns: DataColumn<AdminOrganization>[] = [
    {
      key: 'name',
      label: t('tdw_admin_col_workspace', 'Workspace'),
      title: 'Workspace',
      sortable: true,
      hideable: false,
      csv: (o) => o.name,
      render: (o) => (
        <span className="grid min-w-0">
          <span className="pz-set-label truncate">{o.name}</span>
          <span className="caption pz-muted truncate">{o.owner?.email || t('tdw_admin_no_owner', 'No owner')}</span>
        </span>
      ),
    },
    { key: 'owner', label: t('tdw_admin_col_owner', 'Owner email'), title: 'Owner email', defaultHidden: true, csv: (o) => o.owner?.email, render: (o) => o.owner?.email || '—' },
    {
      key: 'tier',
      label: t('tdw_admin_col_plan', 'Plan'),
      title: 'Plan',
      sortable: true,
      csv: (o) => (o.tier ? TIER_LABEL[o.tier] : ''),
      render: (o) => (o.tier ? <Pill tone="brand">{planOf(o)}</Pill> : <span className="pz-muted">—</span>),
    },
    { key: 'status', label: t('tdw_admin_col_status', 'Status'), title: 'Status', csv: (o) => o.status, render: (o) => <StatusPill status={o.status} /> },
    {
      key: 'period',
      label: t('tdw_admin_col_billing', 'Billing'),
      title: 'Billing',
      csv: (o) => o.subscription?.period || '',
      render: (o) =>
        o.tier && o.subscription ? (
          <span className="caption grid">
            <span>{o.subscription.period === 'YEARLY' ? t('tdw_admin_yearly', 'Yearly') : t('tdw_admin_monthly', 'Monthly')}</span>
            <span className="pz-muted">{o.subscription.provider}</span>
          </span>
        ) : (
          <span className="pz-muted">—</span>
        ),
    },
    {
      key: 'cancelAt',
      label: t('tdw_admin_col_ends', 'Cancels on'),
      title: 'Cancels on',
      sortable: true,
      csv: (o) => o.subscription?.cancelAt || '',
      render: (o) => <span className="time">{date(o.subscription?.cancelAt)}</span>,
    },
    {
      key: 'channels',
      label: t('tdw_admin_col_channels', 'Channels'),
      title: 'Channels',
      sortable: true,
      align: 'right',
      csv: (o) => limitText(o.usage.channels, o.limits.channels),
      render: (o) => <Usage used={o.usage.channels} limit={o.limits.channels} />,
    },
    {
      key: 'members',
      label: t('tdw_admin_col_members', 'Members'),
      title: 'Members',
      sortable: true,
      align: 'right',
      csv: (o) => limitText(o.usage.members, o.limits.members),
      render: (o) => <Usage used={o.usage.members} limit={o.limits.members} />,
    },
    {
      key: 'createdAt',
      label: t('tdw_admin_col_created', 'Created'),
      title: 'Created',
      sortable: true,
      csv: (o) => o.createdAt,
      render: (o) => <span className="time">{date(o.createdAt)}</span>,
    },
    {
      key: 'stripe',
      label: t('tdw_admin_col_ids', 'Billing ids'),
      title: 'Billing ids',
      defaultHidden: true,
      csv: (o) => [o.paymentId, o.subscription?.identifier].filter(Boolean).join(' '),
      render: (o) => (
        <span className="caption grid">
          <code className="pz-code">{o.paymentId || '—'}</code>
          {o.subscription?.identifier ? <code className="pz-code">{o.subscription.identifier}</code> : null}
        </span>
      ),
    },
  ];

  return (
    <AdminPage
      title={t('tdw_admin_subscribers', 'Subscribers')}
      description={t(
        'tdw_admin_subscribers_desc',
        'Every workspace with its plan, subscription and usage. Open one for members, channels and actions.'
      )}
    >
      <DataTable
        id="admin-subscribers"
        columns={columns}
        rows={data?.items || []}
        total={data?.total || 0}
        rowKey={(o) => o.id}
        query={query}
        onQueryChange={setQuery}
        loading={isLoading || isValidating}
        error={error ? error.message : null}
        onRetry={() => mutate()}
        searchPlaceholder={t('tdw_admin_search_orgs', 'Name, owner email, id or customer id')}
        filters={[
          {
            key: 'tier',
            label: t('tdw_admin_col_plan', 'Plan'),
            options: [
              ...['STANDARD', 'TEAM', 'PRO', 'ULTIMATE'].map((v) => ({ value: v, label: TIER_LABEL[v] })),
              { value: 'NONE', label: t('tdw_admin_no_plan', 'No plan') },
            ],
          },
          {
            key: 'status',
            label: t('tdw_admin_col_status', 'Status'),
            options: (Object.keys(STATUS) as SubscriptionStatus[]).map((s) => ({
              value: s,
              label: t(STATUS[s].key, STATUS[s].label),
            })),
          },
        ]}
        onRowClick={(o) => setOpenId(o.id)}
        activeKey={openId}
        selectable
        bulkActions={(rows, clear) => (
          <>
            <button
              type="button"
              className="pz-link-btn"
              onClick={() => {
                copy(rows.map((r) => r.owner?.email).filter(Boolean).join(', '));
                toast.show(t('tdw_admin_copied', 'Copied'));
                clear();
              }}
            >
              {t('tdw_admin_copy_emails', 'Copy owner emails')}
            </button>
            <button
              type="button"
              className="pz-link-btn"
              onClick={() => {
                copy(rows.map((r) => r.id).join('\n'));
                toast.show(t('tdw_admin_copied', 'Copied'));
                clear();
              }}
            >
              {t('tdw_admin_copy_ids', 'Copy ids')}
            </button>
          </>
        )}
        exportAll={() => exportAll<AdminOrganization>('/admin/console/organizations', qs)}
        empty={t('tdw_admin_no_workspaces', 'No workspaces yet.')}
      />
      <OrganizationDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => mutate()} />
    </AdminPage>
  );
};
