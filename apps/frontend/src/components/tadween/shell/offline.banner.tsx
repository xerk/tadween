'use client';

// Offline: a bar above the page card (where the trial bar floats, with the
// failed-payment bar's warning look) while the browser has no connection.
// Requests that fail meanwhile also toast (layout/layout.context.tsx).
import { FC, useEffect, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Icon, TadweenScope } from '@gitroom/frontend/components/tadween/ui';

export const OfflineBanner: FC = () => {
  const t = useT();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) {
    return null;
  }
  return (
    <TadweenScope>
      <div className="tdw-trial-bar is-failed" role="alert">
        <Icon name="triangle-alert" size={16} />
        <span>
          {t(
            'tdw_offline_banner',
            'You’re offline. Nothing can be saved or scheduled until the connection is back.'
          )}
        </span>
      </div>
    </TadweenScope>
  );
};
