'use client';

// CommentThread: the comments section of a post page. The comments themselves
// are the existing preview comments (CommentsComponents): same endpoints,
// same rules (a guest gives a name, the post's team can resolve).
import { FC, useEffect } from 'react';
import { usePreviewComments } from '@gitroom/frontend/components/preview/preview.comments.context';
import { CommentsComponents } from '@gitroom/frontend/components/preview/comments.components';

export const COMMENTS_ID = 'comments';

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Scrolls to the comment box and puts the cursor in it (the action bar's
// Comment button, and a "Comment" on selected text).
export const focusComments = () => {
  const section = document.getElementById(COMMENTS_ID);
  const box = section?.querySelector('textarea');
  section?.scrollIntoView({
    behavior: reducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
  box?.focus({ preventScroll: true });
};

export const CommentThread: FC<{ previewId: string }> = ({ previewId }) => {
  const { pending } = usePreviewComments();

  useEffect(() => {
    if (pending) {
      focusComments();
    }
  }, [pending]);

  return (
    <section id={COMMENTS_ID} className="tdw-pp-panel tdw-pp-comments-panel">
      <CommentsComponents previewId={previewId} />
    </section>
  );
};
