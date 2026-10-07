import { ICONS, type IconName } from './icons';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

/** Lucide icon, stroke 1.75, inherits currentColor. Decorative unless a label is given. */
export function Icon({ name, size = 16, className, label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      className={cx('pz-icon', className)}
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
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
