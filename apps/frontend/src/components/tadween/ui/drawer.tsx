'use client';

// Tadween UI kit: Drawer — a panel that slides in from the inline end (right in
// English, left in Arabic) for a row's details. Same scrim, Escape and
// portal behaviour as Dialog; full width on phones.
import React, { FC, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx, Icon } from './primitives';
import { useEscape, usePresence } from './overlays';

export const Drawer: FC<{
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}> = ({ open, onClose, title, description, children, footer, size = 'md' }) => {
  const { mounted, state } = usePresence(open, 280);
  useEscape(open, onClose);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(
    <div className="tdw-ui">
      <div className="pz-drawer-layer" data-state={state}>
        <div className="pz-scrim" onClick={onClose} />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
          className={cx('pz-drawer', `pz-drawer-${size}`)}
          data-state={state}
        >
          <header className="pz-drawer-head">
            <div className="min-w-0">
              <h2 className="title-2 pz-dialog-title">{title}</h2>
              {description ? (
                <p className="pz-dialog-desc">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="pz-iconbtn pz-btn-ghost pz-iconbtn-md"
              aria-label="Close"
              onClick={onClose}
            >
              <Icon name="x" />
            </button>
          </header>
          <div className="pz-drawer-body">{children}</div>
          {footer ? <footer className="pz-drawer-foot">{footer}</footer> : null}
        </aside>
      </div>
    </div>,
    document.body
  );
};
