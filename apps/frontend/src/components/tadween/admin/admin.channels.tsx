'use client';

import React, { FC, useEffect, useMemo, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  applyQueryPatch,
  Banner,
  Button,
  DataColumn,
  DataTable,
  Drawer,
  emptyQuery,
  Icon,
  IconButton,
  Input,
  Pill,
  SegmentedControl,
  Switch,
  TableQuery,
  Tooltip,
} from '@gitroom/frontend/components/tadween/ui';
import { AdminPage } from './admin.shell';
import {
  AdminProvider,
  CredentialField,
  useAdminMutation,
  useAdminProviders,
} from './admin.api';

const LINKEDIN_FIRST = ['linkedin', 'linkedin-page'];

// Why a channel type is or isn't in the customers' Add channel list. Customers
// see it only when it is on and its keys are set (the server applies the same
// rule to GET /integrations and to new connects).
type ChannelState = 'ready' | 'missing' | 'off' | 'hidden';

const stateOf = (p: AdminProvider): ChannelState =>
  p.hiddenByEnv
    ? 'hidden'
    : !p.enabled
    ? 'off'
    : p.credentials.configured
    ? 'ready'
    : 'missing';

const Status = ({ p }: { p: AdminProvider }) => {
  const t = useT();
  switch (stateOf(p)) {
    case 'hidden':
      return (
        <Tooltip
          label={t(
            'tdw_admin_ch_hidden_env_tip',
            'Listed in HIDDEN_PROVIDERS, so it stays hidden whatever you choose here.'
          )}
        >
          <Pill tone="warn" icon="eye">
            {t('tdw_admin_ch_hidden_env', 'Hidden by env')}
          </Pill>
        </Tooltip>
      );
    case 'off':
      return <Pill icon="minus">{t('tdw_admin_ch_off', 'Disabled')}</Pill>;
    case 'ready':
      return (
        <Tooltip
          label={
            p.credentials.needsCredentials
              ? t('tdw_admin_ch_ready_tip', 'Customers can add it from Add channel.')
              : t('tdw_admin_ch_ready_none_tip', 'Needs no app keys: customers connect their own account or server.')
          }
        >
          <Pill tone="ok" icon="check">
            {t('tdw_admin_ch_ready', 'Ready')}
          </Pill>
        </Tooltip>
      );
    default:
      return (
        <Pill tone="bad" icon="triangle-alert">
          {t('tdw_admin_ch_missing', 'Enabled but missing keys — hidden from customers')}
        </Pill>
      );
  }
};

const sourceLabel = (f: CredentialField) =>
  f.source === 'console' ? 'Set here' : f.source === 'env' ? 'From env var' : 'Not set';

const KeyList = ({ p }: { p: AdminProvider }) => {
  if (!p.credentials.fields.length) {
    return <span className="caption pz-muted">The user connects their own account or server</span>;
  }
  return (
    <span className="flex flex-wrap gap-[6px] max-w-[380px]">
      {p.credentials.fields.map((f) => (
        <code
          key={f.name}
          className="pz-code inline-flex items-center gap-[4px]"
          title={`${f.name}: ${sourceLabel(f)}`}
        >
          <Icon
            name={f.set ? 'check' : 'x'}
            size={12}
            className={f.set ? 'text-[var(--tdw-success)]' : 'text-[var(--tdw-destructive)]'}
            label={f.set ? 'set' : 'not set'}
          />
          {f.name}
          {f.source === 'console' ? <Icon name="key-round" size={12} label="set here" /> : null}
        </code>
      ))}
    </span>
  );
};

// ── Keys drawer ─────────────────────────────────────────────────────────────
// Write-only: inputs start empty and saved values never come back; the
// server answers with set / not set, the source and (non-secret names only)
// the last 4 characters.
const KeysDrawer: FC<{
  provider: AdminProvider | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ provider, onClose, onSaved }) => {
  const t = useT();
  const save = useAdminMutation();
  const toast = useToaster();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setValues({});
    setErr('');
  }, [provider?.identifier]);

  const send = async (body: Record<string, string | null>, done: string) => {
    setBusy(true);
    setErr('');
    try {
      await save(`/admin/console/providers/${provider!.identifier}/credentials`, 'PUT', { values: body });
      setValues({});
      onSaved();
      toast.show(done);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const typed = Object.fromEntries(
    Object.entries(values).filter(([, v]) => v.trim())
  );

  return (
    <Drawer
      open={!!provider}
      onClose={onClose}
      title={provider ? `${provider.name} keys` : ''}
      description="The app credentials Tadween uses to connect this channel type. Values saved here are encrypted, override the env var and are never shown again."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('close', 'Close')}
          </Button>
          <Button
            variant="primary"
            icon="key-round"
            disabled={!Object.keys(typed).length}
            loading={busy}
            loadingLabel="Saving…"
            onClick={() => send(typed, `${provider!.name} keys saved`)}
          >
            Save keys
          </Button>
        </>
      }
    >
      {provider ? (
        <div className="grid gap-[16px]">
          {err ? (
            <Banner tone="error" title="Couldn’t save the keys.">
              {err}
            </Banner>
          ) : null}
          <Banner tone="info" icon="refresh-cw" title="Applies within a minute.">
            The backend and the publishing worker pick up a saved key on their next refresh (every 60 seconds); no
            restart needed. Remove a value here to go back to the env var.
          </Banner>
          {provider.credentials.note ? <p className="caption pz-muted">{provider.credentials.note}</p> : null}
          {provider.credentials.fields.map((f) => (
            <div key={f.name} className="adm-key">
              <div className="adm-key-head">
                <code className="pz-code">{f.name}</code>
                <Pill tone={f.set ? (f.source === 'console' ? 'brand' : 'ok') : 'bad'} icon={f.set ? 'check' : 'x'}>
                  {sourceLabel(f)}
                </Pill>
                {f.last4 ? <span className="caption pz-muted">ends in {f.last4}</span> : null}
              </div>
              {f.unreadable ? (
                <Banner tone="warning" title="The value saved here can’t be read.">
                  The server’s JWT_SECRET changed since it was saved, so the env var is used. Enter it again.
                </Banner>
              ) : null}
              {f.editable ? (
                <div className="adm-key-row">
                  <Input
                    aria-label={`New value for ${f.name}`}
                    type={f.secret ? 'password' : 'text'}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={f.set ? 'Enter a new value to replace it' : 'Paste the value'}
                    value={values[f.name] || ''}
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  />
                  {f.source === 'console' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="is-danger"
                      disabled={busy}
                      onClick={() => send({ [f.name]: null }, `${f.name} removed; the env var is used again`)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="caption pz-muted">
                  Set it as the env var <code className="pz-code">{f.name}</code> and restart. {f.envOnlyReason}
                </p>
              )}
              {f.usedBy.length ? (
                <p className="caption pz-muted">Also used by: {f.usedBy.join(', ')}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Drawer>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
type View = 'focus' | 'all';

export const AdminChannelsPage = () => {
  const t = useT();
  const { data, error, isLoading, mutate } = useAdminProviders();
  const [view, setView] = useState<View>('focus');
  const save = useAdminMutation();
  const toast = useToaster();
  const [rows, setRows] = useState<AdminProvider[]>([]);
  const [query, setQuery] = useState<TableQuery>(() => emptyQuery(10000));
  const [saving, setSaving] = useState(false);
  const [keysFor, setKeysFor] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      // Keep unsaved order / switches; take fresh credential status.
      setRows((current) =>
        current.length
          ? current.map((r) => ({ ...r, credentials: data.find((d) => d.identifier === r.identifier)?.credentials || r.credentials }))
          : data
      );
    }
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
      setRows(saved);
      await mutate(saved, { revalidate: false });
      toast.show('Channel list saved');
    } catch (e) {
      toast.show((e as Error).message, 'warning');
    } finally {
      setSaving(false);
    }
  };

  // Reordering only makes sense on the full, unfiltered list.
  const narrowed =
    view === 'focus' || !!query.search || Object.values(query.filters).some(Boolean);
  const shown = view === 'focus' ? rows.filter((r) => r.focus) : rows;
  const readyCount = rows.filter((r) => stateOf(r) === 'ready').length;
  const missing = rows.filter((r) => stateOf(r) === 'missing').length;
  // Nothing saved yet: the focus networks are the default.
  const usingDefaults = !!data?.length && data.every((r) => !r.saved);
  const keysProvider = rows.find((r) => r.identifier === keysFor) || null;

  const columns: DataColumn<AdminProvider>[] = [
    {
      key: 'order',
      label: 'Order',
      title: 'Order',
      width: 92,
      hideable: false,
      csv: (r) => rows.findIndex((x) => x.identifier === r.identifier) + 1,
      render: (r) => {
        const index = rows.findIndex((x) => x.identifier === r.identifier);
        return (
          <span className="pz-row-actions items-center" onClick={(e) => e.stopPropagation()}>
            <span className="time pz-muted w-[22px] text-end">{index + 1}</span>
            <IconButton size="sm" icon="arrow-up" label={`Move ${r.name} up`} disabled={index === 0 || narrowed} onClick={() => move(index, -1)} />
            <IconButton size="sm" icon="arrow-down" label={`Move ${r.name} down`} disabled={index === rows.length - 1 || narrowed} onClick={() => move(index, 1)} />
          </span>
        );
      },
    },
    {
      key: 'name',
      label: 'Channel type',
      title: 'Channel type',
      hideable: false,
      csv: (r) => r.name,
      render: (r) => (
        <span className="grid">
          <span className="pz-set-label">{r.name}</span>
          <span className="caption pz-muted">{r.identifier}</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: t('tdw_admin_col_status', 'Status'),
      title: t('tdw_admin_col_status', 'Status'),
      csv: (r) => stateOf(r),
      render: (r) => <Status p={r} />,
    },
    {
      key: 'keys',
      label: 'Keys',
      title: 'Keys',
      csv: (r) => r.credentials.fields.map((f) => `${f.name}:${f.source || 'unset'}`).join(' '),
      render: (r) => (
        <span className="grid gap-[4px]">
          <KeyList p={r} />
          {r.credentials.note ? <span className="caption pz-muted">{r.credentials.note}</span> : null}
        </span>
      ),
    },
    {
      key: 'edit',
      label: '',
      hideable: false,
      align: 'right',
      render: (r) =>
        r.credentials.fields.length ? (
          <Button size="sm" variant="ghost" icon="key-round" onClick={(e) => { e.stopPropagation(); setKeysFor(r.identifier); }}>
            Edit keys
          </Button>
        ) : null,
    },
    {
      key: 'enabled',
      label: t('tdw_admin_ch_enabled', 'Enabled'),
      title: t('tdw_admin_ch_enabled', 'Enabled'),
      hideable: false,
      align: 'right',
      csv: (r) => (r.enabled ? 'on' : 'off'),
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch
            aria-label={t('tdw_admin_ch_enable_aria', 'Enable {{name}}', { name: r.name })}
            checked={r.enabled}
            onChange={(v) => toggle(r.identifier, v)}
          />
        </span>
      ),
    },
  ];

  return (
    <AdminPage
      title="Channels"
      description="Which channel types people can add, in what order, and the app keys Tadween connects them with."
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
      {usingDefaults ? (
        <Banner tone="info" icon="sparkles" title={t('tdw_admin_ch_defaults_title', 'Using the default focus networks.')}>
          {t(
            'tdw_admin_ch_defaults_body',
            'Until you save this page, customers can only add {{names}}. Saving here replaces that default.',
            {
              names: rows
                .filter((r) => r.focus)
                .map((r) => r.name)
                .join(', '),
            }
          )}
        </Banner>
      ) : null}

      {missing ? (
        <Banner
          tone="warning"
          title={t('tdw_admin_ch_missing_title', 'Enabled channel types missing keys: {{count}}', { count: missing })}
        >
          {t(
            'tdw_admin_ch_missing_body',
            'Customers don’t see them in Add channel until their keys are set here or as env vars.'
          )}
        </Banner>
      ) : null}

      <div className="flex items-center gap-[8px] flex-wrap">
        <span className="pz-set-label">
          {t('tdw_admin_ch_count', 'Channel types · {{ready}} of {{total}} shown to customers', {
            ready: readyCount,
            total: rows.length,
          })}
        </span>
        <span className="caption pz-muted">
          {t(
            'tdw_admin_ch_rule',
            'Customers see a channel type in Add channel only when it is enabled and its keys are set. Channels already connected keep publishing and can still reconnect.'
          )}
          {view === 'focus' ? ` ${t('tdw_admin_ch_view_hint', 'Switch to All to reorder.')}` : null}
        </span>
      </div>

      <DataTable
        id="admin-channels"
        mode="client"
        columns={columns}
        rows={shown}
        rowKey={(r) => r.identifier}
        query={query}
        onQueryChange={(patch) => setQuery((q) => applyQueryPatch(q, patch))}
        paginate={false}
        loading={isLoading}
        error={error ? error.message : null}
        onRetry={() => mutate()}
        searchPlaceholder="Search channel types"
        searchText={(r) => `${r.name} ${r.identifier} ${r.credentials.fields.map((f) => f.name).join(' ')}`}
        filters={[
          {
            key: 'state',
            label: 'Status',
            options: [
              { value: 'ready', label: t('tdw_admin_ch_ready', 'Ready') },
              { value: 'missing', label: t('tdw_admin_ch_missing_short', 'Missing keys') },
              { value: 'off', label: t('tdw_admin_ch_off', 'Disabled') },
              { value: 'hidden', label: t('tdw_admin_ch_hidden_env', 'Hidden by env') },
            ],
            match: (r, v) => stateOf(r) === v,
          },
          {
            key: 'enabled',
            label: t('tdw_admin_ch_enabled', 'Enabled'),
            options: [
              { value: 'on', label: t('tdw_admin_ch_yes', 'Yes') },
              { value: 'off', label: t('tdw_admin_ch_no', 'No') },
            ],
            match: (r, v) => (v === 'on') === r.enabled,
          },
        ]}
        toolbar={
          <>
            <SegmentedControl<View>
              size="sm"
              label={t('tdw_admin_ch_view', 'Show')}
              value={view}
              onChange={setView}
              options={[
                { value: 'focus', label: t('tdw_admin_ch_view_focus', 'Focus networks') },
                { value: 'all', label: t('tdw_admin_ch_view_all', 'All') },
              ]}
            />
            <Button size="sm" variant="ghost" icon="arrow-up" disabled={view === 'focus'} onClick={linkedinFirst}>
              LinkedIn first
            </Button>
          </>
        }
        onRowClick={(r) => r.credentials.fields.length && setKeysFor(r.identifier)}
        activeKey={keysFor}
        empty="No channel types"
      />
      <KeysDrawer provider={keysProvider} onClose={() => setKeysFor(null)} onSaved={() => mutate()} />
    </AdminPage>
  );
};
