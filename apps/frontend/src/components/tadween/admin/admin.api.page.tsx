'use client';

// API: where the backend lives, whether workspaces get the public API and
// webhooks, and the super-admin console's own endpoints (all behind
// PlatformAdminGuard). Static reference, nothing is called from here.
import React from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import {
  DataColumn,
  DataTable,
  LinkButton,
  Pill,
  Row,
  Section,
} from '@gitroom/frontend/components/tadween/ui';
import { AdminPage } from './admin.shell';
import { useAdminSettings } from './admin.api';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  purpose: string;
}

const ENDPOINTS: Endpoint[] = [
  { method: 'GET', path: '/admin/console/overview', purpose: 'Counts for the Overview page' },
  { method: 'GET', path: '/admin/console/organizations', purpose: 'Subscribers list: page, pageSize, sort, order, search, tier, status' },
  { method: 'GET', path: '/admin/console/organizations/:id', purpose: 'Workspace detail: subscription, members, channels (no tokens), usage' },
  { method: 'PUT', path: '/admin/console/organizations/:id/tier', purpose: 'Grant a tier without payment (refused for Stripe and lifetime)' },
  { method: 'GET', path: '/admin/console/users', purpose: 'Users list: page, pageSize, sort, order, search, status, role' },
  { method: 'PUT', path: '/admin/console/users/:id/activation', purpose: 'Activate or deactivate a user' },
  { method: 'GET', path: '/admin/console/providers', purpose: 'Channel types, order, switches and key status (never values)' },
  { method: 'PUT', path: '/admin/console/providers', purpose: 'Save order and switches' },
  { method: 'PUT', path: '/admin/console/providers/:identifier/credentials', purpose: 'Set or remove app keys (write-only, encrypted)' },
  { method: 'GET', path: '/admin/console/plans', purpose: 'Plans and Postiz’s built-in pricing' },
  { method: 'POST', path: '/admin/console/plans', purpose: 'Add a plan' },
  { method: 'PUT', path: '/admin/console/plans/:id', purpose: 'Edit a plan' },
  { method: 'DELETE', path: '/admin/console/plans/:id', purpose: 'Delete a plan' },
  { method: 'POST', path: '/admin/console/plans/defaults', purpose: 'Add the four Tadween plans' },
  { method: 'GET', path: '/admin/console/settings', purpose: 'Registration, features, branding' },
  { method: 'PUT', path: '/admin/console/settings/registration', purpose: 'Registration mode' },
  { method: 'PUT', path: '/admin/console/settings/features', purpose: 'Feature switches' },
  { method: 'PUT', path: '/admin/console/settings/branding', purpose: 'Branding' },
  { method: 'GET', path: '/admin/errors', purpose: 'Postiz: failed posts (page, limit, platform, email, unknownFirst)' },
  { method: 'GET', path: '/admin/stats', purpose: 'Postiz: usage stats (from, to, unknownOnly)' },
  { method: 'POST', path: '/user/impersonate', purpose: 'Postiz: impersonate a workspace member' },
];

const columns: DataColumn<Endpoint>[] = [
  {
    key: 'method',
    label: 'Method',
    title: 'Method',
    width: 96,
    sortable: true,
    sortValue: (e) => e.method,
    csv: (e) => e.method,
    render: (e) => <Pill tone={e.method === 'GET' ? 'neutral' : 'brand'}>{e.method}</Pill>,
  },
  {
    key: 'path',
    label: 'Path',
    title: 'Path',
    sortable: true,
    sortValue: (e) => e.path,
    csv: (e) => e.path,
    render: (e) => <code className="pz-code">{e.path}</code>,
  },
  { key: 'purpose', label: 'What it does', title: 'What it does', csv: (e) => e.purpose, render: (e) => <span className="caption">{e.purpose}</span> },
];

export const AdminApiPage = () => {
  const { backendUrl, mcpUrl } = useVariables();
  const { data: settings } = useAdminSettings();
  const on = (key: string) => settings?.features?.[key] !== false;

  return (
    <AdminPage title="API" description="The backend this console talks to and the API workspaces get.">
      <div className="grid grid-cols-2 gap-[16px] mobile:grid-cols-1">
        <Section title="Backend">
          <Row label="URL" description={<code className="pz-code break-all">{backendUrl}</code>} control={null} />
          <Row
            label="Swagger"
            description="Every route of this backend."
            control={
              <a className="pz-btn pz-btn-ghost pz-btn-sm no-underline" href={`${backendUrl}/docs`} target="_blank" rel="noreferrer">
                Open
              </a>
            }
          />
          {mcpUrl ? <Row label="MCP" description={<code className="pz-code break-all">{mcpUrl}</code>} control={null} /> : null}
        </Section>
        <Section
          title="For workspaces"
          action={
            <LinkButton href="/admin/features" size="sm" variant="ghost" iconEnd="arrow-right">
              Features
            </LinkButton>
          }
        >
          <Row
            label="Public API, MCP and CLI"
            control={on('publicApi') ? <Pill tone="ok" icon="check">On</Pill> : <Pill icon="minus">Off</Pill>}
          />
          <Row
            label="Webhooks"
            control={on('webhooks') ? <Pill tone="ok" icon="check">On</Pill> : <Pill icon="minus">Off</Pill>}
          />
        </Section>
      </div>
      <Section title="Console endpoints" description="Every one of them refuses anyone who isn’t a super admin.">
        <DataTable
          id="admin-api"
          columns={columns}
          rows={ENDPOINTS}
          rowKey={(e) => e.method + e.path}
          paginate={false}
          searchPlaceholder="Search endpoints"
          searchText={(e) => `${e.method} ${e.path} ${e.purpose}`}
          filters={[
            {
              key: 'method',
              label: 'Method',
              options: ['GET', 'POST', 'PUT', 'DELETE'].map((m) => ({ value: m, label: m })),
              match: (e, v) => e.method === v,
            },
          ]}
        />
      </Section>
    </AdminPage>
  );
};
