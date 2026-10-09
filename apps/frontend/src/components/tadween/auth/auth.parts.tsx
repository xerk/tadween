'use client';

// Tadween auth building blocks: the pieces every signed-out screen is made of
// (components/auth/*). Presentation only; forms, fetches and redirects stay in
// those components. Styles live in app/tadween/auth.scss and render inside the
// `.tdw-ui` scope of the auth layout, so the kit's Field / Button classes apply.
import { FC, ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useFormContext } from 'react-hook-form';
import useCookie from 'react-use-cookie';
import i18next from 'i18next';
import {
  cookieName,
  fallbackLng,
  languages,
} from '@gitroom/react/translation/i18n.config';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { modeEmitter } from '@gitroom/frontend/components/layout/mode.component';
import { useBrandLinks } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import {
  cx,
  Field,
  Icon,
  IconName,
} from '@gitroom/frontend/components/tadween/ui';

/* Title + one-line subtitle at the top of every card */
export const AuthHeading: FC<{
  title: ReactNode;
  subtitle?: ReactNode;
}> = ({ title, subtitle }) => (
  <div className="tdw-auth-heading">
    <h1>{title}</h1>
    {subtitle ? <p>{subtitle}</p> : null}
  </div>
);

/* Full-width secondary button with the provider's own mark */
export const AuthProviderButton: FC<{
  mark: ReactNode;
  label: ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ mark, label, onClick, className }) => (
  <button
    type="button"
    className={cx('tdw-auth-provider', className)}
    onClick={onClick}
  >
    <span className="tdw-auth-provider-mark" aria-hidden="true">
      {mark}
    </span>
    <span className="tdw-auth-provider-label">{label}</span>
  </button>
);

/* Vertical stack for the provider buttons */
export const AuthProviders: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="tdw-auth-providers">{children}</div>
);

export const AuthDivider: FC = () => {
  const t = useT();
  return (
    <div className="tdw-auth-divider" role="separator">
      <span>{t('or', 'or')}</span>
    </div>
  );
};

/* Validation copy. The DTO (client resolver) and the API stay the source of
   truth: a known rule on a known field gets a friendly, translated sentence, the
   limit is taken from the original message, and anything unmapped (server
   messages like "Email already exists") is shown as sent. Keyed on field + rule,
   with `*` as the any-field fallback. */
const FIELD_MESSAGES: Record<string, [string, string]> = {
  'email.isEmail': ['tdw_auth_err_email', 'Enter a valid email address.'],
  'email.isDefined': ['tdw_auth_err_email', 'Enter a valid email address.'],
  'email.isString': ['tdw_auth_err_email', 'Enter a valid email address.'],
  'password.isDefined': ['tdw_auth_err_password', 'Enter your password.'],
  'password.isString': ['tdw_auth_err_password', 'Enter your password.'],
  'company.isDefined': ['tdw_auth_err_workspace', 'Enter a workspace name.'],
  'company.isString': ['tdw_auth_err_workspace', 'Enter a workspace name.'],
  'repeatPassword.isIn': ['tdw_auth_err_match', 'Passwords do not match.'],
  '*.minLength': ['tdw_auth_err_min', 'Use at least {{count}} characters.'],
  '*.maxLength': ['tdw_auth_err_max', 'Use at most {{count}} characters.'],
};

const useFieldError = (name: string) => {
  const t = useT();
  const form = useFormContext();
  const error = form.formState.errors?.[name];
  const raw = error?.message as string | undefined;
  if (!raw) {
    return undefined;
  }
  const rule = String(error?.type || '');
  const entry =
    FIELD_MESSAGES[`${name}.${rule}`] || FIELD_MESSAGES[`*.${rule}`];
  if (!entry) {
    return raw;
  }
  const count = raw.match(/\d+/)?.[0];
  if (entry[1].includes('{{count}}') && !count) {
    return raw;
  }
  return t(entry[0], entry[1], { count: Number(count) });
};

/* A react-hook-form field: top label, kit input, inline error from formState */
export const AuthField: FC<{
  name: string;
  label: ReactNode;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  aside?: ReactNode;
  /** message shown when the field is left empty */
  required?: string;
}> = ({ name, label, type = 'text', placeholder, autoComplete, aside, required }) => {
  const form = useFormContext();
  const id = useId();
  const error = useFieldError(name);
  return (
    <Field
      id={id}
      label={label}
      error={error}
      className={cx('tdw-auth-field', aside && 'has-aside')}
    >
      {aside ? <span className="tdw-auth-field-aside">{aside}</span> : null}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="pz-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? id + '-note' : undefined}
        {...form.register(name, required ? { required } : undefined)}
      />
    </Field>
  );
};

/* Primary submit; keeps its width while loading */
export const AuthSubmit: FC<{
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  type?: 'submit' | 'button';
  onClick?: () => void;
}> = ({ loading, disabled, children, type = 'submit', onClick }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cx('pz-btn pz-btn-primary tdw-auth-submit', loading && 'is-loading')}
  >
    {loading ? <Icon name="loader-circle" /> : null}
    <span>{children}</span>
  </button>
);

/* Status block: info (Nile), warning (amber) or success (green) */
export const AuthNotice: FC<{
  tone?: 'info' | 'warning' | 'success';
  icon?: IconName;
  title?: ReactNode;
  children?: ReactNode;
}> = ({ tone = 'info', icon, title, children }) => (
  <div className={cx('tdw-auth-notice', `is-${tone}`)} role="status">
    <Icon
      name={
        icon ||
        (tone === 'success'
          ? 'circle-check'
          : tone === 'warning'
          ? 'triangle-alert'
          : 'info')
      }
      size={18}
    />
    <div>
      {title ? <strong>{title}</strong> : null}
      {children ? <div>{children}</div> : null}
    </div>
  </div>
);

/* "New to Tadween? Create an account" */
export const AuthSwitch: FC<{
  prompt?: ReactNode;
  href: string;
  action: ReactNode;
}> = ({ prompt, href, action }) => (
  <p className="tdw-auth-switch">
    {prompt ? <span>{prompt}</span> : null}
    <Link href={href}>{action}</Link>
  </p>
);

export const AuthLink: FC<{ href: string; children: ReactNode }> = ({
  href,
  children,
}) => (
  <Link href={href} className="tdw-auth-link">
    {children}
  </Link>
);

/* Terms / Privacy line. Links come from /admin → Branding (public instance
   settings), with NEXT_PUBLIC_TERMS_URL / NEXT_PUBLIC_PRIVACY_URL as fallback;
   the sentence only renders when at least one is configured. */
export const AuthLegal: FC = () => {
  const t = useT();
  const brand = useBrandLinks();
  const env = useVariables();
  const termsUrl = brand.termsUrl || env.termsUrl;
  const privacyUrl = brand.privacyUrl || env.privacyUrl;
  if (!termsUrl && !privacyUrl) {
    return null;
  }
  const terms = termsUrl ? (
    <a href={termsUrl} target="_blank" rel="noopener noreferrer nofollow">
      {t('terms_of_service', 'Terms of Service')}
    </a>
  ) : null;
  const privacy = privacyUrl ? (
    <a href={privacyUrl} target="_blank" rel="noopener noreferrer nofollow">
      {t('privacy_policy', 'Privacy Policy')}
    </a>
  ) : null;
  return (
    <p className="tdw-auth-legal">
      {t('by_registering_you_agree_to_our', 'By registering you agree to our')}{' '}
      {terms}
      {terms && privacy ? <> {t('and', 'and')} </> : null}
      {privacy}.
    </p>
  );
};

/* Language menu and appearance, top of the form pane.
   Same cookies as the in-app LanguageComponent / ModeComponent. The auth layout
   paints theme and direction on the `.tdw-auth` shell from those cookies; these
   controls keep the shell, <body> (theme, for portalled modals) and <html>
   (direction) in sync when they change. */
const shell = () => document.querySelector<HTMLElement>('.tdw-auth');

// a language's name in itself ("العربية", "Français"); `ka_ge` isn't BCP 47
const nativeLanguageName = (code: string) => {
  const locale = code.replace('_', '-');
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) || code;
  } catch (e) {
    return code;
  }
};

export const AuthControls: FC = () => {
  const t = useT();
  const { language } = useVariables();
  const [, setLanguage] = useCookie(cookieName, language || fallbackLng);
  const [, setMode] = useCookie('mode', 'dark');
  // both start from what the server rendered (cookie values), so hydration matches
  const [current, setCurrent] = useState(language || fallbackLng);
  const [mode, setModeState] = useState<'light' | 'dark'>('dark');

  const applyMode = useCallback((next: 'light' | 'dark') => {
    for (const el of [document.body, shell()]) {
      el?.classList.remove('dark', 'light');
      el?.classList.add(next);
    }
    setModeState(next);
  }, []);

  useEffect(() => {
    applyMode(shell()?.classList.contains('light') ? 'light' : 'dark');
  }, []);

  const changeLanguage = useCallback((lng: string) => {
    setLanguage(lng);
    setCurrent(lng);
    i18next.changeLanguage(lng);
    const dir = lng === 'ar' ? 'rtl' : 'ltr';
    for (const el of [document.documentElement, shell()]) {
      el?.setAttribute('dir', dir);
      el?.setAttribute('lang', lng);
    }
  }, []);

  const toggleMode = useCallback(() => {
    const next = mode === 'light' ? 'dark' : 'light';
    modeEmitter.emit('mode', next);
    setMode(next);
    applyMode(next);
  }, [mode]);

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="tdw-auth-controls">
      <div className="tdw-auth-lang" ref={menuRef}>
        <button
          type="button"
          className="tdw-auth-control"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          title={t('change_language', 'Change Language')}
        >
          <Icon name="languages" size={16} />
          <span lang={current.replace('_', '-')}>{nativeLanguageName(current)}</span>
          <Icon name="chevron-down" size={14} />
        </button>
        {open && (
          <div className="tdw-auth-lang-menu" role="listbox" aria-label={t('change_language', 'Change Language')}>
            {languages.map((lng) => (
              <button
                key={lng}
                type="button"
                role="option"
                aria-selected={lng === current}
                className="tdw-auth-lang-option"
                onClick={() => {
                  changeLanguage(lng);
                  setOpen(false);
                }}
              >
                <span lang={lng.replace('_', '-')}>{nativeLanguageName(lng)}</span>
                {lng === current && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        className="tdw-auth-control is-icon"
        onClick={toggleMode}
        aria-label={t('tdw_auth_toggle_theme', 'Switch light or dark appearance')}
      >
        <Icon name={mode === 'light' ? 'moon' : 'sun'} size={16} />
      </button>
    </div>
  );
};
