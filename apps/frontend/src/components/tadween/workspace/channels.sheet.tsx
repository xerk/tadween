'use client';

// "All channels": a floating panel under the toolbar on desktop, a bottom
// sheet on phones. It holds the chip filter and Postiz's own channel list
// (passed in as children: Add Channel + invite link, customer groups with
// drag-to-regroup and rename, every row's menu). Portalled to <body> so the
// modals the channel menu opens never blur or move it.
import React, { FC, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { IconButton, usePresence } from '@gitroom/frontend/components/tadween/ui';

export const ChannelsSheet: FC<{
  open: boolean;
  onClose: () => void;
  anchor?: DOMRect | null;
  children: ReactNode;
}> = ({ open, onClose, anchor, children }) => {
  const t = useT();
  const { mounted, state } = usePresence(open, 320);
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      // While a Postiz modal is open (it locks the body) Escape belongs to it
      if (e.key === 'Escape' && !document.body.classList.contains('overflow-hidden')) onClose();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, onClose]);

  // Phone: drag the grabber down to dismiss; the sheet follows the finger
  const onGrabStart = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    sheet.current!.style.transition = 'none';
  };
  const onGrabMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    sheet.current!.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onGrabEnd = () => {
    if (!drag.current) return;
    const { dy } = drag.current;
    drag.current = null;
    sheet.current!.style.transition = '';
    sheet.current!.style.transform = '';
    if (dy > 90) onClose();
  };

  if (!mounted || typeof document === 'undefined') return null;

  const style = anchor
    ? ({
        '--tdw-ws-sheet-top': `${anchor.bottom + 8}px`,
        '--tdw-ws-sheet-end': `${Math.max(12, window.innerWidth - anchor.right)}px`,
        '--tdw-ws-sheet-start': `${Math.max(12, anchor.left)}px`,
      } as React.CSSProperties)
    : undefined;

  return createPortal(
    <div className="tdw-ui tdw-ws-sheet-root" data-state={state} style={style}>
      <div className="tdw-ws-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheet}
        className="tdw-ws-sheet"
        role="dialog"
        aria-modal="false"
        aria-label={t('tdw_ws_all_channels', 'All channels')}
      >
        <div
          className="tdw-ws-grabber"
          onPointerDown={onGrabStart}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabEnd}
          onPointerCancel={onGrabEnd}
          aria-hidden="true"
        >
          <i />
        </div>
        <div className="tdw-ws-sheet-head">
          <h2>{t('channels', 'Channels')}</h2>
          <IconButton icon="x" size="sm" label={t('close', 'Close')} onClick={onClose} />
        </div>
        <div className="tdw-ws-sheet-body">{children}</div>
      </div>
    </div>,
    document.body
  );
};
