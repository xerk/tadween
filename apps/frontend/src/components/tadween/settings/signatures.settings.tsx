'use client';

// Tadween: Settings → Signatures, and the composer's signature picker
// (components/signature.tsx, with `onUse`)
import React, { FC, useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { AddOrRemoveSignature } from '@gitroom/frontend/components/settings/signatures.component';
import { Button, Pill } from '@gitroom/frontend/components/tadween/ui';
import { SettingsListRow } from '@gitroom/frontend/components/tadween/settings/settings.nav';
import {
  RowActions,
  SettingsList,
} from '@gitroom/frontend/components/tadween/settings/settings.list';

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

// `onUse`: the composer's signature picker (signature.tsx), where a row adds
// that signature to the post
export const SignaturesSettings: FC<{ onUse?: (content: string) => void }> = ({
  onUse,
}) => {
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
      // the composer's picker sits under its own dialog title
      description={
        onUse
          ? ''
          : t(
              'you_can_add_signatures_to_your_account_to_be_used_in_your_posts',
              'You can add signatures to your account to be used in your posts.'
            )
      }
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
            openLabel={
              onUse ? t('use_signature', 'Use Signature') : t('edit', 'Edit')
            }
            onOpen={onUse ? () => onUse(item.content) : open(item)}
            actions={
              <>
                {onUse ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onUse(item.content)}
                  >
                    {t('tdw_use', 'Use')}
                  </Button>
                ) : null}
                <RowActions
                  name={text.slice(0, 24)}
                  onEdit={open(item)}
                  onDelete={remove(item)}
                />
              </>
            }
          />
        );
      })}
    </SettingsList>
  );
};
