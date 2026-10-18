'use client';

import React, { FC, useState } from 'react';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  DataColumn,
  DataTable,
  Input,
  Row,
  Section,
  Skeleton,
  StatTile,
  Switch,
  tableQueryString,
  useTableQuery,
} from '@gitroom/frontend/components/tadween/ui';
import { INSTANCE_SETTINGS_KEY } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { AdminPage } from './admin.shell';
import {
  AdminAccess,
  AdminAccessSettings,
  AdminWaitlisted,
  useAdminAccess,
  useAdminMutation,
  useAdminWaitlist,
} from './admin.api';

const num = (n: number) => n.toLocaleString('en-US');
const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

// Tadween free launch: the payments switch, the free plan's limits, the cap
// on free workspaces and the waitlist behind it (AccessService).
export const AdminAccessPage = () => {
  const { data, error, isLoading, mutate } = useAdminAccess();
  const { mutate: globalMutate } = useSWRConfig();
  const save = useAdminMutation();
  const toast = useToaster();
  const [pending, setPending] = useState(false);

  const apply = async (settings: AdminAccessSettings, done: string) => {
    setPending(true);
    try {
      await mutate(
        save<AdminAccess>('/admin/console/access', 'PUT', {
          payments: settings.payments,
          freePlan: settings.freePlan,
          cap: settings.cap,
          ...(settings.cutoff ? { cutoff: settings.cutoff } : {}),
        }),
        { revalidate: false }
      );
      // the app reads billing.enabled from the public settings
      globalMutate(INSTANCE_SETTINGS_KEY);
      // saving can let waiting workspaces in
      globalMutate(
        (key) =>
          typeof key === 'string' &&
          key.startsWith('/admin/console/access/waitlist')
      );
      toast.show(done);
    } catch (e) {
      toast.show((e as Error).message, 'warning');
    } finally {
      setPending(false);
    }
  };

  const counts = data?.counts;
  return (
    <AdminPage
      title="Free plan & payments"
      description="Whether payments are on, what the free plan includes, and how many free workspaces get in before new sign-ups wait."
    >
      {error ? (
        <Banner tone="error" title="Couldn’t load the free plan settings.">
          {error.message}
        </Banner>
      ) : null}

      <div className="tdw-stat-grid">
        <StatTile
          loading={isLoading}
          label="Free workspaces"
          value={
            counts
              ? counts.cap === null
                ? num(counts.used)
                : `${num(counts.used)} / ${num(counts.cap)}`
              : '—'
          }
          tone={
            counts && counts.cap !== null && counts.used >= counts.cap
              ? 'warn'
              : 'neutral'
          }
          hint={
            counts?.cap === null
              ? 'No cap'
              : 'Created after the early-access cutoff, without a plan'
          }
        />
        <StatTile
          loading={isLoading}
          label="Waitlisted"
          value={counts ? num(counts.waitlisted) : '—'}
          hint="Oldest first when spots open"
        />
        <StatTile
          loading={isLoading}
          label="Payments"
          value={data ? (data.paymentsEnabled ? 'On' : 'Off') : '—'}
          hint={
            data && !data.stripeConfigured
              ? 'Stripe keys are not set'
              : 'Checkout, trials and upgrades'
          }
        />
      </div>

      <Section
        title="Payments"
        description="Checkout, the paywall, trials, upgrade buttons, the trial banner and the Billing page. Off hides all of them, even when Stripe keys are set. Setting the keys never switches payments on by itself."
      >
        {isLoading || !data ? (
          <Skeleton height={44} />
        ) : (
          <Row
            label="Take payments"
            description={
              data.stripeConfigured
                ? 'Workspaces can subscribe and buy AI credits.'
                : 'Needs STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY on the server first.'
            }
            control={
              <Switch
                aria-label="Take payments"
                checked={data.settings.payments}
                disabled={pending}
                onChange={(on) =>
                  apply(
                    { ...data.settings, payments: on },
                    `Payments turned ${on ? 'on' : 'off'}`
                  )
                }
              />
            }
          />
        )}
      </Section>

      {isLoading || !data ? (
        <Skeleton height={220} radius={10} />
      ) : (
        <FreePlanForm
          key={JSON.stringify(data.settings)}
          settings={data.settings}
          pending={pending}
          onSave={(next) => apply(next, 'Free plan saved')}
        />
      )}

      <Waitlist onAdmitted={() => mutate()} />
    </AdminPage>
  );
};

const FreePlanForm: FC<{
  settings: AdminAccessSettings;
  pending: boolean;
  onSave: (next: AdminAccessSettings) => void;
}> = ({ settings, pending, onSave }) => {
  const [enabled, setEnabled] = useState(settings.freePlan.enabled);
  const [channels, setChannels] = useState(String(settings.freePlan.channels));
  const [members, setMembers] = useState(String(settings.freePlan.members));
  const [aiCredits, setAiCredits] = useState(
    String(settings.freePlan.aiCredits)
  );
  const [cap, setCap] = useState(
    settings.cap === null ? '' : String(settings.cap)
  );
  const whole = (v: string, min: number) =>
    v.trim() !== '' && Number.isInteger(Number(v)) && Number(v) >= min;
  const errors = {
    channels: whole(channels, 0) ? undefined : 'A whole number, 0 or more.',
    members: whole(members, 1) ? undefined : 'A whole number, 1 or more.',
    aiCredits: whole(aiCredits, 0) ? undefined : 'A whole number, 0 or more.',
    cap: cap.trim() === '' || whole(cap, 0) ? undefined : 'Empty for no cap, or a whole number.',
  };
  const valid = !Object.values(errors).some(Boolean);
  const next: AdminAccessSettings = {
    ...settings,
    freePlan: {
      enabled,
      channels: Number(channels),
      members: Number(members),
      aiCredits: Number(aiCredits),
    },
    cap: cap.trim() === '' ? null : Number(cap),
  };
  const changed = JSON.stringify(next) !== JSON.stringify(settings);
  return (
    <Section
      title="Free plan"
      description={`Applies to workspaces without a plan created after the early-access cutoff (${date(
        settings.cutoff
      )}). Older workspaces keep full access and don't count. A plan granted from Subscribers always wins.`}
      action={
        <Button
          variant="primary"
          size="sm"
          loading={pending}
          disabled={!valid || !changed}
          onClick={() => onSave(next)}
        >
          Save
        </Button>
      }
    >
      <Row
        label="Free plan"
        description="Off: new workspaces need a plan once payments are on, and nothing is limited while payments are off (as before)."
        control={
          <Switch
            aria-label="Free plan"
            checked={enabled}
            onChange={setEnabled}
          />
        }
      />
      <div className="grid grid-cols-4 gap-[12px] pt-[8px] mobile:grid-cols-1">
        <Input
          label="Channels"
          inputMode="numeric"
          value={channels}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setChannels(e.target.value)
          }
          error={errors.channels}
        />
        <Input
          label="Members"
          inputMode="numeric"
          value={members}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setMembers(e.target.value)
          }
          hint="Including the owner. 1: no team."
          error={errors.members}
        />
        <Input
          label="AI credits a month"
          inputMode="numeric"
          value={aiCredits}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setAiCredits(e.target.value)
          }
          hint="0: no in-app AI."
          error={errors.aiCredits}
        />
        <Input
          label="Free workspaces cap"
          inputMode="numeric"
          value={cap}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCap(e.target.value)
          }
          hint="Then new sign-ups wait. Empty: no cap. Raising it lets the oldest in."
          error={errors.cap}
        />
      </div>
    </Section>
  );
};

const Waitlist: FC<{ onAdmitted: () => void }> = ({ onAdmitted }) => {
  const { query, setQuery } = useTableQuery({});
  const { data, error, isLoading, isValidating, mutate } = useAdminWaitlist(
    tableQueryString(query)
  );
  const save = useAdminMutation();
  const toast = useToaster();
  const [admitting, setAdmitting] = useState<string | null>(null);

  const admit = async (row: AdminWaitlisted) => {
    setAdmitting(row.id);
    try {
      await save(`/admin/console/access/waitlist/${row.id}/admit`, 'POST');
      toast.show(`${row.name} is in. We emailed the owner.`);
      mutate();
      onAdmitted();
    } catch (e) {
      toast.show((e as Error).message, 'warning');
    } finally {
      setAdmitting(null);
    }
  };

  const columns: DataColumn<AdminWaitlisted>[] = [
    { key: 'position', label: '#', width: 56, render: (r) => num(r.position) },
    { key: 'name', label: 'Workspace', render: (r) => r.name },
    {
      key: 'owner',
      label: 'Owner',
      render: (r) => r.owner?.email || '—',
    },
    {
      key: 'waitlistedAt',
      label: 'Waiting since',
      render: (r) => date(r.waitlistedAt),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      hideable: false,
      render: (r) => (
        <Button
          size="sm"
          variant="secondary"
          loading={admitting === r.id}
          onClick={() => admit(r)}
        >
          Let in
        </Button>
      ),
    },
  ];

  return (
    <Section
      title="Waitlist"
      description="Workspaces that signed up while the free plan was full, oldest first. Letting one in emails its owner."
    >
      <DataTable
        id="admin-waitlist"
        columns={columns}
        rows={data?.items || []}
        total={data?.total || 0}
        rowKey={(r) => r.id}
        query={query}
        onQueryChange={setQuery}
        loading={isLoading || isValidating}
        error={error ? error.message : null}
        onRetry={() => mutate()}
        searchable={false}
      />
    </Section>
  );
};
