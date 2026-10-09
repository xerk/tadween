'use client';

// ActionBar: the social row under a post. Comment and Share work today;
// Like and Repost are the design for the future network and do nothing yet
// (disabled, "Coming soon" tooltip, no counts).
import { FC, useCallback } from 'react';
import copy from 'copy-to-clipboard';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { usePreviewComments } from '@gitroom/frontend/components/preview/preview.comments.context';
import { Icon, IconName, Tooltip } from '@gitroom/frontend/components/tadween/ui';
import { focusComments } from '@gitroom/frontend/components/tadween/post-page/comment.thread';

const Soon: FC<{ icon: IconName; label: string }> = ({ icon, label }) => {
  const t = useT();
  return (
    <Tooltip label={t('tdw_pp_coming_soon', 'Coming soon')}>
      <button
        type="button"
        className="tdw-pp-action is-soon"
        aria-disabled="true"
        aria-label={`${label} (${t('tdw_pp_coming_soon', 'Coming soon')})`}
        onClick={(e) => e.preventDefault()}
      >
        <Icon name={icon} size={18} />
        <span className="tdw-pp-action-label">{label}</span>
      </button>
    </Tooltip>
  );
};

export const ActionBar: FC<{ previewId: string }> = ({ previewId }) => {
  const t = useT();
  const toast = useToaster();
  const { comments } = usePreviewComments();

  // The link without ?share=true, same as "Share with a client".
  const share = useCallback(async () => {
    const url = `${window.location.origin}/p/${previewId}`;
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (touch && typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, title: document.title });
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') {
          return;
        }
      }
    }
    copy(url);
    toast.show(t('link_copied_to_clipboard', 'Link copied to clipboard'), 'success');
  }, [previewId]);

  return (
    <div
      className="tdw-pp-actions"
      role="group"
      aria-label={t('tdw_pp_post_actions', 'Post actions')}
    >
      <Soon icon="thumbs-up" label={t('tdw_pp_like', 'Like')} />
      <button type="button" className="tdw-pp-action" onClick={focusComments}>
        <Icon name="message-circle" size={18} />
        <span className="tdw-pp-action-label">{t('comment', 'Comment')}</span>
        {comments.length > 0 && (
          <span className="tdw-pp-action-count">{comments.length}</span>
        )}
      </button>
      <Soon icon="repeat-2" label={t('tdw_pp_repost', 'Repost')} />
      <button type="button" className="tdw-pp-action" onClick={share}>
        <Icon name="send" size={18} className="tdw-pp-flip" />
        <span className="tdw-pp-action-label">{t('tdw_pp_share', 'Share')}</span>
      </button>
    </div>
  );
};
