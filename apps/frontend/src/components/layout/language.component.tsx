'use client';

import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  cookieName,
  fallbackLng,
  languages,
} from '@gitroom/react/translation/i18n.config';
import i18next from 'i18next';
import useCookie from 'react-use-cookie';
import React, { useMemo, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Icon } from '@gitroom/frontend/components/tadween/ui/primitives';

// Tadween: languages are listed by name (native + the UI language), not by
// country flag — a language isn't a country.
const SUGGESTED = ['ar', 'en'];
const RTL_LANGUAGES = ['ar'];

// i18n codes like `ka_ge` aren't BCP 47; Intl wants `ka-GE`
const toLocale = (code: string) => code.replace('_', '-');

const languageName = (code: string, inLanguage: string) => {
  try {
    return (
      new Intl.DisplayNames([toLocale(inLanguage)], { type: 'language' }).of(
        toLocale(code)
      ) || code
    );
  } catch (e) {
    return code;
  }
};

export const ChangeLanguageComponent = () => {
  const currentLanguage = i18next.resolvedLanguage || fallbackLng;
  const [_, setCookie] = useCookie(cookieName, currentLanguage || fallbackLng);
  const [query, setQuery] = useState('');
  const modals = useModals();
  const t = useT();

  const handleLanguageChange = (language: string) => {
    setCookie(language);
    i18next.changeLanguage(language);
    modals.closeCurrent();
    const dir = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
  };

  const items = useMemo(
    () =>
      languages.map((code) => ({
        code,
        native: languageName(code, code),
        local: languageName(code, currentLanguage),
      })),
    [currentLanguage]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((item) =>
      [item.code, item.native, item.local].some((v) =>
        v.toLowerCase().includes(q)
      )
    );
  }, [items, query]);

  const suggested = filtered.filter((item) => SUGGESTED.includes(item.code));
  const others = filtered
    .filter((item) => !SUGGESTED.includes(item.code))
    .sort((a, b) => a.local.localeCompare(b.local, toLocale(currentLanguage)));

  const renderGroup = (title: string, list: typeof items) =>
    !!list.length && (
      <div className="tdw-lang-group" role="group" aria-label={title}>
        <div className="tdw-lang-group-title">{title}</div>
        {list.map((item) => {
          const selected = item.code === currentLanguage;
          return (
            <button
              key={item.code}
              type="button"
              className="tdw-lang-option"
              aria-pressed={selected}
              onClick={() => handleLanguageChange(item.code)}
            >
              <span className="tdw-lang-names">
                <span
                  className="tdw-lang-native"
                  lang={toLocale(item.code)}
                  dir="auto"
                >
                  {item.native}
                </span>
                {item.local !== item.native && (
                  <span className="tdw-lang-local">{item.local}</span>
                )}
              </span>
              {selected && (
                <Icon name="check" size={16} className="tdw-lang-check" />
              )}
            </button>
          );
        })}
      </div>
    );

  return (
    <div className="tdw-lang">
      <label className="tdw-lang-search">
        <Icon name="search" size={16} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search_languages', 'Search languages')}
          aria-label={t('search_languages', 'Search languages')}
        />
      </label>
      <div className="tdw-lang-list">
        {renderGroup(t('suggested', 'Suggested'), suggested)}
        {renderGroup(t('all_languages', 'All languages'), others)}
        {!filtered.length && (
          <div className="tdw-lang-empty">
            {t('no_language_found', 'No language matches your search')}
          </div>
        )}
      </div>
    </div>
  );
};

export const LanguageComponent = () => {
  const modal = useModals();
  const currentLanguage = i18next.resolvedLanguage || fallbackLng;
  const t = useT();
  const openModal = () => {
    modal.openModal({
      title: t('change_language', 'Change Language'),
      withCloseButton: true,
      children: <ChangeLanguageComponent />,
    });
  };
  return (
    <button
      type="button"
      onClick={openModal}
      className="tdw-lang-trigger"
      aria-label={t('change_language', 'Change Language')}
      title={languageName(currentLanguage, currentLanguage)}
    >
      <Icon name="globe" size={18} />
    </button>
  );
};
