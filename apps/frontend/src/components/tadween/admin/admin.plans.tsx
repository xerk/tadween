'use client';

import React, { FC, useMemo, useState } from 'react';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  ConfirmDialog,
  cx,
  Dialog,
  EmptyState,
  Icon,
  IconButton,
  Input,
  Pill,
  Section,
  SegmentedControl,
  Select,
  Switch,
  DataTable,
  Textarea,
} from '@gitroom/frontend/components/tadween/ui';
import { INSTANCE_SETTINGS_KEY } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { AdminPage } from './admin.shell';
import {
  AdminPlan,
  Tier,
  TIER_LABEL,
  useAdminMutation,
  useAdminPlans,
} from './admin.api';

const TIERS: Tier[] = ['STANDARD', 'TEAM', 'PRO', 'ULTIMATE'];

const limit = (v: number, unit: string) =>
  v < 0 ? `Unlimited ${unit}` : `${v.toLocaleString('en-US')} ${unit}`;

// ── Form ────────────────────────────────────────────────────────────────────
type FormState = {
  key: string;
  name: string;
  description: string;
  tier: Tier;
  monthlyPriceUsd: string;
  yearlyPriceUsd: string;
  monthlyPriceEgp: string;
  yearlyPriceEgp: string;
  trialDays: string;
  mostPopular: boolean;
  channels: string;
  teamMembers: string;
  postsPerMonth: string;
  aiCredits: string;
  features: string;
  providerPriceIdMonthly: string;
  providerPriceIdYearly: string;
  active: boolean;
  position: string;
};

const toForm = (p?: AdminPlan, position = 0): FormState => ({
  key: p?.key || '',
  name: p?.name || '',
  description: p?.description || '',
  tier: p?.tier || 'STANDARD',
  monthlyPriceUsd: String(p?.monthlyPriceUsd ?? 0),
  yearlyPriceUsd: String(p?.yearlyPriceUsd ?? 0),
  monthlyPriceEgp: String(p?.monthlyPriceEgp ?? 0),
  yearlyPriceEgp: String(p?.yearlyPriceEgp ?? 0),
  trialDays: String(p?.trialDays ?? 7),
  mostPopular: !!p?.mostPopular,
  channels: String(p?.channels ?? 5),
  teamMembers: String(p?.teamMembers ?? 0),
  postsPerMonth: String(p?.postsPerMonth ?? -1),
  aiCredits: String(p?.aiCredits ?? 0),
  features: (p?.features || []).join('\n'),
  providerPriceIdMonthly: p?.providerPriceIdMonthly || '',
  providerPriceIdYearly: p?.providerPriceIdYearly || '',
  active: p ? p.active : true,
  position: String(p?.position ?? position),
});

const int = (v: string) => (v.trim() === '' ? NaN : Number(v));

const validate = (f: FormState) => {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!/^[a-z0-9-]{2,32}$/.test(f.key)) errors.key = 'Lowercase letters, numbers and dashes, 2 to 32 characters.';
  if (!f.name.trim()) errors.name = 'Give the plan a name.';
  (['monthlyPriceUsd', 'yearlyPriceUsd', 'monthlyPriceEgp', 'yearlyPriceEgp', 'trialDays', 'channels', 'position'] as const).forEach((k) => {
    const n = int(f[k]);
    if (!Number.isInteger(n) || n < 0) errors[k] = 'A whole number, 0 or more.';
  });
  (['teamMembers', 'postsPerMonth', 'aiCredits'] as const).forEach((k) => {
    const n = int(f[k]);
    if (!Number.isInteger(n) || n < -1) errors[k] = 'A whole number; -1 means unlimited.';
  });
  return errors;
};

const toBody = (f: FormState) => ({
  key: f.key.trim(),
  name: f.name.trim(),
  description: f.description.trim() || undefined,
  tier: f.tier,
  monthlyPriceUsd: int(f.monthlyPriceUsd),
  yearlyPriceUsd: int(f.yearlyPriceUsd),
  monthlyPriceEgp: int(f.monthlyPriceEgp),
  yearlyPriceEgp: int(f.yearlyPriceEgp),
  trialDays: int(f.trialDays),
  mostPopular: f.mostPopular,
  channels: int(f.channels),
  teamMembers: int(f.teamMembers),
  postsPerMonth: int(f.postsPerMonth),
  aiCredits: int(f.aiCredits),
  features: f.features.split('\n').map((x) => x.trim()).filter(Boolean),
  providerPriceIdMonthly: f.providerPriceIdMonthly.trim() || undefined,
  providerPriceIdYearly: f.providerPriceIdYearly.trim() || undefined,
  active: f.active,
  position: int(f.position),
});

const PlanDialog: FC<{
  open: boolean;
  plan?: AdminPlan;
  nextPosition: number;
  stripePrice: (tier: Tier) => { month: number; year: number } | undefined;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, plan, nextPosition, stripePrice, onClose, onSaved }) => {
  const [form, setForm] = useState<FormState>(toForm(plan, nextPosition));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const save = useAdminMutation();
  const errors = validate(form);
  const shownErrors = submitted ? errors : {};
  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setForm({ ...form, [k]: v });
  const text = (k: keyof FormState) => ({
    value: form[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k)(e.target.value as never),
    error: shownErrors[k],
  });
  const postiz = stripePrice(form.tier);

  const submit = async () => {
    setSubmitted(true);
    setServerError('');
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      await save(plan ? `/admin/console/plans/${plan.id}` : '/admin/console/plans', plan ? 'PUT' : 'POST', toBody(form));
      onSaved();
      onClose();
    } catch (e) {
      setServerError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={plan ? `Edit ${plan.name}` : 'Add plan'}
      description="Prices are whole numbers. Checkout charges the USD price through Stripe."
      footer={
        <>
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} loadingLabel="Saving…" onClick={submit}>
            {plan ? 'Save plan' : 'Add plan'}
          </Button>
        </>
      }
    >
      <div className="grid gap-[16px]">
        {serverError ? (
          <Banner tone="error" title="Couldn’t save the plan.">
            {serverError}
          </Banner>
        ) : null}
        <div className="grid grid-cols-2 gap-[12px] mobile:grid-cols-1">
          <Input label="Name" placeholder="Creator" {...text('name')} />
          <Input label="Key" placeholder="creator" hint="Used in links and the API. Can’t clash with another plan." {...text('key')} />
          <Input label="Description" placeholder="For one voice on LinkedIn" className="col-span-2 mobile:col-span-1" {...text('description')} />
          <Select<Tier>
            label="Billing tier"
            value={form.tier}
            onChange={set('tier')}
            hint="The Postiz tier this plan sells. Stripe products, permissions and existing subscriptions are keyed by it. One active plan per tier."
            options={TIERS.map((t) => ({ value: t, label: TIER_LABEL[t] }))}
          />
          <Input label="Free trial (days)" inputMode="numeric" {...text('trialDays')} />
        </div>

        <div className="grid gap-[8px]">
          <span className="pz-label">Prices</span>
          <div className="grid grid-cols-4 gap-[12px] mobile:grid-cols-2">
            <Input label="USD / month" inputMode="numeric" icon="credit-card" {...text('monthlyPriceUsd')} />
            <Input label="USD / year" inputMode="numeric" {...text('yearlyPriceUsd')} />
            <Input label="EGP / month" inputMode="numeric" {...text('monthlyPriceEgp')} />
            <Input label="EGP / year" inputMode="numeric" {...text('yearlyPriceEgp')} />
          </div>
          <p className="pz-note">
            {postiz
              ? `Without this plan, Stripe charges $${postiz.month}/month or $${postiz.year}/year for ${TIER_LABEL[form.tier]}. New checkouts use the USD prices above; existing subscribers keep their price.`
              : null}{' '}
            EGP prices are stored for the pricing page; charging in EGP needs a local payment provider (later phase).
          </p>
        </div>

        <div className="grid grid-cols-4 gap-[12px] mobile:grid-cols-2">
          <Input label="Channels" inputMode="numeric" {...text('channels')} />
          <Input label="Team members" inputMode="numeric" hint="0 none, -1 unlimited" {...text('teamMembers')} />
          <Input label="Posts / month" inputMode="numeric" hint="-1 unlimited" {...text('postsPerMonth')} />
          <Input label="AI credits / month" inputMode="numeric" hint="0 turns AI off, -1 unlimited" {...text('aiCredits')} />
        </div>

        <Textarea
          label="Feature bullets"
          hint="One per line, shown on the pricing page. Leave empty to list the limits automatically."
          rows={5}
          {...text('features')}
        />

        <div className="grid grid-cols-3 gap-[12px] mobile:grid-cols-1 items-start">
          <Switch label="On sale" description="Shown on billing and pricing." checked={form.active} onChange={set('active')} />
          <Switch label="Most popular" description="Highlighted; only one plan can be." checked={form.mostPopular} onChange={set('mostPopular')} />
          <Input label="Position" inputMode="numeric" hint="Lower comes first." {...text('position')} />
        </div>

        <details className="pz-set-sec px-[16px] py-[12px]">
          <summary className="cursor-pointer pz-set-label">Payment provider price IDs (optional)</summary>
          <div className="grid grid-cols-2 gap-[12px] mt-[12px] mobile:grid-cols-1">
            <Input label="Monthly price ID" placeholder="price_…" {...text('providerPriceIdMonthly')} />
            <Input label="Yearly price ID" placeholder="price_…" {...text('providerPriceIdYearly')} />
          </div>
          <p className="pz-note mt-[8px]">Stored for a later phase. Checkout doesn’t read them yet, so Stripe keeps creating prices from the USD amounts.</p>
        </details>
      </div>
    </Dialog>
  );
};

// ── Preview (design system PricingTable) ────────────────────────────────────
const PricingPreview: FC<{ plans: AdminPlan[] }> = ({ plans }) => {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [currency, setCurrency] = useState<'USD' | 'EGP'>('USD');
  const yearly = period === 'yearly';
  const onSale = plans.filter((p) => p.active);
  if (!onSale.length) return null;
  const price = (p: AdminPlan) => {
    const m = currency === 'USD' ? p.monthlyPriceUsd : p.monthlyPriceEgp;
    const y = currency === 'USD' ? p.yearlyPriceUsd : p.yearlyPriceEgp;
    return yearly ? Math.round(y / 12) : m;
  };
  return (
    <Section
      title="Preview"
      description="How the plans read on the pricing page."
      action={
        <div className="flex gap-[8px]">
          <SegmentedControl size="sm" label="Currency" value={currency} onChange={setCurrency} options={[{ value: 'USD', label: 'USD' }, { value: 'EGP', label: 'EGP' }]} />
          <SegmentedControl size="sm" label="Billing period" value={period} onChange={setPeriod} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
        </div>
      }
    >
      <div className="pz-tiers pt-[14px]" style={{ gridTemplateColumns: `repeat(${Math.min(onSale.length, 4)}, minmax(0, 1fr))` }}>
        {onSale.map((p) => (
          <section key={p.id} className={cx('pz-tier', p.mostPopular && 'is-popular')}>
            {p.mostPopular ? (
              <span className="pz-tier-flag">
                <Icon name="star" size={12} />
                Most popular
              </span>
            ) : null}
            <h3 className="title-2 pz-tier-name">{p.name}</h3>
            <p className="pz-tier-for">{p.description}</p>
            <div className="pz-tier-price">
              <span className="pz-tier-cur caption">{currency}</span>
              <span key={period + currency} className="metric pz-tier-amount">
                {price(p).toLocaleString('en-US')}
              </span>
              <span className="pz-tier-per">/ month</span>
            </div>
            <p className="caption pz-muted pz-tier-bill">
              {yearly
                ? `Billed ${currency} ${(currency === 'USD' ? p.yearlyPriceUsd : p.yearlyPriceEgp).toLocaleString('en-US')} yearly`
                : 'Billed monthly'}
            </p>
            <Button variant={p.mostPopular ? 'primary' : 'secondary'} className="pz-tier-cta" tabIndex={-1}>
              {p.trialDays ? `Start ${p.trialDays}-day trial` : 'Choose plan'}
            </Button>
            <ul className="pz-plan-list list-none p-0 m-0 grid gap-[8px] text-[14px]">
              {(p.features.length
                ? p.features
                : [limit(p.channels, 'channels'), limit(p.postsPerMonth, 'posts a month'), p.teamMembers ? limit(p.teamMembers, 'team members') : 'Just you']
              ).map((f) => (
                <li key={f} className="flex gap-[8px] items-start">
                  <Icon name="check" className="text-[var(--tdw-primary)] mt-[2px]" />
                  {f}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Section>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
export const AdminPlansPage = () => {
  const { data, error, isLoading, mutate } = useAdminPlans();
  const { mutate: globalMutate } = useSWRConfig();
  const save = useAdminMutation();
  const toast = useToaster();
  const [editing, setEditing] = useState<AdminPlan | 'new' | null>(null);
  const [removing, setRemoving] = useState<AdminPlan | null>(null);
  const [seeding, setSeeding] = useState(false);
  const plans = data?.plans || [];

  const refresh = async () => {
    await mutate();
    globalMutate(INSTANCE_SETTINGS_KEY);
  };

  const stripePrice = useMemo(
    () => (tier: Tier) => {
      const p = data?.postizPricing?.[tier];
      return p ? { month: p.month_price, year: p.year_price } : undefined;
    },
    [data]
  );

  const seed = async () => {
    setSeeding(true);
    try {
      await save('/admin/console/plans/defaults', 'POST');
      await refresh();
      toast.show('Added Creator, Pro, Team and Agency with placeholder prices');
    } catch (e) {
      toast.show((e as Error).message, 'warning');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <AdminPage
      title="Plans"
      description="What workspaces can buy. Billing and the pricing page read these plans; without any, Postiz’s built-in pricing is used."
      action={
        plans.length ? (
          <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>
            Add plan
          </Button>
        ) : null
      }
    >
      {error ? (
        <Banner tone="error" title="Couldn’t load plans.">
          {error.message}
        </Banner>
      ) : null}

      {!isLoading && !plans.length ? (
        <Section title="No plans yet">
          <EmptyState
            icon="credit-card"
            title="Billing uses Postiz’s built-in pricing"
            body="Load the four Tadween plans with placeholder prices, then set your real EGP and USD prices before you sell."
            action={
              <Button variant="primary" loading={seeding} loadingLabel="Adding…" onClick={seed}>
                Add the Tadween plans
              </Button>
            }
            secondary={
              <Button variant="ghost" icon="plus" onClick={() => setEditing('new')}>
                Start from scratch
              </Button>
            }
          />
        </Section>
      ) : (
        <>
          <Banner tone="warning" title="Check prices before you sell.">
            The Tadween defaults are placeholders. New Stripe checkouts charge the USD price of the plan for its tier;
            people already subscribed keep what they pay.
          </Banner>
          <DataTable
            id="admin-plans"
            loading={isLoading}
            rowKey={(p) => p.id}
            rows={plans}
            paginate={false}
            searchable={false}
            onRowClick={(p) => setEditing(p)}
            columns={[
              {
                key: 'name',
                label: 'Plan',
                render: (p) => (
                  <span className="grid">
                    <span className="pz-set-label inline-flex items-center gap-[6px]">
                      {p.name}
                      {p.mostPopular ? <Icon name="star" size={14} className="text-[var(--tdw-primary)]" label="Most popular" /> : null}
                    </span>
                    <span className="caption pz-muted">
                      {p.key} · {TIER_LABEL[p.tier]} tier
                    </span>
                  </span>
                ),
              },
              {
                key: 'usd',
                label: 'USD',
                render: (p) => (
                  <span className="time">
                    ${p.monthlyPriceUsd}/mo · ${p.yearlyPriceUsd}/yr
                  </span>
                ),
              },
              {
                key: 'egp',
                label: 'EGP',
                render: (p) => (
                  <span className="time">
                    {p.monthlyPriceEgp.toLocaleString('en-US')}/mo · {p.yearlyPriceEgp.toLocaleString('en-US')}/yr
                  </span>
                ),
              },
              {
                key: 'limits',
                label: 'Limits',
                render: (p) => (
                  <span className="caption pz-muted grid">
                    <span>
                      {limit(p.channels, 'channels')} · {p.teamMembers === 0 ? 'no team' : limit(p.teamMembers, 'members')}
                    </span>
                    <span>
                      {limit(p.postsPerMonth, 'posts/mo')} · {p.aiCredits === 0 ? 'AI off' : limit(p.aiCredits, 'AI credits')}
                    </span>
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (p) =>
                  p.active ? (
                    <Pill tone="ok" icon="check">
                      On sale
                    </Pill>
                  ) : (
                    <Pill icon="eye">Hidden</Pill>
                  ),
              },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (p) => (
                  <span className="pz-row-actions" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="sm" icon="pencil" label={`Edit ${p.name}`} onClick={() => setEditing(p)} />
                    <IconButton size="sm" icon="trash-2" label={`Delete ${p.name}`} onClick={() => setRemoving(p)} />
                  </span>
                ),
              },
            ]}
          />
          <PricingPreview plans={plans} />
        </>
      )}

      {editing ? (
        <PlanDialog
          key={editing === 'new' ? 'new' : editing.id}
          open={!!editing}
          plan={editing === 'new' ? undefined : editing}
          nextPosition={plans.length}
          stripePrice={stripePrice}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refresh();
            toast.show(editing === 'new' ? 'Plan added' : 'Plan saved');
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Delete ${removing?.name || 'plan'}?`}
        description="It disappears from billing and the pricing page. Workspaces already on its tier keep their subscription and fall back to Postiz’s limits for that tier."
        confirmLabel="Delete plan"
        onConfirm={async () => {
          try {
            await save(`/admin/console/plans/${removing!.id}`, 'DELETE');
            await refresh();
            toast.show('Plan deleted');
          } catch (e) {
            toast.show((e as Error).message, 'warning');
          }
        }}
      />
    </AdminPage>
  );
};
