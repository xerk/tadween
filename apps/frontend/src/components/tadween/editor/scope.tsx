'use client';

import { FC, ReactNode } from 'react';
import { LockIcon } from '@gitroom/frontend/components/ui/icons';
import { TadweenIcon } from '@gitroom/frontend/components/tadween/editor/icons';

// A channel tab that still follows the shared post: the post is shown dimmed
// above this card, and the card offers the one way forward.
export const EditorLockCard: FC<{
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  onAction?: () => void;
}> = ({ title, body, action, onAction }) => (
  <div className="tdw-lock" role="status">
    <span className="tdw-lock-ico" aria-hidden="true">
      <LockIcon size={16} />
    </span>
    <div className="tdw-lock-copy">
      <b>{title}</b>
      {!!body && <p>{body}</p>}
    </div>
    {!!action && (
      <button type="button" className="tdw-lock-btn" onClick={onAction}>
        <TadweenIcon name="pencil" size={14} />
        {action}
      </button>
    )}
  </div>
);

// A channel tab with its own version: who gets it, and the way back.
export const EditorScopeNote: FC<{
  children: ReactNode;
  action: ReactNode;
  onAction: () => void;
}> = ({ children, action, onAction }) => (
  <div className="tdw-scope-note">
    <TadweenIcon name="pencil" size={13} />
    <span>{children}</span>
    <button type="button" className="tdw-link-btn" onClick={onAction}>
      {action}
    </button>
  </div>
);
