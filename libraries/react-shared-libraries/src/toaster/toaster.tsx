'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import EventEmitter from 'events';
const toaster = new EventEmitter();

// Tadween toasts: neutral material surface, only the icon carries colour.
// Stacked at the bottom centre, each with its own timer (paused on hover),
// and an optional action such as Undo. `show(text, type)` is unchanged.
type ToastType = 'success' | 'warning';
type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; text: string; type: ToastType; action?: ToastAction; leaving?: boolean };

const DURATION = 4200;
const MAX = 3;
let seq = 0;

const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: (id: number) => void }) => {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const left = useRef(toast.action ? DURATION + 2000 : DURATION);
  const started = useRef(0);
  const start = useCallback(() => {
    started.current = Date.now();
    timer.current = setTimeout(() => onClose(toast.id), left.current);
  }, [onClose, toast.id]);
  const pause = useCallback(() => {
    clearTimeout(timer.current);
    left.current = Math.max(800, left.current - (Date.now() - started.current));
  }, []);
  useEffect(() => {
    start();
    return () => clearTimeout(timer.current);
  }, [start]);

  return (
    <div
      className="tdw-toast"
      data-type={toast.type}
      data-state={toast.leaving ? 'closed' : 'open'}
      role={toast.type === 'warning' ? 'alert' : 'status'}
      onPointerEnter={pause}
      onPointerLeave={start}
      onFocus={pause}
      onBlur={start}
    >
      <span className="tdw-toast-icon" aria-hidden="true">
        {toast.type === 'success' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path d="m8 12.5 2.6 2.5L16 9.5" stroke="var(--tdw-card, #fff)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" fill="currentColor" />
            <path d="M12 9v4.2M12 16.6h.01" stroke="var(--tdw-card, #fff)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <span className="tdw-toast-text">{toast.text}</span>
      {toast.action ? (
        <button
          type="button"
          className="tdw-toast-action"
          onClick={() => {
            toast.action!.onClick();
            onClose(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button type="button" className="tdw-toast-close" aria-label="Dismiss" onClick={() => onClose(toast.id)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

export const Toaster = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const close = useCallback((id: number) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 200);
  }, []);
  useEffect(() => {
    toaster.on(
      'show',
      (params: { text: string; type?: ToastType; action?: ToastAction }) => {
        const { text, type, action } = params;
        setToasts((list) =>
          [...list.filter((t) => !(t.text === text && !t.leaving)), { id: ++seq, text, type: type || 'success', action }].slice(-MAX)
        );
      }
    );
    return () => {
      toaster.removeAllListeners();
    };
  }, []);
  return (
    <div className="tdw-toaster" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={close} />
      ))}
    </div>
  );
};
export const useToaster = () => {
  return {
    show: useCallback(
      (text: string, type?: ToastType, options?: { action?: ToastAction }) => {
        toaster.emit('show', {
          text,
          type,
          action: options?.action,
        });
      },
      []
    ),
  };
};
