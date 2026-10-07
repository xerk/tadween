'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  Icon,
  IconButton,
  Input,
  Pill,
  Section,
  Switch,
  Table,
  Tooltip,
} from '@gitroom/frontend/components/tadween/ui';
import { AdminPage } from './admin.shell';
import { AdminProvider, useAdminMutation, useAdminProviders } from './admin.api';

const LINKEDIN_FIRST = ['linkedin', 'linkedin-page'];

const Status = ({ p }: { p: AdminProvider }) => {
  if (p.hiddenByEnv) {
    return (
      <Tooltip label="Listed in HIDDEN_PROVIDERS, so it stays hidden whatever you choose here.">
        <Pill tone="warn" icon="eye">
          Hidden by env
        </Pill>
      </Tooltip>
    );
  }
  if (!p.credentials.needsCredentials) {
    return <Pill icon="check">No setup needed</Pill>;
  }
  return p.credentials.configured ? (
    <Pill tone="ok" icon="check">
      Ready
    </Pill>
  ) : (
    <Pill tone="bad" icon="triangle-alert">
      Missing credentials
    </Pill>
  );
};

const EnvList = ({ p }: { p: AdminProvider }) => {
  if (!p.credentials.env.length) {
    return <span className="caption pz-muted">The user connects their own account or server</span>;
  }
  return (
    <span className="flex flex-wrap gap-[6px] max-w-[360px]">
      {p.credentials.env.map((e) => (
        <code
          key={e.name}
          className="pz-code inline-flex items-center gap-[4px]"
          title={e.set ? `${e.name} is set` : `${e.name} is not set`}
        >
          <Icon
            name={e.set ? 'check' : 'x'}
            size={12}
            className={e.set ? 'text-[var(--tdw-success)]' : 'text-[var(--tdw-destructive)]'}
            label={e.set ? 'set' : 'not set'}
          />
          {e.name}
        </code>
      ))}
    </span>
  );
};

export const AdminChannelsPage = () => {
  const { data, error, isLoading, mutate } = useAdminProviders();
  const save = useAdminMutation();
  const toast = useToaster();
  const [rows, setRows] = useState<AdminProvider[]>([]);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const dirty = useMemo(
    () =>
      !!data &&
      rows.some(
        (r, i) =>
          data[i]?.identifier !== r.identifier || data[i]?.enabled !== r.enabled
      ),
    [rows, data]
  );

  const move = (index: number, by: -1 | 1) => {
    const next = [...rows];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  };

  const toggle = (identifier: string, enabled: boolean) =>
    setRows(rows.map((r) => (r.identifier === identifier ? { ...r, enabled } : r)));

  const linkedinFirst = () => {
    const first = LINKEDIN_FIRST.map((id) => rows.find((r) => r.identifier === id)!).filter(Boolean);
    setRows([...first, ...rows.filter((r) => !LINKEDIN_FIRST.includes(r.identifier))]);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const saved = await save<AdminProvider[]>('/admin/console/providers', 'PUT', {
        providers: rows.map((r, position) => ({
          identifier: r.identifier,
          enabled: r.enabled,
          position,
        })),
      });
      await mutate(saved, { revalidate: false });
      toast.show('Channel list saved');
    } catch (e) {
      toast.show((e as Error).message, 'warning');
    } finally {
      setSaving(false);
    }
  };

  const shown = rows.filter((r) =>
    (r.name + ' ' + r.identifier).toLowerCase().includes(query.toLowerCase())
  );
  const enabledCount = rows.filter((r) => r.enabled).length;
  const missing = rows.filter(
    (r) => r.enabled && r.credentials.needsCredentials && !r.credentials.configured && !r.hiddenByEnv
  ).length;

  return (
    <AdminPage
      title="Channels"
      description="Choose which channel types people can add, and in what order they appear in Add channel."
      action={
        <div className="flex gap-[8px]">
          <Button variant="ghost" disabled={!dirty || saving} onClick={() => data && setRows(data)}>
            Discard
          </Button>
          <Button variant="primary" disabled={!dirty} loading={saving} loadingLabel="Saving…" onClick={submit}>
            Save changes
          </Button>
        </div>
      }
    >
      <Banner tone="info" icon="key-round" title="Credentials stay in environment variables.">
        Tadween never stores provider secrets in the database or shows their values. Set the variables listed for a
        channel on the backend and restart it.
      </Banner>
      {error ? (
        <Banner tone="error" title="Couldn’t load channels.">
          {error.message}
        </Banner>
      ) : null}
      {missing ? (
        <Banner tone="warning" title={`${missing} enabled channel ${missing === 1 ? 'type is' : 'types are'} missing credentials.`}>
          People will see them in Add channel but connecting will fail until the variables are set.
        </Banner>
      ) : null}

      <Section
        title={`Channel types · ${enabledCount} of ${rows.length} on`}
        description="Turning a type off hides it from Add channel and blocks new connections. Channels already connected keep publishing and can still reconnect."
        action={
          <div className="flex items-center gap-[8px]">
            <Button size="sm" variant="ghost" icon="arrow-up" onClick={linkedinFirst}>
              LinkedIn first
            </Button>
            <Input
              aria-label="Search channel types"
              icon="search"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      >
        <Table
          loading={isLoading}
          rowKey={(r) => r.identifier}
          rows={shown}
          empty={query ? `No channel types match “${query}”` : 'No channel types'}
          columns={[
            {
              key: 'order',
              label: 'Order',
              width: 92,
              render: (r) => {
                const index = rows.findIndex((x) => x.identifier === r.identifier);
                return (
                  <span className="pz-row-actions items-center">
                    <span className="time pz-muted w-[22px] text-end">{index + 1}</span>
                    <IconButton size="sm" icon="arrow-up" label={`Move ${r.name} up`} disabled={index === 0 || !!query} onClick={() => move(index, -1)} />
                    <IconButton size="sm" icon="arrow-down" label={`Move ${r.name} down`} disabled={index === rows.length - 1 || !!query} onClick={() => move(index, 1)} />
                  </span>
                );
              },
            },
            {
              key: 'name',
              label: 'Channel type',
              render: (r) => (
                <span className="grid">
                  <span className="pz-set-label">{r.name}</span>
                  <span className="caption pz-muted">{r.identifier}</span>
                </span>
              ),
            },
            { key: 'status', label: 'Status', render: (r) => <Status p={r} /> },
            {
              key: 'env',
              label: 'Environment variables',
              render: (r) => (
                <span className="grid gap-[4px]">
                  <EnvList p={r} />
                  {r.credentials.note ? <span className="caption pz-muted">{r.credentials.note}</span> : null}
                </span>
              ),
            },
            {
              key: 'enabled',
              label: 'In Add channel',
              align: 'right',
              render: (r) => (
                <Switch
                  aria-label={`Show ${r.name} in Add channel`}
                  checked={r.enabled}
                  onChange={(v) => toggle(r.identifier, v)}
                />
              ),
            },
          ]}
        />
      </Section>
    </AdminPage>
  );
};
