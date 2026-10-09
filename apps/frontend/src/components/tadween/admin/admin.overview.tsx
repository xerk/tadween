'use client';

import React from 'react';
import {
  Banner,
  Icon,
  LinkButton,
  Pill,
  Row,
  Section,
  StatTile,
  Table,
} from '@gitroom/frontend/components/tadween/ui';
import { AdminPage } from './admin.shell';
import {
  TIER_LABEL,
  useAdminOverview,
  useAdminPlans,
  useAdminSettings,
} from './admin.api';

const n = (v?: number) => (v ?? 0).toLocaleString('en-US');

const MODE_LABEL = {
  open: 'Open to everyone',
  invite: 'Invite only',
  closed: 'Closed',
};

export const AdminOverviewPage = () => {
  const { data, error, isLoading } = useAdminOverview();
  const { data: settings } = useAdminSettings();
  const { data: plans } = useAdminPlans();

  const featuresOff = settings
    ? Object.values(settings.features).filter((v) => !v).length
    : 0;
  const planName = (tier: string) =>
    plans?.plans.find((p) => p.tier === tier && p.active)?.name;

  return (
    <AdminPage
      title="Overview"
      description="How this Tadween instance is doing right now."
    >
      {error ? (
        <Banner tone="error" title="Couldn’t load the overview.">
          {error.message}
        </Banner>
      ) : null}

      <div className="tdw-stat-grid">
        <StatTile
          loading={isLoading}
          label="Users"
          value={n(data?.users)}
          hint={data?.inactiveUsers ? `${n(data.inactiveUsers)} not activated` : 'All activated'}
          href="/admin/users"
        />
        <StatTile loading={isLoading} label="Workspaces" value={n(data?.organizations)} hint="Open subscribers" href="/admin/organizations" />
        <StatTile
          loading={isLoading}
          label="Channels"
          value={n(data?.channels)}
          hint={`${n(data?.refreshNeeded)} need reconnecting · ${n(data?.disabledChannels)} disabled`}
          tone={data?.refreshNeeded ? 'warn' : 'neutral'}
          href="/admin/channels"
        />
        <StatTile loading={isLoading} label="Scheduled posts" value={n(data?.scheduled)} hint="Queued from now on" />
        <StatTile loading={isLoading} label="Published, last 24 h" value={n(data?.published24h)} />
        <StatTile
          loading={isLoading}
          label="Failed, last 24 h"
          value={n(data?.failed24h)}
          tone={data?.failed24h ? 'bad' : 'neutral'}
          hint={data?.failed24h ? 'Open post errors' : 'No failures'}
          href="/admin/errors"
        />
      </div>

      <div className="grid grid-cols-2 gap-[16px] mobile:grid-cols-1">
        <Section
          title="Subscriptions"
          description="Workspaces on each paid tier."
          action={
            <LinkButton href="/admin/organizations" size="sm" variant="ghost" iconEnd="arrow-right">
              Subscribers
            </LinkButton>
          }
        >
          <Table
            dense
            loading={isLoading}
            rowKey={(r) => r.tier}
            rows={data?.subscriptions || []}
            empty="No paid workspaces yet"
            columns={[
              {
                key: 'tier',
                label: 'Tier',
                render: (r) => (
                  <span className="flex items-center gap-[8px]">
                    {planName(r.tier) || TIER_LABEL[r.tier]}
                    {planName(r.tier) ? (
                      <span className="caption pz-muted">{TIER_LABEL[r.tier]}</span>
                    ) : null}
                  </span>
                ),
              },
              {
                key: 'count',
                label: 'Workspaces',
                align: 'right',
                render: (r) => <span className="time">{n(r.count)}</span>,
              },
            ]}
          />
        </Section>

        <Section title="Instance" description="What new and existing users get.">
          <Row
            label="Registration"
            description={settings ? MODE_LABEL[settings.registration.mode] : '…'}
            control={
              <LinkButton href="/admin/features" size="sm" variant="ghost">
                Change
              </LinkButton>
            }
          />
          <Row
            label="Features"
            description={
              featuresOff
                ? `${featuresOff} switched off`
                : 'Everything is on'
            }
            control={
              <LinkButton href="/admin/features" size="sm" variant="ghost">
                Review
              </LinkButton>
            }
          />
          <Row
            label="Plans"
            description={
              plans?.plans.length
                ? `${plans.plans.filter((p) => p.active).length} on sale`
                : 'Using Postiz’s built-in pricing'
            }
            control={
              plans?.plans.length ? (
                <Pill tone="ok" icon="check">
                  Configured
                </Pill>
              ) : (
                <LinkButton href="/admin/plans" size="sm" variant="ghost">
                Set up
              </LinkButton>
              )
            }
          />
        </Section>
      </div>

      <Section title="Tools" description="Postiz’s existing admin screens.">
        <Row
          label={
            <span className="inline-flex items-center gap-[8px]">
              <Icon name="triangle-alert" /> Post errors
            </span>
          }
          description="Every failed publish with the provider’s response."
          control={
            <LinkButton href="/admin/errors" size="sm" iconEnd="arrow-right">
                Open
              </LinkButton>
          }
        />
        <Row
          label={
            <span className="inline-flex items-center gap-[8px]">
              <Icon name="chart-column" /> Usage stats
            </span>
          }
          description="Posts, errors and connected channels per platform."
          control={
            <LinkButton href="/admin/stats" size="sm" iconEnd="arrow-right">
                Open
              </LinkButton>
          }
        />
      </Section>
    </AdminPage>
  );
};
