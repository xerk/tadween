'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useFeatures } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { useShortlinkPreference } from '@gitroom/frontend/components/settings/shortlink-preference.component';
import { AddOrEditWebhook } from '@gitroom/frontend/components/webhooks/webhooks';
import { AddOrEditWebhook as AddOrEditAutopost } from '@gitroom/frontend/components/autopost/autopost';
import { AddOrRemoveSignature } from '@gitroom/frontend/components/settings/signatures.component';
import { SaveSetModal } from '@gitroom/frontend/components/sets/sets';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import {
  Button,
  EmptyState,
  IconButton,
  IconName,
  Pill,
  Select,
  Skeleton,
  Switch,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import {
  SaveState,
  SettingsListRow,
  SettingsRow,
  SettingsSection,
  useSaveState,
} from '@gitroom/frontend/components/tadween/settings/settings.nav';

// Tadween settings, Workspace group: General (workspace, short links) and the
// saved lists — Signatures, Sets, Auto post, Webhooks. Each list reads the same
// SWR key and calls the same endpoints as Postiz's panel (components/webhooks,
// autopost, sets, settings/signatures) and opens Postiz's own editor, so what
// is saved and how is unchanged; only the list around it is new.

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
};

// Same SWR key as OrganizationSelector and the sidebar, so they share a request.
const useOrganizations = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch('/user/organizations')).json();
  }, []);
  return useSWR('organizations', load, swrOptions);
};

export const GeneralSettings: FC = () => {
  const t = useT();
  const user = useUser();
  const fetch = useFetch();
  const isOn = useFeatures();
  const { data: organizations } = useOrganizations();
  const { data: shortlink, isLoading, mutate } = useShortlinkPreference();
  const [status, save] = useSaveState();
  const [value, setValue] = useState<'ASK' | 'YES' | 'NO'>('ASK');
  useEffect(() => {
    if (shortlink?.shortlink) {
      setValue(shortlink.shortlink);
    }
  }, [shortlink]);

  const workspace = useMemo(
    () => organizations?.find?.((org: any) => org?.id === user?.orgId),
    [organizations, user?.orgId]
  );
  const role =
    user?.role === 'SUPERADMIN'
      ? t('tdw_role_owner', 'Owner')
      : user?.role === 'ADMIN'
      ? t('tdw_role_admin', 'Admin')
      : t('tdw_role_member', 'Member');

  const changeShortlink = useCallback(
    (next: 'ASK' | 'YES' | 'NO') => {
      const previous = value;
      setValue(next);
      save(async () => {
        const response = await fetch('/settings/shortlink', {
          method: 'POST',
          body: JSON.stringify({ shortlink: next }),
        });
        if (!response.ok) {
          setValue(previous);
          return false;
        }
        mutate({ shortlink: next }, { revalidate: false });
      });
    },
    [value, save]
  );

  return (
    <TadweenScope className="tdw-set-page">
      <SettingsSection title={t('tdw_general_workspace', 'This workspace')}>
        <SettingsRow
          label={t('tdw_general_name', 'Name')}
          description={t(
            'tdw_general_name_desc',
            'Switch workspaces from the top of the sidebar.'
          )}
        >
          {workspace ? (
            <span className="tdw-set-value">{workspace.name}</span>
          ) : (
            <Skeleton width={120} />
          )}
        </SettingsRow>
        <SettingsRow
          label={t('tdw_general_role', 'Your role')}
          description={t(
            'tdw_general_role_desc',
            'Admins and owners manage the team, billing and settings.'
          )}
        >
          <Pill tone={user?.role === 'USER' ? 'neutral' : 'brand'}>{role}</Pill>
        </SettingsRow>
      </SettingsSection>
      {isOn('shortLinks') ? (
        <SettingsSection
          title={t('shortlink_settings', 'Shortlink Settings')}
          description={t(
            'tdw_shortlink_desc',
            'Applies to everyone in this workspace.'
          )}
        >
          <SettingsRow
            label={t('shortlink_preference', 'Shortlink Preference')}
            description={t(
              'shortlink_preference_description',
              'Control how URLs in your posts are handled. Shortlinks provide click statistics.'
            )}
            status={<SaveState status={status} />}
          >
            {isLoading ? (
              <Skeleton width={200} height={36} />
            ) : (
              <Select
                width={220}
                aria-label={t('shortlink_preference', 'Shortlink Preference')}
                value={value}
                onChange={changeShortlink}
                options={[
                  { value: 'ASK', label: t('shortlink_ask', 'Ask every time') },
                  {
                    value: 'YES',
                    label: t('shortlink_yes', 'Always shortlink'),
                  },
                  { value: 'NO', label: t('shortlink_no', 'Never shortlink') },
                ]}
              />
            )}
          </SettingsRow>
        </SettingsSection>
      ) : null}
    </TadweenScope>
  );
};

// One saved list: a card with the count and Add in its header, the rows, a
// loading skeleton, and an empty state whose button is the next step.
const SettingsList: FC<{
  title: string;
  description: string;
  count?: string;
  loading: boolean;
  empty: boolean;
  emptyIcon: IconName;
  emptyTitle: string;
  emptyBody: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}> = ({
  title,
  description,
  count,
  loading,
  empty,
  emptyIcon,
  emptyTitle,
  emptyBody,
  addLabel,
  onAdd,
  children,
}) => (
  <TadweenScope className="tdw-set-page">
    <SettingsSection
      title={count ? `${title} · ${count}` : title}
      description={description}
      action={
        !loading && !empty ? (
          <Button variant="primary" icon="plus" onClick={onAdd}>
            {addLabel}
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div className="tdw-set-skeleton">
          <Skeleton height={44} />
          <Skeleton height={44} />
        </div>
      ) : empty ? (
        <EmptyState
          size="sm"
          icon={emptyIcon}
          title={emptyTitle}
          body={emptyBody}
          action={
            <Button variant="primary" icon="plus" onClick={onAdd}>
              {addLabel}
            </Button>
          }
        />
      ) : (
        <ul className="tdw-set-list">{children}</ul>
      )}
    </SettingsSection>
  </TadweenScope>
);

const RowActions: FC<{
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ name, onEdit, onDelete }) => {
  const t = useT();
  return (
    <>
      <IconButton
        icon="pencil"
        size="sm"
        label={`${t('edit', 'Edit')} ${name}`}
        onClick={onEdit}
      />
      <IconButton
        icon="trash-2"
        size="sm"
        className="tdw-danger-icon"
        label={`${t('delete', 'Delete')} ${name}`}
        onClick={onDelete}
      />
    </>
  );
};

// ── Webhooks ────────────────────────────────────────────────────────────────
const useWebhooks = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/webhooks')).json();
  }, []);
  return useSWR('webhooks', load);
};

export const WebhooksSettings: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const modal = useModals();
  const toaster = useToaster();
  const { data, mutate, isLoading } = useWebhooks();

  const open = useCallback(
    (item?: any) => () => {
      modal.openModal({
        title: item
          ? t('update_webhook', 'Update webhook')
          : t('add_webhook', 'Add webhook'),
        withCloseButton: true,
        children: <AddOrEditWebhook data={item} reload={mutate} />,
      });
    },
    [t, mutate]
  );
  const remove = useCallback(
    (item: any) => async () => {
      if (
        await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete',
            `Are you sure you want to delete ${item.name}?`,
            { name: item.name }
          )
        )
      ) {
        await fetch(`/webhooks/${item.id}`, { method: 'DELETE' });
        mutate();
        toaster.show(
          t('webhook_deleted_successfully', 'Webhook deleted successfully'),
          'success'
        );
      }
    },
    [t, mutate]
  );

  const list: any[] = Array.isArray(data) ? data : [];
  return (
    <SettingsList
      title={t('webhooks', 'Webhooks')}
      description={t(
        'tdw_webhooks_lead',
        'Tadween calls your URL with the post details each time a post is published.'
      )}
      count={
        // plans without a real cap store a huge number; show the count alone
        (user?.tier?.webhooks ?? 0) >= 1000
          ? `${list.length}`
          : `${list.length}/${user?.tier?.webhooks ?? 0}`
      }
      loading={isLoading}
      empty={!list.length}
      emptyIcon="webhook"
      emptyTitle={t('tdw_no_webhooks', 'No webhooks yet')}
      emptyBody={t(
        'tdw_no_webhooks_body',
        'Add one to get an HTTP call whenever a post is published.'
      )}
      addLabel={t('add_a_webhook', 'Add a webhook')}
      onAdd={open()}
    >
      {list.map((item) => (
        <SettingsListRow
          key={item.id}
          icon="webhook"
          title={item.name}
          openLabel={`${t('edit', 'Edit')} ${item.name}`}
          onOpen={open(item)}
          meta={
            <>
              <span className="tdw-set-li-url tdw-set-ltr">
                {item.url}
              </span>
              <span>
                {item.integrations?.length
                  ? t('tdw_n_channels', 'Channels: {{count}}', {
                      count: item.integrations.length,
                    })
                  : t('all_integrations', 'All integrations')}
              </span>
            </>
          }
          actions={
            <RowActions
              name={item.name}
              onEdit={open(item)}
              onDelete={remove(item)}
            />
          }
        />
      ))}
    </SettingsList>
  );
};

// ── Auto post ───────────────────────────────────────────────────────────────
const useAutoposts = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/autopost')).json();
  }, []);
  return useSWR('autopost', load);
};

const AutopostActive: FC<{
  item: any;
  onChange: (active: boolean) => Promise<boolean>;
}> = ({ item, onChange }) => {
  const t = useT();
  const [status, save] = useSaveState();
  return (
    <span className="tdw-set-li-toggle">
      <SaveState status={status} />
      <Switch
        aria-label={`${t('active', 'Active')}: ${item.title}`}
        checked={!!item.active}
        onChange={(active) => save(() => onChange(active))}
      />
    </span>
  );
};

export const AutopostSettings: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const { data, mutate, isLoading } = useAutoposts();

  const open = useCallback(
    (item?: any) => () => {
      modal.openModal({
        title: item
          ? t('edit_autopost', 'Edit Autopost')
          : t('add_autopost_title', 'Add Autopost'),
        withCloseButton: true,
        children: <AddOrEditAutopost data={item} reload={mutate} />,
      });
    },
    [t, mutate]
  );
  const remove = useCallback(
    (item: any) => async () => {
      if (
        await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete',
            `Are you sure you want to delete ${item.title}?`,
            { name: item.title }
          )
        )
      ) {
        await fetch(`/autopost/${item.id}`, { method: 'DELETE' });
        mutate();
        toaster.show(t('tdw_autopost_deleted', 'Feed deleted'), 'success');
      }
    },
    [t, mutate]
  );
  const setActive = useCallback(
    (item: any) => async (active: boolean) => {
      const response = await fetch(`/autopost/${item.id}/active`, {
        body: JSON.stringify({ active }),
        method: 'POST',
      });
      await mutate();
      return response.ok;
    },
    [mutate]
  );

  const list: any[] = Array.isArray(data) ? data : [];
  return (
    <SettingsList
      title={t('tdw_autopost_feeds', 'Feeds')}
      description={t(
        'autopost_can_automatically_posts_your_rss_new_items_to_social_media',
        'Autopost can automatically posts your RSS new items to social media'
      )}
      loading={isLoading}
      empty={!list.length}
      emptyIcon="rss"
      emptyTitle={t('tdw_no_autopost', 'No feeds yet')}
      emptyBody={t(
        'tdw_no_autopost_body',
        'Add an RSS feed and new items become posts or drafts on their own.'
      )}
      addLabel={t('add_an_autopost', 'Add an autopost')}
      onAdd={open()}
    >
      {list.map((item) => (
        <SettingsListRow
          key={item.id}
          icon="rss"
          title={item.title}
          badges={
            item.active ? null : (
              <Pill>{t('tdw_paused', 'Paused')}</Pill>
            )
          }
          openLabel={`${t('edit', 'Edit')} ${item.title}`}
          onOpen={open(item)}
          meta={
            <span className="tdw-set-li-url tdw-set-ltr">
              {item.url}
            </span>
          }
          actions={
            <>
              <AutopostActive item={item} onChange={setActive(item)} />
              <RowActions
                name={item.title}
                onEdit={open(item)}
                onDelete={remove(item)}
              />
            </>
          }
        />
      ))}
    </SettingsList>
  );
};

// ── Signatures ──────────────────────────────────────────────────────────────
const useSignatures = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/signatures')).json();
  }, []);
  return useSWR('signatures', load);
};

// signatures are stored as editor HTML; the list shows them as one line of text
const plainText = (html: string) =>
  (html || '')
    .replace(/<br\s*\/?>|<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const SignaturesSettings: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const { data, mutate, isLoading } = useSignatures();

  const open = useCallback(
    (item?: any) => () => {
      modal.openModal({
        title: item
          ? t('tdw_edit_signature', 'Edit signature')
          : t('tdw_add_signature', 'Add signature'),
        withCloseButton: true,
        children: <AddOrRemoveSignature data={item} reload={mutate} />,
      });
    },
    [t, mutate]
  );
  const remove = useCallback(
    (item: any) => async () => {
      if (
        await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete',
            `Are you sure you want to delete?`,
            { name: plainText(item.content).slice(0, 15) + '...' }
          )
        )
      ) {
        await fetch(`/signatures/${item.id}`, { method: 'DELETE' });
        mutate();
        toaster.show(t('tdw_signature_deleted', 'Signature deleted'), 'success');
      }
    },
    [t, mutate]
  );

  const list: any[] = Array.isArray(data) ? data : [];
  return (
    <SettingsList
      title={t('signatures', 'Signatures')}
      description={t(
        'you_can_add_signatures_to_your_account_to_be_used_in_your_posts',
        'You can add signatures to your account to be used in your posts.'
      )}
      loading={isLoading}
      empty={!list.length}
      emptyIcon="signature"
      emptyTitle={t('tdw_no_signatures', 'No signatures yet')}
      emptyBody={t(
        'tdw_no_signatures_body',
        'Save a sign-off once and add it to any post from the composer.'
      )}
      addLabel={t('add_a_signature', 'Add a signature')}
      onAdd={open()}
    >
      {list.map((item) => {
        const text = plainText(item.content);
        return (
          <SettingsListRow
            key={item.id}
            icon="signature"
            title={text || '—'}
            badges={
              item.autoAdd ? (
                <Pill tone="brand" icon="check">
                  {t('tdw_signature_auto', 'Added to new posts')}
                </Pill>
              ) : null
            }
            openLabel={t('edit', 'Edit')}
            onOpen={open(item)}
            actions={
              <RowActions
                name={text.slice(0, 24)}
                onEdit={open(item)}
                onDelete={remove(item)}
              />
            }
          />
        );
      })}
    </SettingsList>
  );
};

// ── Sets ────────────────────────────────────────────────────────────────────
const useSetChannels = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()).integrations;
  }, []);
  return useSWR('/integrations/list', load, {
    ...swrOptions,
    revalidateOnMount: true,
    fallbackData: [],
  });
};

const useSets = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/sets')).json();
  }, []);
  return useSWR('sets', load, { ...swrOptions, revalidateOnMount: true });
};

export const SetsSettings: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const { data: integrations } = useSetChannels();
  const { data, mutate, isLoading } = useSets();

  // Same flow as Postiz's Sets: the composer opens, "Save as set" asks for a name
  const open = useCallback(
    (params?: { id?: string; name?: string; content?: string }) => () => {
      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
        classNames: {
          modal: 'w-[100%] max-w-[1400px] text-textColor',
        },
        children: (
          <AddEditModal
            allIntegrations={integrations.map((p: any) => ({
              ...p,
            }))}
            {...(params?.id ? { set: JSON.parse(params.content!) } : {})}
            addEditSets={(post) => {
              modal.openModal({
                title: 'Save as Set',
                children: (
                  <SaveSetModal
                    initialValue={params?.name || ''}
                    postData={post}
                    onSave={async (name: string) => {
                      try {
                        await fetch('/sets', {
                          method: 'POST',
                          body: JSON.stringify({
                            ...(params?.id ? { id: params.id } : {}),
                            name,
                            content: JSON.stringify(post),
                          }),
                        });
                        modal.closeAll();
                        mutate();
                        toaster.show('Set saved successfully', 'success');
                      } catch (error) {
                        toaster.show('Failed to save set', 'warning');
                      }
                    }}
                    onCancel={() => modal.closeAll()}
                  />
                ),
              });
            }}
            reopenModal={() => {}}
            mutate={() => {}}
            integrations={integrations}
            date={newDayjs()}
          />
        ),
        title: ``,
      });
    },
    [integrations, mutate]
  );
  const remove = useCallback(
    (item: any) => async () => {
      if (
        await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete',
            `Are you sure you want to delete ${item.name}?`,
            { name: item.name }
          )
        )
      ) {
        await fetch(`/sets/${item.id}`, { method: 'DELETE' });
        mutate();
        toaster.show(t('tdw_set_deleted', 'Set deleted'), 'success');
      }
    },
    [t, mutate]
  );

  const list: any[] = Array.isArray(data) ? data : [];
  return (
    <SettingsList
      title={t('sets', 'Sets')}
      description={t(
        'tdw_sets_lead',
        'Channels and a starting text you pick in one click from the composer.'
      )}
      loading={isLoading}
      empty={!list.length}
      emptyIcon="layers"
      emptyTitle={t('tdw_no_sets', 'No sets yet')}
      emptyBody={t(
        'tdw_no_sets_body',
        'Make one in the composer: pick channels, write a start, then save it as a set.'
      )}
      addLabel={t('tdw_add_set', 'Add a set')}
      onAdd={open()}
    >
      {list.map((item) => (
        <SettingsListRow
          key={item.id}
          icon="layers"
          title={item.name}
          openLabel={`${t('edit', 'Edit')} ${item.name}`}
          onOpen={open(item)}
          actions={
            <RowActions
              name={item.name}
              onEdit={open(item)}
              onDelete={remove(item)}
            />
          }
        />
      ))}
    </SettingsList>
  );
};
