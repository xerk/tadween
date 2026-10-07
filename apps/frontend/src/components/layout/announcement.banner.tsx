'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

type AnnouncementColor = 'INFO' | 'WARNING' | 'ERROR';

interface Announcement {
  id: string;
  title: string;
  description: string;
  color: AnnouncementColor;
  createdAt: string;
}

// Tadween: banners keep a neutral surface; only the icon carries the tone.
const tones: Record<AnnouncementColor, 'info' | 'warning' | 'error'> = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
};

const useAnnouncements = () => {
  const fetch = useFetch();
  return useSWR<Announcement[]>('/announcements', async () => {
    return (await fetch('/announcements')).json();
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
};

const AnnouncementDetailModal: FC<{
  announcement: Announcement;
  close: () => void;
  isAdmin: boolean;
  onDelete: (id: string) => Promise<void>;
}> = ({ announcement, close, isAdmin, onDelete }) => {
  const t = useT();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'delete_announcement_confirm',
          'Are you sure you want to delete this announcement?'
        ),
        t('yes_delete', 'Yes, delete'),
        t('confirm_delete', 'Confirm Delete'),
        t('no_cancel', 'No, cancel')
      ))
    ) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete(announcement.id);
      close();
    } finally {
      setDeleting(false);
    }
  }, [announcement.id, onDelete]);

  return (
    <div className="flex flex-col gap-[16px] min-w-[500px]">
      <div className="text-newTextColor/60 text-[13px]">
        {new Date(announcement.createdAt).toLocaleDateString()}
      </div>
      <div className="whitespace-pre-wrap text-newTextColor">
        {announcement.description}
      </div>
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            onClick={handleDelete}
            loading={deleting}
            className="!bg-red-700 rounded-[4px]"
          >
            {t('delete_announcement', 'Delete Announcement')}
          </Button>
        </div>
      )}
    </div>
  );
};

export const AnnouncementBanner: FC = () => {
  const { data: announcements, mutate } = useAnnouncements();
  const user = useUser();
  const fetch = useFetch();
  const { openModal } = useModals();
  const t = useT();

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/announcements/${id}`, {
        method: 'DELETE',
      });
      await mutate();
    },
    [fetch, mutate]
  );

  const handleClick = useCallback(
    (announcement: Announcement) => () => {
      openModal({
        title: announcement.title,
        children: (close) => (
          <AnnouncementDetailModal
            announcement={announcement}
            close={close}
            isAdmin={!!user?.isSuperAdmin}
            onDelete={handleDelete}
          />
        ),
      });
    },
    [user?.isSuperAdmin, handleDelete]
  );

  if (!announcements?.length) return null;

  const latest = announcements[0];
  const tone = tones[latest.color] || 'info';

  return (
    <button
      type="button"
      className="tdw-banner"
      data-tone={tone}
      onClick={handleClick(latest)}
    >
      <svg className="tdw-banner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d={tone === 'info' ? 'M12 11v5.5M12 7.6h.01' : 'M12 7v5.5M12 16.4h.01'} stroke="var(--tdw-card, #fff)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="tdw-banner-text">{latest.title}</span>
      {announcements.length > 1 && (
        <span className="tdw-banner-meta">
          (+{announcements.length - 1} {t('more', 'more')})
        </span>
      )}
      <style>{`#left-menu {padding-top: ${user?.isSuperAdmin ? '100px !important;' : '60px !important;'}`}</style>
    </button>
  );
};
