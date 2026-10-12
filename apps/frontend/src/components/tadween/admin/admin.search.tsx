'use client';

// Top-bar search of the admin console: workspaces and users matching the text
// (the same server-side list endpoints, 5 rows each). "/" focuses it; picking a
// result opens it in its page's detail drawer.
import React, { FC, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Icon, Popover, Spinner } from '@gitroom/frontend/components/tadween/ui';
import {
  TIER_LABEL,
  useAdminSearchOrganizations,
  useAdminSearchUsers,
} from './admin.api';

export const AdminSearch: FC = () => {
  const t = useT();
  const router = useRouter();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const orgs = useAdminSearchOrganizations(search);
  const users = useAdminSearchUsers(search);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = [
    ...(orgs.data?.items || []).map((o) => ({
      id: o.id,
      href: `/admin/organizations?open=${o.id}`,
      icon: 'building-2',
      title: o.name,
      sub: [o.owner?.email, o.tier ? TIER_LABEL[o.tier] : t('tdw_admin_no_plan', 'No plan')]
        .filter(Boolean)
        .join(' · '),
    })),
    ...(users.data?.items || []).map((u) => ({
      id: u.id,
      href: `/admin/users?open=${u.id}`,
      icon: 'user',
      title: [u.name, u.lastName].filter(Boolean).join(' ') || u.email,
      sub: u.email,
    })),
  ];

  const go = (href: string) => {
    setOpen(false);
    setText('');
    router.push(href);
  };

  const loading = !!search && (orgs.isLoading || users.isLoading);

  return (
    <div ref={wrap} className="adm-search">
      <Icon name="search" size={16} className="adm-search-icon" />
      <input
        ref={input}
        type="search"
        className="adm-search-input"
        placeholder={t('tdw_admin_search', 'Search workspaces and users')}
        aria-label={t('tdw_admin_search', 'Search workspaces and users')}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) {
            go(results[0].href);
          }
        }}
      />
      <kbd className="adm-search-kbd" aria-hidden="true">
        /
      </kbd>
      <Popover open={open && !!text.trim()} onClose={() => setOpen(false)} anchor={wrap} align="end" width={360}>
        <div className="adm-search-results" role="listbox">
          {loading && !results.length ? (
            <div className="adm-search-empty">
              <Spinner size={16} />
            </div>
          ) : results.length ? (
            results.map((r) => (
              <button
                key={r.icon + r.id}
                type="button"
                role="option"
                aria-selected={false}
                className="adm-search-item"
                onClick={() => go(r.href)}
              >
                <Icon name={r.icon} size={16} />
                <span className="min-w-0 grid text-start">
                  <span className="truncate">{r.title}</span>
                  <span className="caption pz-muted truncate">{r.sub}</span>
                </span>
              </button>
            ))
          ) : search ? (
            <div className="adm-search-empty caption pz-muted">
              {t('tdw_admin_search_none', 'No workspaces or users match.')}
            </div>
          ) : null}
        </div>
      </Popover>
    </div>
  );
};
