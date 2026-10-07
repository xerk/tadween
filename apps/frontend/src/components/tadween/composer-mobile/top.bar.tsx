'use client';

import { FC, useRef, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { MobileTopBarAction } from '@gitroom/frontend/components/new-launch/mobile.top.bar';
import { Icon } from '@gitroom/frontend/components/tadween/ui/primitives';
import {
  TadweenSheet,
  TadweenSheetGroup,
  TadweenSheetRow,
} from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';

const actionIcons: Record<MobileTopBarAction['variant'], string> = {
  primary: 'calendar',
  secondary: 'send',
  tertiary: 'file-text',
};

// The phone composer's navigation bar: Cancel, the title, and the main action.
// The first action is the button; the others (Post now, Save as draft) open
// from its chevron or a long press, in a sheet. Same actions as upstream's
// MobileTopBar, so every handler stays in manage.modal.
export const ComposerTopBar: FC<{
  title: string;
  onCancel: () => void;
  actions: MobileTopBarAction[];
  disabled: boolean;
  loading: boolean;
}> = ({ title, onCancel, actions, disabled, loading }) => {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressed = useRef(false);
  const [primary, ...more] = actions;

  const startPress = () => {
    longPressed.current = false;
    if (!more.length || disabled) {
      return;
    }
    press.current = setTimeout(() => {
      longPressed.current = true;
      navigator.vibrate?.(10);
      setMenu(true);
    }, 450);
  };

  const cancelPress = () => clearTimeout(press.current);

  return (
    <>
      <div className="tdw-cm-top hidden mobile:grid">
        <button type="button" className="tdw-cm-cancel" onClick={onCancel}>
          {t('cancel', 'Cancel')}
        </button>
        <div className="tdw-cm-title">{title}</div>
        <div className={clsx('tdw-cm-publish', !!more.length && 'has-more')}>
          <button
            type="button"
            className="tdw-cm-publish-main"
            disabled={disabled}
            onPointerDown={startPress}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            onContextMenu={(e) => more.length && e.preventDefault()}
            onClick={() => {
              if (longPressed.current) {
                longPressed.current = false;
                return;
              }
              primary.onClick();
            }}
          >
            {loading && <span className="tdw-cm-spinner" aria-hidden="true" />}
            <span className={clsx(loading && 'invisible')}>
              {primary.label}
            </span>
          </button>
          {!!more.length && (
            <button
              type="button"
              className="tdw-cm-publish-more"
              aria-label={t('tdw_more_publish_options', 'More publish options')}
              aria-haspopup="dialog"
              aria-expanded={menu}
              disabled={disabled}
              onClick={() => setMenu(true)}
            >
              <Icon name="chevron-down" size={16} />
            </button>
          )}
        </div>
      </div>
      <TadweenSheet
        open={menu}
        onClose={() => setMenu(false)}
        title={t('tdw_cm_publish_options', 'Publish options')}
      >
        <TadweenSheetGroup>
          {actions.map((action) => (
            <TadweenSheetRow
              key={action.label}
              icon={<Icon name={actionIcons[action.variant]} size={20} />}
              label={action.label}
              chevron={false}
              onClick={() => {
                // the sheet leaves first, the save flow may open dialogs
                setMenu(false);
                action.onClick();
              }}
            />
          ))}
        </TadweenSheetGroup>
      </TadweenSheet>
    </>
  );
};
