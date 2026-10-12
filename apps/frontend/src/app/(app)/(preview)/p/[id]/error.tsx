'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { PostPageError } from '@gitroom/frontend/components/tadween/post-page/post.page.states';

export default function PostPreviewError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return <PostPageError onRetry={retry} />;
}
