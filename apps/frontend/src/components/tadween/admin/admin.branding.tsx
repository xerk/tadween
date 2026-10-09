'use client';

import React, { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Banner,
  Button,
  Input,
  Row,
  Section,
  Select,
  Skeleton,
} from '@gitroom/frontend/components/tadween/ui';
import { INSTANCE_SETTINGS_KEY } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { AdminPage } from './admin.shell';
import { Branding, useAdminMutation, useAdminSettings } from './admin.api';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية', description: 'Arabic' },
  { value: 'fr', label: 'Français', description: 'French' },
  { value: 'de', label: 'Deutsch', description: 'German' },
  { value: 'es', label: 'Español', description: 'Spanish' },
  { value: 'pt', label: 'Português', description: 'Portuguese' },
  { value: 'it', label: 'Italiano', description: 'Italian' },
  { value: 'tr', label: 'Türkçe', description: 'Turkish' },
  { value: 'ru', label: 'Русский', description: 'Russian' },
  { value: 'zh', label: '中文', description: 'Chinese' },
  { value: 'ja', label: '日本語', description: 'Japanese' },
  { value: 'ko', label: '한국어', description: 'Korean' },
  { value: 'vi', label: 'Tiếng Việt', description: 'Vietnamese' },
  { value: 'bn', label: 'বাংলা', description: 'Bengali' },
  { value: 'ka_ge', label: 'ქართული', description: 'Georgian' },
];

const ZONES = [
  { value: '', label: 'Each person’s browser', description: 'What Postiz does today' },
  { value: 'Africa/Cairo', label: 'Cairo', description: 'GMT+2 / +3' },
  { value: 'Asia/Riyadh', label: 'Riyadh', description: 'GMT+3' },
  { value: 'Asia/Dubai', label: 'Dubai', description: 'GMT+4' },
  { value: 'Asia/Amman', label: 'Amman', description: 'GMT+3' },
  { value: 'Asia/Beirut', label: 'Beirut', description: 'GMT+2 / +3' },
  { value: 'Africa/Casablanca', label: 'Casablanca', description: 'GMT+1' },
  { value: 'Europe/London', label: 'London', description: 'GMT / +1' },
  { value: 'Europe/Berlin', label: 'Berlin', description: 'GMT+1 / +2' },
  { value: 'America/New_York', label: 'New York', description: 'GMT−5 / −4' },
  { value: 'UTC', label: 'UTC' },
];

export const AdminBrandingPage = () => {
  const { data, error, isLoading, mutate } = useAdminSettings();
  const { mutate: globalMutate } = useSWRConfig();
  const save = useAdminMutation();
  const toast = useToaster();
  const [form, setForm] = useState<Branding | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (data && !form) setForm(data.branding);
  }, [data]);

  const dirty = !!form && !!data && JSON.stringify(form) !== JSON.stringify(data.branding);
  const nameError = form && !form.instanceName.trim() ? 'The instance needs a name.' : undefined;
  const emailError =
    form && form.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail)
      ? 'Enter an email address, or leave it empty.'
      : undefined;

  const submit = async () => {
    if (!form || nameError || emailError) return;
    setSaving(true);
    setErr('');
    try {
      const next = await save<{ branding: Branding }>('/admin/console/settings/branding', 'PUT', {
        ...form,
        instanceName: form.instanceName.trim(),
        supportEmail: form.supportEmail.trim(),
      });
      await mutate({ ...data!, branding: next.branding }, { revalidate: false });
      setForm(next.branding);
      globalMutate(INSTANCE_SETTINGS_KEY);
      toast.show('Branding saved');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage
      title="Branding"
      description="How this instance introduces itself to people."
      action={
        <div className="flex gap-[8px]">
          <Button variant="ghost" disabled={!dirty || saving} onClick={() => data && setForm(data.branding)}>
            Discard
          </Button>
          <Button variant="primary" disabled={!dirty || !!nameError || !!emailError} loading={saving} loadingLabel="Saving…" onClick={submit}>
            Save changes
          </Button>
        </div>
      }
    >
      {error ? (
        <Banner tone="error" title="Couldn’t load branding.">
          {error.message}
        </Banner>
      ) : null}
      {err ? (
        <Banner tone="error" title="Couldn’t save branding.">
          {err}
        </Banner>
      ) : null}
      <Section
        title="Identity"
        description="Once saved, the name and support email are used as the sender name and reply-to address of every email Tadween sends. Until then emails use EMAIL_FROM_NAME."
      >
        {isLoading || !form ? (
          <Skeleton height={140} radius={10} />
        ) : (
          <div className="grid grid-cols-2 gap-[12px] mobile:grid-cols-1 py-[4px]">
            <Input
              label="Instance name"
              value={form.instanceName}
              error={nameError}
              onChange={(e) => setForm({ ...form, instanceName: e.target.value })}
            />
            <Input
              label="Support email"
              type="email"
              placeholder="support@example.com"
              value={form.supportEmail}
              error={emailError}
              hint="Replies to Tadween emails go here."
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
            />
          </div>
        )}
      </Section>
      <Section
        title="Defaults for new people"
        description="Saved now and offered to the app; applying them to new accounts automatically comes in a later phase."
      >
        {isLoading || !form ? (
          <Skeleton height={96} radius={10} />
        ) : (
          <>
            <Row
              label="Language"
              description="The interface language before someone picks their own."
              control={
                <Select
                  aria-label="Default language"
                  size="sm"
                  width={200}
                  value={form.defaultLanguage}
                  onChange={(v) => setForm({ ...form, defaultLanguage: v })}
                  options={LANGUAGES}
                />
              }
            />
            <Row
              label="Time zone"
              description="Used to show and schedule times."
              control={
                <Select
                  aria-label="Default time zone"
                  size="sm"
                  width={240}
                  value={form.defaultTimezone}
                  onChange={(v) => setForm({ ...form, defaultTimezone: v })}
                  options={ZONES}
                />
              }
            />
          </>
        )}
      </Section>
    </AdminPage>
  );
};
