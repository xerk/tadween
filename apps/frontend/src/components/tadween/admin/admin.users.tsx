'use client';

import React, { FC, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Avatar,
  Banner,
  Button,
  ConfirmDialog,
  DataColumn,
  DataTable,
  Drawer,
  Pill,
  Section,
  Table,
  tableQueryString,
  useOpenRow,
  useTableQuery,
} from '@gitroom/frontend/components/tadween/ui';
import { AdminPage } from './admin.shell';
import {
  AdminUser,
  TIER_LABEL,
  useAdminMutation,
  date,
  useAdminUser,
  useAdminUsers,
  useExportAll,
} from './admin.api';
import { ChangePlanDialog, PlanTarget } from './admin.change.plan';

type Workspace = AdminUser['organizations'][number];

const fullName = (u: AdminUser) => [u.name, u.lastName].filter(Boolean).join(' ') || u.email;

const liveSub = (w: Workspace) =>
  w.organization.subscription && !w.organization.subscription.deletedAt
    ? w.organization.subscription
    : null;

const tierOf = (w: Workspace) => liveSub(w)?.subscriptionTier || 'FREE';

// No subscription row: Free when billing is on, everything when Stripe is off.
const planLabel = (w: Workspace) => (liveSub(w) ? TIER_LABEL[tierOf(w)] : 'No subscription');

// ── User detail ─────────────────────────────────────────────────────────────
const UserDrawer: FC<{
  user: AdminUser | null;
  onClose: () => void;
  onChanged: () => void;
}> = ({ user, onClose, onChanged }) => {
  const save = useAdminMutation();
  const toast = useToaster();
  const [confirm, setConfirm] = useState(false);
  const [planFor, setPlanFor] = useState<PlanTarget | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Reuses Postiz's impersonation: POST /user/impersonate with the
  // user-organization id, then reload into the app as that user.
  const impersonate = async (w: Workspace) => {
    setBusy(w.id);
    try {
      await save('/user/impersonate', 'POST', { id: w.id });
      window.location.href = '/launches';
    } catch (e) {
      toast.show((e as Error).message, 'warning');
      setBusy(null);
    }
  };

  const setActivated = async (activated: boolean) => {
    try {
      await save(`/admin/console/users/${user!.id}/activation`, 'PUT', { activated });
      toast.show(activated ? `${fullName(user!)} can sign in again` : `${fullName(user!)} is deactivated`);
      onChanged();
    } catch (e) {
      toast.show((e as Error).message, 'warning');
    }
  };

  return (
    <>
      <Drawer
        open={!!user && !planFor && !confirm}
        onClose={onClose}
        size="lg"
        title={user ? fullName(user) : ''}
        description={user ? `${user.email} · joined ${date(user.createdAt)} · signs in with ${user.providerName.toLowerCase()}` : ''}
        footer={
          user && !user.isSuperAdmin ? (
            user.activated ? (
              <Button variant="ghost" className="is-danger" icon="lock" onClick={() => setConfirm(true)}>
                Deactivate user
              </Button>
            ) : (
              <Button variant="primary" icon="check" onClick={() => setActivated(true)}>
                Activate user
              </Button>
            )
          ) : undefined
        }
      >
        {user ? (
          <div className="grid gap-[16px]">
            <div className="flex gap-[8px] flex-wrap">
              {user.activated ? (
                <Pill tone="ok" icon="check">Active</Pill>
              ) : (
                <Pill tone="warn" icon="lock">Not activated</Pill>
              )}
              {user.isSuperAdmin ? <Pill tone="brand" icon="shield-check">Super admin</Pill> : null}
              <Pill icon="clock">Last seen {date(user.lastOnline)}</Pill>
            </div>
            <Section title={`Workspaces · ${user.organizations.length}`}>
              <Table
                dense
                rowKey={(w) => w.id}
                rows={user.organizations}
                empty="Not a member of any workspace"
                columns={[
                  {
                    key: 'org',
                    label: 'Workspace',
                    render: (w) => (
                      <a href={`/admin/organizations?open=${w.organization.id}`} className="grid no-underline text-inherit">
                        <span className="pz-set-label">{w.organization.name}</span>
                        <span className="caption pz-muted">
                          {w.role.toLowerCase()} · {w.organization._count.Integration} channels
                          {w.disabled ? ' · disabled member' : ''}
                        </span>
                      </a>
                    ),
                  },
                  {
                    key: 'plan',
                    label: 'Plan',
                    render: (w) => (
                      <span className="inline-flex gap-[6px] items-center flex-wrap">
                        <Pill tone={liveSub(w) ? 'brand' : 'neutral'}>{planLabel(w)}</Pill>
                        {liveSub(w)?.isLifetime ? <Pill>Lifetime</Pill> : null}
                      </span>
                    ),
                  },
                  {
                    key: 'actions',
                    label: '',
                    align: 'right',
                    render: (w) => (
                      <span className="inline-flex gap-[6px]">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPlanFor({ id: w.organization.id, name: w.organization.name, tier: tierOf(w) })}
                        >
                          Change plan
                        </Button>
                        <Button size="sm" icon="user" loading={busy === w.id} loadingLabel="Opening…" onClick={() => impersonate(w)}>
                          Impersonate
                        </Button>
                      </span>
                    ),
                  },
                ]}
              />
            </Section>
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Deactivate ${user ? fullName(user) : ''}?`}
        description="They’re signed out on their next request and can’t sign in until you activate them again. Their workspaces and scheduled posts are kept."
        confirmLabel="Deactivate"
        onConfirm={() => setActivated(false)}
      />
      <ChangePlanDialog workspace={planFor} onClose={() => setPlanFor(null)} onDone={onChanged} />
    </>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
export const AdminUsersPage = () => {
  const t = useT();
  const toast = useToaster();
  const save = useAdminMutation();
  const { query, setQuery } = useTableQuery({ filters: ['status', 'role'] });
  const qs = tableQueryString(query);
  const { data, error, isLoading, isValidating, mutate } = useAdminUsers(qs);
  const [openId, setOpenId] = useOpenRow();
  const exportAll = useExportAll();
  const [bulk, setBulk] = useState<{ users: AdminUser[]; activated: boolean } | null>(null);

  const onPage = data?.items.find((u) => u.id === openId) || null;
  const { data: single, mutate: mutateSingle } = useAdminUser(
    openId && data && !onPage ? openId : null
  );
  const open = onPage || (single?.id === openId ? single : null);

  // One request per user through the same endpoint as the drawer; super
  // admins and your own account are refused by the server and counted.
  const applyBulk = async () => {
    const results = await Promise.allSettled(
      bulk!.users.map((u) =>
        save(`/admin/console/users/${u.id}/activation`, 'PUT', { activated: bulk!.activated })
      )
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    toast.show(
      failed
        ? `${results.length - failed} updated, ${failed} skipped (super admins and your own account can’t be changed)`
        : `${results.length} users ${bulk!.activated ? 'activated' : 'deactivated'}`,
      failed ? 'warning' : 'success'
    );
    mutate();
  };

  const columns: DataColumn<AdminUser>[] = [
    {
      key: 'name',
      label: t('tdw_admin_user', 'User'),
      title: 'User',
      sortable: true,
      hideable: false,
      csv: (u) => fullName(u),
      render: (u) => (
        <span className="pz-cell-person">
          <Avatar name={fullName(u)} size={28} />
          <span className="min-w-0">
            <span className="pz-set-label truncate">{fullName(u)}</span>
            <span className="caption pz-muted truncate">{u.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'email', label: t('tdw_admin_email', 'Email'), title: 'Email', sortable: true, defaultHidden: true, csv: (u) => u.email, render: (u) => u.email },
    {
      key: 'workspaces',
      label: t('tdw_admin_workspaces', 'Workspaces'),
      title: 'Workspaces',
      csv: (u) => u.organizations.map((w) => `${w.organization.name} (${planLabel(w)})`).join('; '),
      render: (u) => (
        <span className="caption grid">
          {u.organizations.slice(0, 2).map((w) => (
            <span key={w.id}>
              {w.organization.name} <span className="pz-muted">· {planLabel(w)}</span>
            </span>
          ))}
          {u.organizations.length > 2 ? <span className="pz-muted">+{u.organizations.length - 2} more</span> : null}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('tdw_admin_col_status', 'Status'),
      title: 'Status',
      csv: (u) => (u.activated ? 'active' : 'inactive') + (u.isSuperAdmin ? ' super admin' : ''),
      render: (u) => (
        <span className="inline-flex gap-[6px] flex-wrap">
          {u.activated ? <Pill tone="ok" icon="check">Active</Pill> : <Pill tone="warn" icon="lock">Inactive</Pill>}
          {u.isSuperAdmin ? <Pill tone="brand" icon="shield-check">Admin</Pill> : null}
        </span>
      ),
    },
    { key: 'provider', label: t('tdw_admin_sign_in', 'Sign-in'), title: 'Sign-in', defaultHidden: true, csv: (u) => u.providerName, render: (u) => <span className="caption">{u.providerName.toLowerCase()}</span> },
    { key: 'lastOnline', label: t('tdw_admin_last_seen', 'Last seen'), title: 'Last seen', sortable: true, csv: (u) => u.lastOnline, render: (u) => <span className="time">{date(u.lastOnline)}</span> },
    { key: 'createdAt', label: t('tdw_admin_joined', 'Joined'), title: 'Joined', sortable: true, csv: (u) => u.createdAt, render: (u) => <span className="time">{date(u.createdAt)}</span> },
  ];

  return (
    <AdminPage
      title={t('tdw_admin_users', 'Users')}
      description="Everyone with an account on this instance. Open a user to impersonate them, change a workspace’s plan or deactivate them."
    >
      {error ? (
        <Banner tone="error" title="Couldn’t load users.">
          {error.message}
        </Banner>
      ) : null}
      <DataTable
        id="admin-users"
        columns={columns}
        rows={data?.items || []}
        total={data?.total || 0}
        rowKey={(u) => u.id}
        query={query}
        onQueryChange={setQuery}
        loading={isLoading || isValidating}
        error={error ? error.message : null}
        onRetry={() => mutate()}
        searchPlaceholder="Name, email, workspace or ID"
        filters={[
          {
            key: 'status',
            label: t('tdw_admin_col_status', 'Status'),
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
          {
            key: 'role',
            label: t('tdw_admin_role', 'Role'),
            options: [
              { value: 'superadmin', label: 'Super admin' },
              { value: 'member', label: 'Everyone else' },
            ],
          },
        ]}
        onRowClick={(u) => setOpenId(u.id)}
        activeKey={openId}
        selectable
        bulkActions={(rows, clear) => (
          <>
            <button type="button" className="pz-link-btn" onClick={() => { setBulk({ users: rows, activated: true }); clear(); }}>
              Activate
            </button>
            <button type="button" className="pz-link-btn" onClick={() => { setBulk({ users: rows, activated: false }); clear(); }}>
              Deactivate
            </button>
          </>
        )}
        exportAll={() => exportAll<AdminUser>('/admin/console/users', qs)}
        empty="No users yet"
      />
      <UserDrawer
        user={open}
        onClose={() => setOpenId(null)}
        onChanged={() => {
          mutate();
          mutateSingle();
        }}
      />
      <ConfirmDialog
        open={!!bulk}
        onClose={() => setBulk(null)}
        tone={bulk?.activated ? 'primary' : 'destructive'}
        title={`${bulk?.activated ? 'Activate' : 'Deactivate'} ${bulk?.users.length || 0} users?`}
        description={
          bulk?.activated
            ? 'They can sign in again.'
            : 'They’re signed out on their next request and can’t sign in until you activate them again. Super admins and your own account are skipped.'
        }
        confirmLabel={bulk?.activated ? 'Activate' : 'Deactivate'}
        onConfirm={applyBulk}
      />
    </AdminPage>
  );
};
