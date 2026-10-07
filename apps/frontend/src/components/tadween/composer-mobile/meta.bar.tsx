'use client';

import { FC, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import { Icon } from '@gitroom/frontend/components/tadween/ui/primitives';

// The row under the channels on phones: when the post goes out (opens the
// schedule sheet), Write / Preview, and the settings sheet.
export const ComposerMetaBar: FC<{
  date: dayjs.Dayjs;
  repeats: boolean;
  onDate: () => void;
  preview: boolean;
  onPreview: (preview: boolean) => void;
  onSettings?: () => void;
}> = ({ date, repeats, onDate, preview, onPreview, onSettings }) => {
  const t = useT();
  // Read after mount: localStorage / navigator don't exist during SSR.
  const [us, setUs] = useState(false);
  useEffect(() => setUs(isUSCitizen()), []);

  return (
    <div className="tdw-cm-meta hidden mobile:flex">
      <button
        type="button"
        className="tdw-cm-when"
        aria-haspopup="dialog"
        onClick={onDate}
      >
        <Icon name="calendar" size={16} />
        <span className="tdw-cm-when-text">
          {date.format(us ? 'MMM D · h:mm A' : 'D MMM · HH:mm')}
        </span>
        {repeats && <Icon name="repeat" size={14} className="tdw-cm-when-rep" />}
      </button>
      <div
        className="tdw-cm-seg"
        role="tablist"
        style={{ ['--i' as string]: preview ? 1 : 0 }}
      >
        <span className="tdw-cm-seg-thumb" aria-hidden="true" />
        <button
          type="button"
          role="tab"
          aria-selected={!preview}
          className="tdw-cm-seg-item"
          onClick={() => onPreview(false)}
        >
          {t('tdw_cm_write', 'Write')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={preview}
          className="tdw-cm-seg-item"
          onClick={() => onPreview(true)}
        >
          {t('preview', 'Preview')}
        </button>
      </div>
      {!!onSettings && (
        <button
          type="button"
          className="tdw-cm-icon-btn"
          aria-label={t('settings', 'Settings')}
          aria-haspopup="dialog"
          onClick={onSettings}
        >
          <Icon name="settings" size={20} />
        </button>
      )}
    </div>
  );
};
