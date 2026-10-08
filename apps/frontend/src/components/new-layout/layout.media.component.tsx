'use client';

import { MediaLibrary } from '@gitroom/frontend/components/tadween/media/media.library';

export const MediaLayoutComponent = () => {
  return (
    <div className="bg-newBgColorInner flex flex-1 flex-col min-h-0 transition-all">
      <MediaLibrary mode="page" />
    </div>
  );
};
