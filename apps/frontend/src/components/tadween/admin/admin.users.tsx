'use client';

import React, { FC, useEffect, useState } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Avatar,
  Banner,
  Button,
  ConfirmDialog,
  Dialog,
  Input,
  Pagination,
  Pill,
  RadioGroup,
  Section,
  Table,
} from '@gitroom/frontend/components/tadween/ui';
import { AdminPage } from './admin.shell';
import {
  AdminUser,
  TIER_LABEL,
  useAdminMutation,
  useAdminPlans,
  useAdminUsers,
} from './admin.api';

type Workspace = AdminUser['organizations'][number];

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const fullName = (u: AdminUser) => [u.name, u.lastName].filter(Boolean).join(' ') || u.email;

const tierOf = (w: Workspace) => w.organization.subscription?.subscriptionTier || 'FREE';

// No subscription row: Free when billing is on, everything when Stripe is off.
const planLabel = (w: Workspace) =>
  w.organization.subscription ? TIER_LABEL[tierOf(w)] : 'No subscription';

// ── Change plan ─────────────────────────────────────────────────────────────
const ChangePlanDialog: FC<{
  workspace: Workspace | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ workspace, onClose, onDone }) => {
  const { data: plans } = useAdminPlans();
  const save = useAdminMutation();
  const toast = useToaster();
  const [tier, setTier] = useState<string>('FREE');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (workspace) {
      setTier(tierOf(workspace));
      setErr('');
    }
  }, [workspace]);
  const planName = (t: string) => plans?.plans.find((p) => p.tier === t && p.active)?.name;
  const options = ['FREE', 'STANDARD', 'TEAM', 'PRO', 'ULTIMATE'].map((t) => ({
    value: t,
    label: planName(t) ? `${planName(t)} · ${TIER_LABEL[t]}` : TIER_LABEL[t],
    description: t === 'FREE' ? 'No subscription. Removes an admin-granted plan.' : undefined,
  }));
  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await save(`/admin/console/organizations/${workspace!.organization.id}/tier`, 'PUT', { tier });
      toast.show(`${workspace!.organization.name} is now on ${planName(tier) || TIER_LABEL[tier]}`);
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
      open={!!workspace}
      onClose={onClose}
      title="Change plan"
      description={`For ${workspace?.organization.name || ''}. This grants the plan without a payment, like Postiz’s admin “add subscription”.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} loadingLabel="Changing…" disabled={!!workspace && tier === tierOf(workspace)} onClick={submit}>
            Change plan
          </Button>
        </>
      }
    >
      <div className="grid gap-[12px]">
        {err ? (
          <Banner tone="error" title="Couldn’t change the plan.">
            {err}
          </Banner>
        ) : null}
        <RadioGroup label="Plan" columns={1} value={tier} onChange={setTier} options={options} />
      </div>
    </Dialog>
  );
};

// ── User detail ─────────────────────────────────────────────────────────────
const UserDialog: FC<{
  user: AdminUser | null;
  onClose: () => void;
  onChanged: () => void;
}> = ({ user, onClose, onChanged }) => {
  const save = useAdminMutation();
  const toast = useToaster();
  const [confirm, setConfirm] = useState(false);
  const [planFor, setPlanFor] = useState<Workspace | null>(null);
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
      <Dialog
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
          <div className="grid gap-[12px]">
            <div className="flex gap-[8px] flex-wrap">
              {user.activated ? (
                <Pill tone="ok" icon="check">Active</Pill>
              ) : (
                <Pill tone="warn" icon="lock">Not activated</Pill>
              )}
              {user.isSuperAdmin ? <Pill tone="brand" icon="shield-check">Super admin</Pill> : null}
              <Pill icon="clock">Last seen {date(user.lastOnline)}</Pill>
            </div>
            <Table
              rowKey={(w) => w.id}
              rows={user.organizations}
              empty="Not a member of any workspace"
              columns={[
                {
                  key: 'org',
                  label: 'Workspace',
                  render: (w) => (
                    <span className="grid">
                      <span className="pz-set-label">{w.organization.name}</span>
                      <span className="caption pz-muted">
                        {w.role.toLowerCase()} · {w.organization._count.Integration} channels
                        {w.disabled ? ' · disabled member' : ''}
                      </span>
                    </span>
                  ),
                },
                {
                  key: 'plan',
                  label: 'Plan',
                  render: (w) => (
                    <span className="inline-flex gap-[6px] items-center flex-wrap">
                      <Pill tone={w.organization.subscription ? 'brand' : 'neutral'}>{planLabel(w)}</Pill>
                      {w.organization.subscription?.isLifetime ? <Pill>Lifetime</Pill> : null}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: '',
                  align: 'right',
                  render: (w) => (
                    <span className="inline-flex gap-[6px]">
                      <Button size="sm" variant="ghost" onClick={() => setPlanFor(w)}>
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
          </div>
        ) : null}
      </Dialog>
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
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useAdminUsers(search, page);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const open = data?.users.find((u) => u.id === openId) || null;

  return (
    <AdminPage
      title="Users"
      description="Everyone with an account on this instance. Open a user to impersonate them, change a workspace’s plan or deactivate them."
    >
      {error ? (
        <Banner tone="error" title="Couldn’t load users.">
          {error.message}
        </Banner>
      ) : null}
      <Section
        title={data ? `${data.total.toLocaleString('en-US')} users` : 'Users'}
        action={
          <Input
            aria-label="Search users"
            icon="search"
            placeholder="Name, email, workspace or ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      >
        <Table
          loading={isLoading && !data}
          rowKey={(u) => u.id}
          rows={data?.users || []}
          empty={search ? `No users match “${search}”` : 'No users yet'}
          columns={[
            {
              key: 'person',
              label: 'User',
              render: (u) => (
                <span className="pz-cell-person">
                  <Avatar name={fullName(u)} size={28} />
                  <span>
                    <span className="pz-set-label">{fullName(u)}</span>
                    <span className="caption pz-muted">{u.email}</span>
                  </span>
                </span>
              ),
            },
            {
              key: 'workspaces',
              label: 'Workspaces',
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
              label: 'Status',
              render: (u) => (
                <span className="inline-flex gap-[6px] flex-wrap">
                  {u.activated ? <Pill tone="ok" icon="check">Active</Pill> : <Pill tone="warn" icon="lock">Inactive</Pill>}
                  {u.isSuperAdmin ? <Pill tone="brand" icon="shield-check">Admin</Pill> : null}
                </span>
              ),
            },
            { key: 'joined', label: 'Joined', render: (u) => <span className="time">{date(u.createdAt)}</span> },
            {
              key: 'open',
              label: '',
              align: 'right',
              render: (u) => (
                <Button size="sm" iconEnd="chevron-right" onClick={() => setOpenId(u.id)}>
                  Manage
                </Button>
              ),
            },
          ]}
        />
        {data ? (
          <div className="pt-[12px]">
            <Pagination page={data.page + 1} pages={data.pages} onChange={(p) => setPage(p - 1)} />
          </div>
        ) : null}
      </Section>
      <UserDialog user={open} onClose={() => setOpenId(null)} onChanged={() => mutate()} />
    </AdminPage>
  );
};
