'use client';

// "Change plan" for one workspace (Users and Subscribers pages). Grants a tier
// without a payment through PUT /admin/console/organizations/:id/tier, which
// refuses lifetime deals and workspaces paying through Stripe.
import React, { FC, useEffect, useState } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  Dialog,
  RadioGroup,
} from '@gitroom/frontend/components/tadween/ui';
import { TIER_LABEL, useAdminMutation, useAdminPlans } from './admin.api';

export interface PlanTarget {
  id: string; // organization id
  name: string;
  tier: string; // FREE when there is no live subscription
}

export const ChangePlanDialog: FC<{
  workspace: PlanTarget | null;
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
      setTier(workspace.tier);
      setErr('');
    }
  }, [workspace]);
  const planName = (t: string) => plans?.plans.find((p) => p.tier === t && p.active)?.name;
  const options = ['FREE', 'STANDARD', 'TEAM', 'PRO', 'ULTIMATE'].map((t) => ({
    value: t,
    label: planName(t) ? `${planName(t)} · ${TIER_LABEL[t]}` : TIER_LABEL[t],
    description:
      t === 'FREE'
        ? 'Removes an admin-granted plan. Channels above the free limit are disabled.'
        : undefined,
  }));
  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await save(`/admin/console/organizations/${workspace!.id}/tier`, 'PUT', { tier });
      toast.show(`${workspace!.name} is now on ${planName(tier) || TIER_LABEL[tier]}`);
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
      description={`For ${workspace?.name || ''}. This grants the plan without a payment, like Postiz’s admin “add subscription”.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} loadingLabel="Changing…" disabled={!!workspace && tier === workspace.tier} onClick={submit}>
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
