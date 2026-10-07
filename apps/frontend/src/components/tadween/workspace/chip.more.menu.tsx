'use client';

// The ⋯ button of a calendar chip. Narrow chips (week columns, month cells)
// have no room for every hover action, so workspace.scss hides the inline
// buttons under a container width and shows this menu with the same actions.
import React, { FC, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Icon } from '@gitroom/frontend/components/tadween/ui';

export interface ChipAction {
  key: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export const ChipMoreMenu: FC<{ actions: ChipAction[] }> = ({ actions }) => {
  const t = useT();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<null | { top: number; left: number }>(null);

  const close = useCallback(() => setPos(null), []);

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (pos) {
        close();
        return;
      }
      const r = button.current!.getBoundingClientRect();
      const width = 208;
      const rtl = document.documentElement.dir === 'rtl';
      const left = rtl ? r.left : r.right - width;
      setPos({
        top: r.bottom + 6,
        left: Math.min(Math.max(8, left), window.innerWidth - width - 8),
      });
    },
    [pos, close]
  );

  // Keep the menu on screen: open upwards when there's no room below
  useEffect(() => {
    if (!pos || !menu.current) return;
    const h = menu.current.offsetHeight;
    if (pos.top + h > window.innerHeight - 8) {
      const r = button.current!.getBoundingClientRect();
      setPos((p) => (p ? { ...p, top: Math.max(8, r.top - h - 6) } : p));
    }
  }, [pos?.left]);

  useEffect(() => {
    if (!pos) return;
    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos, close]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="tdw-chip-act tdw-chip-more"
        aria-label={t('tdw_ws_more_actions', 'More actions')}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={toggle}
      >
        <Icon name="ellipsis" size={14} />
      </button>
      {pos &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            className="tdw-ws-menu"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                className={clsx('tdw-ws-menu-item', action.danger && 'is-danger')}
                onClick={() => {
                  close();
                  action.onClick();
                }}
              >
                <span className="tdw-ws-menu-ico" aria-hidden="true">
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};
