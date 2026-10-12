'use client';

import React, {
  FC,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useSWR, { useSWRConfig } from 'swr';
import i18next from 'i18next';
import { useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { fallbackLng } from '@gitroom/react/translation/i18n.config';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { showMediaBox } from '@gitroom/frontend/components/media/media.component';
import { ChangeLanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import { useEmailNotifications } from '@gitroom/frontend/components/settings/email-notifications.component';
import DeleteAccountComponent from '@gitroom/frontend/components/settings/delete-account.component';
import {
  Avatar,
  Button,
  Input,
  SegmentedControl,
  Switch,
  TadweenScope,
  Textarea,
} from '@gitroom/frontend/components/tadween/ui';
import {
  SaveState,
  SettingsRow,
  SettingsSection,
  useSaveState,
} from '@gitroom/frontend/components/tadween/settings/settings.nav';

// Tadween settings, Account group: Profile, Preferences, Notifications and the
// Danger zone. Same endpoints and stored values as Postiz's settings panels
// (/user/personal, the `isUS` time format, /user/email-notifications,
// /user/delete-account), laid out as rows with an inline save state.

interface Personal {
  id: string;
  name?: string;
  bio?: string;
  picture?: { id: string; path: string } | null;
}

interface ProfileValues {
  fullname: string;
  bio: string;
  picture: { id: string; path: string } | null;
}

const usePersonal = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()) as Personal;
  }, []);
  return useSWR('/user/personal', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};

// How the person signs in (Postiz's AuthenticationComponent)
const useSignInMethod = () => {
  const t = useT();
  const user = useUser();
  const methods: Record<string, { label: string; showEmail: boolean }> = {
    LOCAL: {
      label: t('auth_method_local', 'Email and password'),
      showEmail: true,
    },
    GITHUB: { label: t('auth_method_github', 'GitHub'), showEmail: true },
    GOOGLE: { label: t('auth_method_google', 'Google'), showEmail: true },
    APPLE: { label: t('auth_method_apple', 'Apple'), showEmail: true },
    FARCASTER: {
      label: t('auth_method_farcaster', 'Farcaster'),
      showEmail: false,
    },
    WALLET: { label: t('auth_method_wallet', 'Wallet'), showEmail: false },
    GENERIC: {
      label: t('auth_method_generic', 'Single sign-on'),
      showEmail: false,
    },
  };
  return (user?.providerName && methods[user.providerName]) || null;
};

export const ProfileSettings: FC<{ getRef?: Ref<any> }> = ({ getRef }) => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const method = useSignInMethod();
  const { mutate } = useSWRConfig();
  const { data, mutate: reload } = usePersonal();
  const [status, save] = useSaveState();
  const resolver = useMemo(() => classValidatorResolver(UserDetailDto), []);
  const form = useForm<ProfileValues>({
    resolver,
    defaultValues: { fullname: '', bio: '', picture: null },
  });
  const picture = form.watch('picture');
  const fullname = form.watch('fullname');

  useEffect(() => {
    if (data) {
      form.reset({
        fullname: data.name || '',
        bio: data.bio || '',
        picture: data.picture || null,
      });
    }
  }, [data]);

  const openMedia = useCallback(() => {
    showMediaBox((values) => {
      form.setValue('picture', values, { shouldDirty: true });
    });
  }, []);

  const submit = useCallback(
    (values: ProfileValues) =>
      save(async () => {
        const response = await fetch('/user/personal', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          return false;
        }
        form.reset(values);
        reload();
        // the sidebar shows the name from /user/self
        mutate('/user/self');
      }),
    [save]
  );

  return (
    <TadweenScope className="tdw-set-page">
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        {!!getRef && (
          <button type="submit" className="hidden" ref={getRef}></button>
        )}
        <SettingsSection
          title={t('tdw_profile_title', 'Your profile')}
          description={t(
            'tdw_profile_desc',
            'Your name and photo show to your team on posts and comments.'
          )}
        >
          <div className="tdw-profile">
            <div className="tdw-profile-photo">
              <Avatar
                name={fullname || user?.email || ''}
                src={picture?.path}
                size={72}
              />
              <div className="tdw-profile-photo-actions">
                <Button size="sm" icon="upload" onClick={openMedia}>
                  {picture
                    ? t('tdw_profile_change_photo', 'Change photo')
                    : t('tdw_profile_add_photo', 'Add photo')}
                </Button>
                {picture ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      form.setValue('picture', null, { shouldDirty: true })
                    }
                  >
                    {t('remove', 'Remove')}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="tdw-profile-fields">
              <Input
                label={t('tdw_profile_name', 'Full name')}
                autoComplete="name"
                error={
                  form.formState.errors.fullname
                    ? t('tdw_profile_name_short', 'Use at least 3 characters.')
                    : undefined
                }
                {...form.register('fullname')}
              />
              <Textarea
                label={t('tdw_profile_bio', 'Bio')}
                hint={t(
                  'tdw_profile_bio_hint',
                  'A line about you, for your teammates.'
                )}
                rows={3}
                {...form.register('bio')}
              />
            </div>
          </div>
          <div className="tdw-set-foot">
            <SaveState status={status} />
            <Button
              type="submit"
              variant="primary"
              loading={status === 'saving'}
              disabled={!form.formState.isDirty}
            >
              {t('tdw_save_changes', 'Save changes')}
            </Button>
          </div>
        </SettingsSection>
      </form>
      <SettingsSection title={t('tdw_profile_signin', 'Sign-in')}>
        {method?.showEmail !== false ? (
          <SettingsRow
            label={t('tdw_profile_email', 'Email')}
            description={t(
              'tdw_profile_email_desc',
              'Where Tadween sends invitations and notices.'
            )}
          >
            <span className="tdw-set-value tdw-set-ltr">{user?.email}</span>
          </SettingsRow>
        ) : null}
        {method ? (
          <SettingsRow
            label={t('authentication', 'Authentication')}
            description={t(
              'tdw_profile_method_desc',
              'How you sign in to Tadween.'
            )}
          >
            <span className="tdw-set-value">{method.label}</span>
          </SettingsRow>
        ) : null}
      </SettingsSection>
    </TadweenScope>
  );
};

// Native name of a language ("العربية", "English")
const languageName = (code: string) => {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) || code;
  } catch (e) {
    return code;
  }
};

export const PreferencesSettings: FC = () => {
  const t = useT();
  const modal = useModals();
  const [timeStatus, saveTime] = useSaveState();
  // read after mount: the time format lives in localStorage
  const [timeFormat, setTimeFormat] = useState<'US' | 'GLOBAL'>();
  useEffect(() => {
    setTimeFormat(isUSCitizen() ? 'US' : 'GLOBAL');
  }, []);
  const language = i18next.resolvedLanguage || fallbackLng;

  const changeLanguage = useCallback(() => {
    modal.openModal({
      title: t('change_language', 'Change Language'),
      withCloseButton: true,
      children: <ChangeLanguageComponent />,
    });
  }, [t]);

  const changeTime = useCallback(
    (value: 'US' | 'GLOBAL') => {
      setTimeFormat(value);
      saveTime(async () => {
        localStorage.setItem('isUS', value);
      });
    },
    [saveTime]
  );

  return (
    <TadweenScope className="tdw-set-page">
      <SettingsSection
        title={t('tdw_pref_language_time', 'Language and time')}
        description={t(
          'tdw_pref_language_time_desc',
          'Saved in this browser, for you only.'
        )}
      >
        <SettingsRow
          label={t('tdw_pref_language', 'Language')}
          description={t(
            'tdw_pref_language_desc',
            'Arabic switches the whole app to right-to-left.'
          )}
        >
          <span className="tdw-set-value">{languageName(language)}</span>
          <Button size="sm" onClick={changeLanguage}>
            {t('tdw_change', 'Change')}
          </Button>
        </SettingsRow>
        <SettingsRow
          label={t('tdw_pref_time_format', 'Time format')}
          description={t(
            'tdw_pref_time_format_desc',
            'How times show on the calendar and in the composer.'
          )}
          status={<SaveState status={timeStatus} />}
        >
          {timeFormat ? (
            <SegmentedControl
              size="sm"
              label={t('tdw_pref_time_format', 'Time format')}
              value={timeFormat}
              onChange={changeTime}
              options={[
                { value: 'US', label: t('tdw_pref_12h', '12-hour') },
                { value: 'GLOBAL', label: t('tdw_pref_24h', '24-hour') },
              ]}
            />
          ) : null}
        </SettingsRow>
      </SettingsSection>
    </TadweenScope>
  );
};

type EmailKey = 'sendSuccessEmails' | 'sendFailureEmails' | 'sendStreakEmails';
type EmailSettings = Record<EmailKey, boolean>;

const NotificationRow: FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => Promise<boolean>;
}> = ({ label, description, checked, onChange }) => {
  const [status, save] = useSaveState();
  return (
    <SettingsRow
      label={label}
      description={description}
      status={<SaveState status={status} />}
    >
      <Switch
        aria-label={label}
        checked={checked}
        onChange={(value) => save(() => onChange(value))}
      />
    </SettingsRow>
  );
};

export const NotificationSettings: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const { data, isLoading, mutate } = useEmailNotifications();
  const [local, setLocal] = useState<EmailSettings>({
    sendSuccessEmails: true,
    sendFailureEmails: true,
    sendStreakEmails: true,
  });
  // the latest values, so two quick toggles don't overwrite each other
  const latest = useRef(local);
  latest.current = local;

  useEffect(() => {
    if (data) {
      setLocal(data);
    }
  }, [data]);

  const update = useCallback(
    (key: EmailKey) => async (value: boolean) => {
      const next = { ...latest.current, [key]: value };
      setLocal(next);
      const response = await fetch('/user/email-notifications', {
        method: 'POST',
        body: JSON.stringify(next),
      });
      if (!response.ok) {
        setLocal({ ...latest.current, [key]: !value });
        return false;
      }
      mutate(next, { revalidate: false });
      return true;
    },
    []
  );

  const rows: { key: EmailKey; label: string; description: string }[] = [
    {
      key: 'sendSuccessEmails',
      label: t('success_emails', 'Success Emails'),
      description: t(
        'success_emails_description',
        'Receive email notifications when posts are published successfully'
      ),
    },
    {
      key: 'sendFailureEmails',
      label: t('failure_emails', 'Failure Emails'),
      description: t(
        'failure_emails_description',
        'Receive email notifications when posts fail to publish'
      ),
    },
    {
      key: 'sendStreakEmails',
      label: t('streak_emails', 'Streak Reminder Emails'),
      description: t(
        'streak_emails_description',
        'Receive email reminders when your posting streak is about to end'
      ),
    },
  ];

  return (
    <TadweenScope className="tdw-set-page">
      <SettingsSection
        title={t('email_notifications', 'Email Notifications')}
        description={t(
          'tdw_notif_desc',
          'Emails go to your sign-in address. In-app notifications stay on.'
        )}
      >
        {isLoading ? (
          <div className="tdw-set-loading">{t('loading', 'Loading...')}</div>
        ) : (
          rows.map((row) => (
            <NotificationRow
              key={row.key}
              label={row.label}
              description={row.description}
              checked={local[row.key]}
              onChange={update(row.key)}
            />
          ))
        )}
      </SettingsSection>
    </TadweenScope>
  );
};

export const DangerSettings: FC = () => {
  const t = useT();
  return (
    <TadweenScope className="tdw-set-page">
      <SettingsSection
        className="is-danger"
        title={t('delete_account', 'Delete Account')}
        description={t(
          'tdw_danger_desc',
          'This removes your account, its workspaces, channels and posts for good.'
        )}
      >
        <SettingsRow
          tone="danger"
          label={t('delete_your_account', 'Delete your account')}
          description={t(
            'tdw_danger_row_desc',
            "You will be asked to confirm. This can't be undone."
          )}
        >
          <div className="tdw-danger-btn">
            <DeleteAccountComponent isLink={true} />
          </div>
        </SettingsRow>
      </SettingsSection>
    </TadweenScope>
  );
};
