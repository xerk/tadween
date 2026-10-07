'use client';

import {
  CSSProperties,
  FC,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

// Account menu at the foot of the sidebar: settings, billing, appearance, language
// and log out. Appearance, language and log out are Postiz's own components; each
// row forwards its clicks to that component, so their logic is untouched. The panel stays mounted while closed because
// ModeComponent is what applies the saved theme to <body>. It is portalled to
// <body> so the page content (painted after the fixed #left-menu) can't cover it.

const Icon: FC<{ children: ReactNode }> = ({ children }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const initials = (value: string) =>
  value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

// Host rows forward clicks on the row (and Enter / Space) to the wrapped Postiz
// component, which is the row's first child.
const clickHost = (e: ReactMouseEvent<HTMLDivElement>) => {
  const host = e.currentTarget.firstElementChild as HTMLElement | null;
  if (host && !host.contains(e.target as Node)) {
    host.click();
  }
};
const pressHost = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.key !== 'Enter' && e.key !== ' ') {
    return;
  }
  e.preventDefault();
  (e.currentTarget.firstElementChild as HTMLElement | null)?.click();
};

export const AccountMenu: FC = () => {
  const user = useUser();
  const t = useT();
  const { billingEnabled } = useVariables();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const name =
    [user?.name, user?.lastName].filter(Boolean).join(' ') || user?.email || '';
  const showBilling =
    billingEnabled &&
    ['ADMIN', 'SUPERADMIN'].includes(user?.role!) &&
    !user?.isLifetime;

  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) {
      return;
    }
    const rtl = document.documentElement.dir === 'rtl';
    const rail = r.width < 120;
    const side = rail
      ? rtl
        ? window.innerWidth - r.left + 8
        : r.right + 8
      : rtl
      ? window.innerWidth - r.right
      : r.left;
    setStyle({
      bottom: window.innerHeight - (rail ? r.bottom : r.top - 6),
      [rtl ? 'right' : 'left']: side,
      width: rail ? 248 : Math.max(r.width, 220),
    });
  }, []);

  const toggle = useCallback(
    (e: ReactMouseEvent) => {
      // The mobile slide-in menu closes on any click inside it.
      e.stopPropagation();
      if (!open) {
        place();
      }
      setOpen(!open);
    },
    [open, place]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrap.current?.contains(target) && !panel.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onResize = () => setOpen(false);
    // The panel is portalled to the end of <body>; move focus into it.
    panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  if (!user) {
    return null;
  }

  return (
    <div ref={wrap} className="tdw-acct blurMe">
      <button
        ref={trigger}
        type="button"
        className="tdw-acct-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={name}
        data-tooltip-id="tdw-rail"
        data-tooltip-content={name}
        data-tooltip-hidden={open}
        onClick={toggle}
      >
        <span className="tdw-acct-avatar" aria-hidden="true">
          {initials(name) || '?'}
        </span>
        <span className="tdw-acct-info tdw-side-label">
          <span className="tdw-acct-name">{name}</span>
          {!!user.email && name !== user.email && (
            <span className="tdw-acct-sub">{user.email}</span>
          )}
        </span>
        <span className="tdw-acct-chev tdw-side-label">
          <Icon>
            <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
          </Icon>
        </span>
      </button>
      {createPortal(
        <div
          ref={panel}
          role="menu"
          aria-label={name}
          className={clsx('tdw-acct-menu', open && 'is-open')}
          style={style}
          onClick={() => setOpen(false)}
        >
          <Link href="/settings" role="menuitem" className="tdw-acct-item">
            <span className="tdw-acct-ico">
              <Icon>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </Icon>
            </span>
            <span>{t('settings', 'Settings')}</span>
          </Link>
          {showBilling && (
            <Link href="/billing" role="menuitem" className="tdw-acct-item">
              <span className="tdw-acct-ico">
                <Icon>
                  <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                  <path d="M2.5 10h19M6.5 15h4" />
                </Icon>
              </span>
              <span>{t('billing', 'Billing')}</span>
            </Link>
          )}
          <div
            role="menuitem"
            tabIndex={0}
            className="tdw-acct-item tdw-acct-host"
            onClick={clickHost}
            onKeyDown={pressHost}
          >
            <ModeComponent />
            <span>{t('appearance', 'Appearance')}</span>
          </div>
          <div
            role="menuitem"
            tabIndex={0}
            className="tdw-acct-item tdw-acct-host"
            onClick={clickHost}
            onKeyDown={pressHost}
          >
            <LanguageComponent />
            <span>{t('change_language', 'Change Language')}</span>
          </div>
          <span className="tdw-acct-sep" role="separator" />
          <div
            role="menuitem"
            tabIndex={0}
            className="tdw-acct-item tdw-acct-host is-danger"
            onClick={clickHost}
            onKeyDown={pressHost}
          >
            <LogoutComponent isIcon={true} />
            <span>{t('log_out', 'Log out')}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
