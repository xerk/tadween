'use client';

// The post page while it loads, when the post isn't there, and when it can't
// be loaded. Same frame as the page, so nothing jumps when the post arrives.
import { FC, ReactNode } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Button,
  EmptyState,
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import { PostTopBar } from '@gitroom/frontend/components/tadween/post-page/post.page';

const Frame: FC<{ children: ReactNode }> = ({ children }) => (
  <TadweenScope className="tdw-pp">
    <PostTopBar share={false} />
    {children}
  </TadweenScope>
);

export const PostPageSkeleton: FC = () => {
  const t = useT();
  return (
    <Frame>
      <main
        className="tdw-pp-grid"
        aria-busy="true"
        aria-label={t('loading', 'Loading')}
      >
        <div className="tdw-pp-hero">
          <div className="tdw-pp-card">
            <div className="tdw-pp-author">
              <Skeleton width={48} height={48} radius={24} />
              <div className="tdw-pp-author-id">
                <Skeleton width={160} height={14} />
                <Skeleton width={110} height={12} />
              </div>
            </div>
            <div className="tdw-pp-skeleton-text">
              <Skeleton height={14} />
              <Skeleton height={14} />
              <Skeleton height={14} width="80%" />
              <Skeleton height={14} width="55%" />
            </div>
            <Skeleton height={320} radius={16} />
          </div>
        </div>
        <aside className="tdw-pp-side">
          <div className="tdw-pp-panel">
            <Skeleton width={120} height={14} />
            <Skeleton height={12} />
            <Skeleton height={12} width="70%" />
            <Skeleton height={12} width="85%" />
          </div>
        </aside>
      </main>
    </Frame>
  );
};

// Deleted, never existed or mistyped: the API can't tell them apart, and the
// page shouldn't either.
export const PostUnavailable: FC = () => {
  const t = useT();
  return (
    <Frame>
      <main className="tdw-pp-state">
        <EmptyState
          size="lg"
          icon="file-text"
          title={t('tdw_pp_unavailable', "This post isn't available")}
          body={t(
            'tdw_pp_unavailable_body',
            'It may have been deleted, or the link is incomplete. Ask whoever shared it for a new link.'
          )}
        />
      </main>
    </Frame>
  );
};

export const PostPageError: FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const t = useT();
  return (
    <Frame>
      <main className="tdw-pp-state">
        <EmptyState
          size="lg"
          icon="triangle-alert"
          title={t('tdw_pp_error', "We couldn't load this post")}
          body={t(
            'tdw_pp_error_body',
            'This is on our side, not yours. Try again in a moment.'
          )}
          action={
            <Button variant="primary" icon="refresh-cw" onClick={onRetry}>
              {t('tdw_pp_try_again', 'Try again')}
            </Button>
          }
        />
      </main>
    </Frame>
  );
};
