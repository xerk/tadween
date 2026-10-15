'use client';

// Tadween UI kit: overlays (design system overlays.tsx). Toasts reuse Postiz's
// own toaster (`useToaster`) so the app keeps a single toast stack.
import React, { FC, ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { Button, cx, Icon } from './primitives';

/* useOverlayOpen — counts the open modal layers (the modal manager, dialogs,
   drawers, sheets, lightboxes), so floating page chrome such as the support
   chat (layout/crisp.component.tsx) can step aside while any is open. Only
   the modal manager's own layers: useHasOpenModal (layout/new-modal.tsx) */
const useOverlayStore = create<{ open: number }>(() => ({ open: 0 }));
export function useOverlayOpen(open: boolean) {
  useEffect(() => {
    if (!open) return;
    useOverlayStore.setState((s) => ({ open: s.open + 1 }));
    return () => useOverlayStore.setState((s) => ({ open: s.open - 1 }));
  }, [open]);
}
export const useHasOpenOverlay = () => useOverlayStore((s) => s.open > 0);
// the same, read outside React (event callbacks)
export const hasOpenOverlay = () => useOverlayStore.getState().open > 0;

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

/* usePopupEscape — a popup (date picker, repeat, tags…) closes on Escape and
   keeps the key to itself: only the newest open popup closes, and the modal
   or drawer around it (layout/new-modal.tsx) never sees that Escape, so it
   can't ask to close the composer. Listens on window in the capture phase,
   before the modal's document listener and wherever the focus is. A text
   field inside the popup keeps its own Escape (the picker's time field
   reverts what was typed); the modal ignores keys from fields anyway. */
const popups: { current: () => void }[] = [];
const onPopupEscape = (e: KeyboardEvent) => {
  const top = popups[popups.length - 1];
  if (e.key !== 'Escape' || e.isComposing || !top) return;
  const target = e.target as HTMLElement | null;
  if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) {
    return;
  }
  e.stopPropagation();
  e.preventDefault();
  top.current();
};
export function usePopupEscape(open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    if (!popups.length) {
      window.addEventListener('keydown', onPopupEscape, true);
    }
    popups.push(close);
    return () => {
      const i = popups.lastIndexOf(close);
      if (i > -1) popups.splice(i, 1);
      if (!popups.length) {
        window.removeEventListener('keydown', onPopupEscape, true);
      }
    };
  }, [open]);
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
  useOverlayOpen(open);
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
