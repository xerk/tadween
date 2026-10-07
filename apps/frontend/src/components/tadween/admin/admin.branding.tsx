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
  { value: 'he', label: 'עברית', description: 'Hebrew' },
  { value: 'zh', label: '中文', description: 'Chinese' },
  { value: 'ja', label: '日本語', description: 'Japanese' },
  { value: 'ko', label: '한국어', description: 'Korean' },
  { value: 'vi', label: 'Tiếng Việt', description: 'Vietnamese' },
  { value: 'bn', label: 'বাংলা', description: 'Bengali' },
  { value: 'ka_ge', label: 'ქართული', description: 'Georgian' },
];

const ZONES = [
  { value: '', label: 'Each person’s browser', description: 'The default' },
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

type LinkKey =
  | 'websiteUrl'
  | 'termsUrl'
  | 'privacyUrl'
  | 'docsUrl'
  | 'supportUrl'
  | 'tutorialVideoUrl';

const LINKS: { key: LinkKey; label: string; placeholder: string; hint: string }[] = [
  { key: 'websiteUrl', label: 'Website', placeholder: 'https://example.com', hint: 'Your public site.' },
  { key: 'supportUrl', label: 'Help center', placeholder: 'https://example.com/help', hint: 'Where people get help.' },
  { key: 'termsUrl', label: 'Terms of service', placeholder: 'https://example.com/terms', hint: 'Linked from sign-up.' },
  { key: 'privacyUrl', label: 'Privacy policy', placeholder: 'https://example.com/privacy', hint: 'Linked from sign-up.' },
  { key: 'docsUrl', label: 'Developer docs', placeholder: 'https://docs.example.com', hint: 'Base of the API, MCP and CLI docs (/public-api, /mcp, /cli).' },
  { key: 'tutorialVideoUrl', label: 'Tutorial video', placeholder: 'https://www.youtube.com/embed/…', hint: 'An embeddable video URL, shown in onboarding.' },
];

const isUrl = (value: string) => /^https?:\/\/[^\s]+$/i.test(value.trim());

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

  const linkErrors = LINKS.reduce(
    (all, { key }) =>
      form && form[key]?.trim() && !isUrl(form[key])
        ? { ...all, [key]: 'Enter a full http(s) URL, or leave it empty.' }
        : all,
    {} as Partial<Record<LinkKey, string>>
  );
  const hasLinkError = Object.keys(linkErrors).length > 0;

  const submit = async () => {
    if (!form || nameError || emailError || hasLinkError) return;
    setSaving(true);
    setErr('');
    try {
      const next = await save<{ branding: Branding }>('/admin/console/settings/branding', 'PUT', {
        ...form,
        instanceName: form.instanceName.trim(),
        supportEmail: form.supportEmail.trim(),
        ...LINKS.reduce(
          (all, { key }) => ({ ...all, [key]: (form[key] || '').trim() }),
          {} as Record<LinkKey, string>
        ),
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
          <Button variant="primary" disabled={!dirty || !!nameError || !!emailError || hasLinkError} loading={saving} loadingLabel="Saving…" onClick={submit}>
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
        title="Links"
        description="Shown across the app (sign-up, developer pages, onboarding). Leave a link empty to hide it; Tadween never falls back to another product's pages."
      >
        {isLoading || !form ? (
          <Skeleton height={200} radius={10} />
        ) : (
          <div className="grid grid-cols-2 gap-[12px] mobile:grid-cols-1 py-[4px]">
            {LINKS.map(({ key, label, placeholder, hint }) => (
              <Input
                key={key}
                label={label}
                type="url"
                placeholder={placeholder}
                value={form[key] || ''}
                error={linkErrors[key]}
                hint={hint}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            ))}
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
