'use client';

// Tadween: a saved list of a settings page (webhooks, feeds, signatures, sets)
// and its row actions; used by workspace.settings.tsx and signatures.settings.tsx
import React, { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Button,
  EmptyState,
  IconButton,
  IconName,
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import { SettingsSection } from '@gitroom/frontend/components/tadween/settings/settings.nav';

// One saved list: a card with the count and Add in its header, the rows, a
// loading skeleton, and an empty state whose button is the next step.
export const SettingsList: FC<{
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

export const RowActions: FC<{
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
