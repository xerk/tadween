'use client';

// Tadween UI kit: primitives. Ported from the design system's primitives.tsx;
// class names match components/bundle.css (see tadween-ui.scss). Render inside
// a `.tdw-ui` element (TadweenScope) so the styles apply.
import React, {
  ButtonHTMLAttributes,
  FC,
  ReactNode,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { ICONS } from './icons';

export const cx = (...a: unknown[]) => a.filter(Boolean).join(' ');

export type IconName = keyof typeof ICONS | string;

/* Icon — Lucide, stroke 1.75, inherits currentColor */
export const Icon: FC<{
  name: IconName;
  size?: number;
  className?: string;
  label?: string;
}> = ({ name, size = 16, className, label }) => (
  <svg
    className={cx('pz-icon', name === 'loader-circle' && 'pz-spin', className)}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={label ? undefined : true}
    role={label ? 'img' : undefined}
    aria-label={label}
    dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }}
  />
);

/* Scope wrapper: everything from the kit must sit inside one of these */
export const TadweenScope: FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cx('tdw-ui', className)}>{children}</div>
);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'smart';

export interface TdwButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconEnd?: IconName;
  loading?: boolean;
  loadingLabel?: string;
}

/* Button — press feedback on pointer-down; loading keeps width and swaps the label */
export const Button: FC<TdwButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  iconEnd,
  loading,
  loadingLabel,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    {...rest}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cx(
      'pz-btn',
      `pz-btn-${variant}`,
      `pz-btn-${size}`,
      loading && 'is-loading',
      className
    )}
  >
    {loading ? (
      <Icon name="loader-circle" />
    ) : icon ? (
      <Icon name={icon} />
    ) : null}
    {loading && loadingLabel ? loadingLabel : children}
    {iconEnd && !loading ? <Icon name={iconEnd} /> : null}
  </button>
);

/* LinkButton — navigation styled as a button (never a <button> inside an <a>) */
export const LinkButton: FC<{
  href: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconEnd?: IconName;
  className?: string;
  children: ReactNode;
}> = ({ href, variant = 'secondary', size = 'md', icon, iconEnd, className, children }) => (
  <Link
    href={href}
    className={cx('pz-btn', `pz-btn-${variant}`, `pz-btn-${size}`, 'no-underline', className)}
  >
    {icon ? <Icon name={icon} /> : null}
    {children}
    {iconEnd ? <Icon name={iconEnd} /> : null}
  </Link>
);

export const IconButton: FC<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: IconName;
    label: string;
    variant?: ButtonVariant;
    size?: 'sm' | 'md';
  }
> = ({ icon, label, variant = 'ghost', size = 'md', className, ...rest }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    {...rest}
    className={cx(
      'pz-iconbtn',
      `pz-btn-${variant}`,
      `pz-iconbtn-${size}`,
      className
    )}
  >
    <Icon name={icon} size={size === 'sm' ? 14 : 16} />
  </button>
);

/* Pill — status word with an icon; colour is never the only signal */
export const Pill: FC<{
  tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'brand';
  icon?: IconName;
  children: ReactNode;
}> = ({ tone = 'neutral', icon, children }) => (
  <span
    className={cx(
      'tdw-pill',
      tone === 'ok' && 'tdw-pill-ok',
      tone === 'warn' && 'tdw-pill-warn',
      tone === 'bad' && 'tdw-pill-bad',
      tone === 'brand' && 'tdw-pill-brand'
    )}
  >
    {icon ? <Icon name={icon} size={12} /> : null}
    {children}
  </span>
);

/* Avatar — initials on a soft Nile ground, or a picture */
export const Avatar: FC<{
  name?: string;
  src?: string;
  size?: number;
  shape?: 'circle' | 'square';
  className?: string;
}> = ({ name = '', src, size = 40, shape = 'circle', className }) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span
      className={cx(
        'pz-avatar',
        shape === 'square' && 'pz-avatar-square',
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{initials}</span>}
    </span>
  );
};

/* Spinner — a Nile arc; reduced motion pulses instead */
export const Spinner: FC<{ size?: number; label?: string }> = ({
  size = 20,
  label = 'Loading',
}) => (
  <span
    className="pz-spinner"
    role="status"
    aria-label={label}
    style={{
      width: size,
      height: size,
      borderWidth: Math.max(2, Math.round(size / 10)),
    }}
  />
);

/* Skeleton — shimmer block; compose to the shape of what is loading */
export const Skeleton: FC<{
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
}> = ({ width = '100%', height = 14, radius, className }) => (
  <span
    className={cx('pz-skeleton', className)}
    style={{ width, height, borderRadius: radius }}
    aria-hidden="true"
  />
);

/* Tooltip — appears after 500ms hover or on focus, scales from its trigger */
export const Tooltip: FC<{
  label: string;
  side?: 'top' | 'bottom';
  children: ReactNode;
}> = ({ label, side = 'top', children }) => {
  const [open, setOpen] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = (delay: number) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(t.current);
    setOpen(false);
  };
  return (
    <span
      className="pz-tip-wrap"
      onPointerEnter={() => show(500)}
      onPointerLeave={hide}
      onFocus={() => show(0)}
      onBlur={hide}
    >
      {children}
      <span
        role="tooltip"
        className={cx('pz-tip', `pz-tip-${side}`, open && 'is-open')}
      >
        {label}
      </span>
    </span>
  );
};
