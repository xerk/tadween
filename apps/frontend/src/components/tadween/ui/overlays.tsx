'use client';

// Tadween UI kit: overlays (design system overlays.tsx). Toasts reuse Postiz's
// own toaster (`useToaster`) so the app keeps a single toast stack.
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, cx, Icon } from './primitives';

/* usePresence — keeps a node mounted through its exit so it leaves the way it came */
export function usePresence(open: boolean, ms = 260) {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<'open' | 'closed'>(
    open ? 'open' : 'closed'
  );
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setState('open'));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setState('closed');
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open]);
  return { mounted, state };
}

export function useEscape(open: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!open || !onClose) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open, onClose]);
}

/* Dialog — modal: scrim dims, the surface materializes (blur + scale) */
export const Dialog: FC<{
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}> = ({ open, onClose, title, description, children, footer, size = 'md' }) => {
  const { mounted, state } = usePresence(open, 280);
  useEscape(open, onClose);
  if (!mounted || typeof document === 'undefined') return null;
  // Portalled to <body>, so it carries its own .tdw-ui scope.
  return createPortal(
    <div className="tdw-ui">
      <div className="pz-overlay" data-state={state}>
        <div className="pz-scrim" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
          className={cx('pz-dialog', `pz-dialog-${size}`)}
          data-state={state}
        >
          <header className="pz-dialog-head">
            <div>
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
          {children ? <div className="pz-dialog-body">{children}</div> : null}
          {footer ? <footer className="pz-dialog-foot">{footer}</footer> : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ConfirmDialog — only for destructive, irreversible actions */
export const ConfirmDialog: FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'destructive' | 'primary';
}> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = 'destructive',
}) => {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={tone}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
};
