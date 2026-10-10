'use client';

import React, { FC, useMemo, useState } from 'react';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  ConfirmDialog,
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
import {
  INSTANCE_SETTINGS_KEY,
  useTadweenPricing,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { PlanCard } from '@gitroom/frontend/components/tadween/billing/plans.view';
import { formatUsd } from '@gitroom/frontend/components/tadween/billing/pricing';
import { AdminPage } from './admin.shell';
import {
  AdminPlan,
  Tier,
  TIER_LABEL,
  useAdminMutation,
  useAdminPlans,
} from './admin.api';

const TIERS: Tier[] = ['STANDARD', 'TEAM', 'PRO', 'ULTIMATE'];

// Same rule as the server (PlansService yearlyPriceFrom)
const yearlyFrom = (monthly: number, discount: number) =>
  Math.round(monthly * 12 * (1 - discount / 100));

const limit = (v: number, unit: string) =>
  v < 0 ? `Unlimited ${unit}` : `${v.toLocaleString('en-US')} ${unit}`;

// ── Form ────────────────────────────────────────────────────────────────────
type FormState = {
  key: string;
  name: string;
  description: string;
  tier: Tier;
  monthlyPriceUsd: string;
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
  (['monthlyPriceUsd', 'trialDays', 'channels', 'position'] as const).forEach((k) => {
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
  discount: number;
  stripePrice: (tier: Tier) => { month: number; year: number } | undefined;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, plan, nextPosition, discount, stripePrice, onClose, onSaved }) => {
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
  const monthly = int(form.monthlyPriceUsd);
  const yearly = Number.isInteger(monthly) ? yearlyFrom(monthly, discount) : NaN;

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
      description="Prices are whole US dollars. Checkout charges them through Stripe; the yearly price follows the yearly discount."
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
          <div className="grid grid-cols-2 gap-[12px] mobile:grid-cols-1">
            <Input label="USD / month" inputMode="numeric" icon="credit-card" {...text('monthlyPriceUsd')} />
            <Input
              label="USD / year"
              value={Number.isNaN(yearly) ? '' : String(yearly)}
              readOnly
              hint={
                Number.isNaN(yearly)
                  ? `${discount}% off 12 months`
                  : `= ${formatUsd(yearly)}/yr, save ${formatUsd(monthly * 12 - yearly)} (${discount}% off)`
              }
            />
          </div>
          <p className="pz-note">
            {postiz
              ? `Without this plan, Stripe charges $${postiz.month}/month or $${postiz.year}/year for the ${TIER_LABEL[form.tier]} tier. `
              : null}
            New checkouts use these prices; people already subscribed keep what they pay.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-[12px] mobile:grid-cols-2">
          <Input label="Channels" inputMode="numeric" {...text('channels')} />
          <Input label="Team members" inputMode="numeric" hint="0 none, -1 unlimited" {...text('teamMembers')} />
          <Input label="Posts / month" inputMode="numeric" hint="-1 unlimited" {...text('postsPerMonth')} />
          <Input label="AI credits / month" inputMode="numeric" hint="0 turns AI off, -1 unlimited" {...text('aiCredits')} />
        </div>

        <Textarea
          label="Extra feature bullets"
          hint="One per line. Billing and the website list the plan's limits and features automatically; these lines come after them."
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

// ── Preview: the cards customers see (Billing and the paywall) ─────────────
const PricingPreview: FC = () => {
  const { plans } = useTadweenPricing();
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  if (!plans.length) return null;
  const rows = plans.reduce<string[]>((all, p) => {
    p.featureItems
      .filter((i) => i.value !== undefined)
      .forEach((i) => !all.includes(i.key) && all.push(i.key));
    return all;
  }, []);
  return (
    <Section
      title="Preview"
      description="The plan cards as Billing shows them, with the feature lists generated from each plan's limits."
      action={
        <SegmentedControl size="sm" label="Billing period" value={period} onChange={setPeriod} options={[{ value: 'MONTHLY', label: 'Monthly' }, { value: 'YEARLY', label: 'Yearly' }]} />
      }
    >
      <div className="tdw-plans-grid pt-[14px]" data-count={plans.length}>
        {plans.map((p) => (
          <PlanCard
            key={p.key}
            plan={p}
            period={period}
            rows={rows}
            cta={
              <Button variant={p.mostPopular ? 'primary' : 'secondary'} size="lg" className="w-full" tabIndex={-1}>
                {p.trialDays ? `Start ${p.trialDays}-day trial` : `Choose ${p.name}`}
              </Button>
            }
          />
        ))}
      </div>
    </Section>
  );
};

// The one discount every plan's yearly price follows
const YearlyDiscount: FC<{ value: number; onSaved: () => void }> = ({
  value,
  onSaved,
}) => {
  const save = useAdminMutation();
  const toast = useToaster();
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const n = Number(draft);
  const valid = draft.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= 90;
  return (
    <Section
      title="Yearly discount"
      description="Yearly price = 12 × the monthly price, minus this discount. Saving reprices every plan; existing subscriptions keep what they pay."
      action={
        <Button
          variant="primary"
          size="sm"
          loading={saving}
          disabled={!valid || n === value}
          onClick={async () => {
            setSaving(true);
            try {
              await save('/admin/console/plans/yearly-discount', 'PUT', { yearlyDiscountPercent: n });
              onSaved();
              toast.show('Yearly prices updated');
            } catch (e) {
              toast.show((e as Error).message, 'warning');
            } finally {
              setSaving(false);
            }
          }}
        >
          Save
        </Button>
      }
    >
      <div className="max-w-[220px] pt-[8px]">
        <Input
          label="Discount (%)"
          inputMode="numeric"
          value={draft}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
          error={valid ? undefined : 'A whole number from 0 to 90.'}
        />
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
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const plans = data?.plans || [];
  const discount = data?.yearlyDiscountPercent ?? 20;

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
      const result = await save<{ warnings?: string[] }>('/admin/console/plans/defaults', 'POST');
      await refresh();
      setWarnings(result?.warnings || []);
      toast.show(result?.warnings?.length ? 'Default plans loaded, with warnings' : 'Default plans loaded: Pro and Business');
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
          <div className="flex gap-[8px]">
            <Button variant="ghost" loading={seeding} onClick={() => setConfirmSeed(true)}>
              Load default plans
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>
              Add plan
            </Button>
          </div>
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
            body="Load the two Tadween plans, Pro and Business. They have every feature and differ only in limits. Prices are in US dollars; yearly is the monthly price with the yearly discount."
            action={
              <Button variant="primary" loading={seeding} loadingLabel="Adding…" onClick={seed}>
                Add Pro and Business
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
          {warnings.length ? (
            <Banner tone="warning" title="Some plans were left as they are.">
              <ul className="list-disc ps-[18px]">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Banner>
          ) : null}
          <Banner tone="info" title="How prices and limits apply.">
            New Stripe checkouts charge the plan’s USD price for its tier; people already subscribed keep what they
            pay. Limits apply to everyone on the tier, so they can’t go below today’s while a workspace is subscribed to it.
          </Banner>
          <YearlyDiscount key={discount} value={discount} onSaved={refresh} />
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
                key: 'subscribers',
                label: 'Subscribed',
                render: (p) => (
                  <span className="time">{data?.subscribers?.[p.tier] || 0}</span>
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
          <PricingPreview />
        </>
      )}

      {editing ? (
        <PlanDialog
          key={editing === 'new' ? 'new' : editing.id}
          open={!!editing}
          plan={editing === 'new' ? undefined : editing}
          nextPosition={plans.length}
          discount={discount}
          stripePrice={stripePrice}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refresh();
            toast.show(editing === 'new' ? 'Plan added' : 'Plan saved');
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmSeed}
        onClose={() => setConfirmSeed(false)}
        title="Load the default plans?"
        description="Pro and Business are added, or reset to their defaults if they exist. Other plans are hidden, except on tiers with subscribers, which stay on sale. Nobody already subscribed loses a limit."
        confirmLabel="Load defaults"
        onConfirm={() => {
          setConfirmSeed(false);
          seed();
        }}
      />

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Delete ${removing?.name || 'plan'}?`}
        description="It disappears from billing and the pricing page. Workspaces already on its tier keep their subscription and fall back to Postiz’s limits for that tier. If those are lower than the plan’s, the plan can’t be deleted while anyone is subscribed."
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
