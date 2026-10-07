'use client';

import React, { useState } from 'react';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Pill,
  RadioGroup,
  Row,
  Section,
  Skeleton,
  Switch,
} from '@gitroom/frontend/components/tadween/ui';
import { INSTANCE_SETTINGS_KEY } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { AdminPage } from './admin.shell';
import {
  AdminSettings,
  RegistrationMode,
  useAdminMutation,
  useAdminSettings,
} from './admin.api';

const MODES: { value: RegistrationMode; label: string; description: string }[] = [
  {
    value: 'open',
    label: 'Open',
    description: 'Anyone can create an account and a workspace.',
  },
  {
    value: 'invite',
    label: 'Invite only',
    description: 'Only people with a workspace invite link can sign up.',
  },
  {
    value: 'closed',
    label: 'Closed',
    description: 'No new accounts. The very first account on a fresh instance is still allowed.',
  },
];

const GROUPS = ['Publishing', 'Smart', 'Workspace', 'Developers', 'Growth'];

export const AdminFeaturesPage = () => {
  const { data, error, isLoading, mutate } = useAdminSettings();
  const { mutate: globalMutate } = useSWRConfig();
  const save = useAdminMutation();
  const toast = useToaster();
  const [pending, setPending] = useState<string | null>(null);

  const apply = async (
    key: string,
    path: string,
    body: unknown,
    optimistic: AdminSettings,
    done: string
  ) => {
    setPending(key);
    try {
      await mutate(
        async () => {
          const next = await save<Omit<AdminSettings, 'featureDefinitions' | 'env'>>(path, 'PUT', body);
          return { ...optimistic, ...next };
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false }
      );
      // The rest of the app reads the public copy; refresh it in this tab.
      globalMutate(INSTANCE_SETTINGS_KEY);
      toast.show(done);
    } catch (e) {
      toast.show((e as Error).message, 'warning');
    } finally {
      setPending(null);
    }
  };

  const setMode = (mode: RegistrationMode) =>
    data &&
    apply(
      'registration',
      '/admin/console/settings/registration',
      { mode },
      { ...data, registration: { mode } },
      `Registration is now ${MODES.find((m) => m.value === mode)!.label.toLowerCase()}`
    );

  const setFeature = (key: string, on: boolean, label: string) =>
    data &&
    apply(
      key,
      '/admin/console/settings/features',
      { features: { [key]: on } },
      { ...data, features: { ...data.features, [key]: on } },
      `${label} turned ${on ? 'on' : 'off'}`
    );

  const envMode = data?.env.DISABLE_REGISTRATION
    ? 'closed (DISABLE_REGISTRATION)'
    : data?.env.INVITE_ONLY_REGISTRATION
    ? 'invite only (INVITE_ONLY_REGISTRATION)'
    : 'open';

  return (
    <AdminPage
      title="Features"
      description="Turn parts of Tadween on or off for every workspace. Changes apply right away."
    >
      {error ? (
        <Banner tone="error" title="Couldn’t load settings.">
          {error.message}
        </Banner>
      ) : null}

      <Section
        title="Registration"
        description={`Who can create a new account. Until you choose, the environment decides: ${envMode}.`}
      >
        {isLoading || !data ? (
          <Skeleton height={120} radius={10} />
        ) : (
          <RadioGroup
            label="Registration"
            columns={3}
            value={data.registration.mode}
            onChange={setMode}
            options={MODES.map((m) => ({
              value: m.value,
              label: m.label,
              description: m.description,
            }))}
          />
        )}
      </Section>

      {GROUPS.map((group) => {
        const defs = (data?.featureDefinitions || []).filter((f) => f.group === group);
        if (!defs.length && !isLoading) return null;
        return (
          <Section key={group} title={group}>
            {isLoading || !data
              ? [0, 1].map((i) => <Skeleton key={i} height={44} />)
              : defs.map((f) => (
                  <Row
                    key={f.key}
                    label={
                      <span className="inline-flex items-center gap-[8px]">
                        {f.label}
                        {!f.applied ? (
                          <Pill icon="clock">Saved only, applied in a later release</Pill>
                        ) : null}
                      </span>
                    }
                    description={
                      <>
                        {f.description}
                        <br />
                        <span className="caption">Off hides: {f.hides}</span>
                      </>
                    }
                    control={
                      <Switch
                        aria-label={f.label}
                        checked={data.features[f.key] !== false}
                        disabled={pending === f.key}
                        onChange={(v) => setFeature(f.key, v, f.label)}
                      />
                    }
                  />
                ))}
          </Section>
        );
      })}

      {data?.env.TADWEEN_DISABLED_FEATURES ? (
        <Banner tone="info" title="Environment defaults.">
          TADWEEN_DISABLED_FEATURES is set to “{data.env.TADWEEN_DISABLED_FEATURES}”. Those features start off until you
          switch them here.
        </Banner>
      ) : null}
    </AdminPage>
  );
};
