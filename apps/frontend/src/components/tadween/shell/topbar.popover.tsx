'use client';

import {
  CSSProperties,
  FC,
  ReactNode,
  RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

// A panel under a top-bar trigger (notifications, streak, admin tools).
// Portalled to <body> and placed with fixed coordinates from the trigger, like
// the account menu, so it sits on the --tdw-z-popover layer instead of inside
// the top bar's stacking context, where the page could paint over it. Its end
// edge lines up with the trigger's end edge (left edge in RTL). Clicks outside
// the trigger and the panel, Escape and resizing close it.
export const TopbarPopover: FC<{
  open: boolean;
  onClose: () => void;
  anchor: RefObject<HTMLElement | null>;
  label: string;
  className?: string;
  children: ReactNode;
}> = ({ open, onClose, anchor, label, className, children }) => {
  const panel = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>();

  useLayoutEffect(() => {
    if (!open) {
      setStyle(undefined);
      return;
    }
    const r = anchor.current?.getBoundingClientRect();
    if (!r) {
      return;
    }
    const rtl = document.documentElement.dir === 'rtl';
    setStyle({
      top: r.bottom + 10,
      // narrow screens: the full width between 12px gutters
      ...(window.innerWidth < 640
        ? { left: 12, right: 12, width: 'auto' }
        : rtl
        ? { left: Math.max(12, r.left) }
        : { right: Math.max(12, window.innerWidth - r.right) }),
    });
  }, [open, anchor]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !anchor.current?.contains(target) &&
        !panel.current?.contains(target)
      ) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        anchor.current?.focus();
      }
    };
    // a phone's keyboard resizes the window: keep the panel while typing in it
    const onResize = () => {
      if (!panel.current?.contains(document.activeElement)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open, onClose, anchor]);

  // The panel is portalled to the end of <body>; move focus into it, as the
  // account menu does
  const placed = !!style;
  useEffect(() => {
    if (placed) {
      // its first control, or the panel itself when it only shows things
      (
        panel.current?.querySelector<HTMLElement>(
          'input, button, a[href], [tabindex]:not([tabindex="-1"])'
        ) || panel.current
      )?.focus({ preventScroll: true });
    }
  }, [placed]);

  if (!open || !style) {
    return null;
  }

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      className={clsx('tdw-topbar-popover', className)}
      style={style}
    >
      {children}
    </div>,
    document.body
  );
};
