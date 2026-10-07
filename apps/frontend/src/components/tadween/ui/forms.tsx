'use client';

// Tadween UI kit: form controls (design system forms.tsx).
import React, {
  FC,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  useId,
  useState,
} from 'react';
import { cx, Icon, IconName } from './primitives';

export function useControlled<T>(
  value: T | undefined,
  initial: T,
  onChange?: (v: T) => void
): [T, (v: T) => void] {
  const [inner, setInner] = useState<T>(initial);
  const controlled = value !== undefined;
  return [
    controlled ? (value as T) : inner,
    (v: T) => {
      if (!controlled) setInner(v);
      onChange && onChange(v);
    },
  ];
}

export const Field: FC<{
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}> = ({ id, label, hint, error, children, className }) => {
  const note = error || hint;
  return (
    <div className={cx('pz-field', error && 'pz-field-error', className)}>
      {label ? (
        <label htmlFor={id} className="pz-label">
          {label}
        </label>
      ) : null}
      {children}
      {note ? (
        <p id={id + '-note'} className="pz-note">
          {error ? <Icon name="triangle-alert" size={12} /> : null}
          {note}
        </p>
      ) : null}
    </div>
  );
};

export const Input: FC<
  Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    label?: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
    icon?: IconName;
  }
> = ({ label, hint, error, className, icon, ...rest }) => {
  const gen = useId();
  const id = rest.id || gen;
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <span className={cx('pz-input-wrap', icon && 'has-icon')}>
        {icon ? <Icon name={icon} /> : null}
        <input
          {...rest}
          id={id}
          className="pz-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? id + '-note' : undefined}
        />
      </span>
    </Field>
  );
};

export const Textarea: FC<
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
  }
> = ({ label, hint, error, className, rows = 4, ...rest }) => {
  const gen = useId();
  const id = rest.id || gen;
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        {...rest}
        rows={rows}
        id={id}
        className="pz-input pz-textarea"
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? id + '-note' : undefined}
      />
    </Field>
  );
};

export const Checkbox: FC<{
  label: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}> = ({ label, description, checked, defaultChecked, onChange, disabled }) => {
  const [on, set] = useControlled<boolean>(checked, !!defaultChecked, onChange);
  return (
    <label className={cx('pz-check-row', disabled && 'is-disabled')}>
      <input
        type="checkbox"
        className="pz-sr"
        checked={on}
        disabled={disabled}
        onChange={(e) => set(e.target.checked)}
      />
      <span className="pz-check" aria-hidden="true">
        <Icon name="check" size={12} />
      </span>
      <span className="pz-check-text">
        <span>{label}</span>
        {description ? (
          <span className="pz-check-desc">{description}</span>
        ) : null}
      </span>
    </label>
  );
};

export const Switch: FC<{
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
}> = ({
  checked,
  defaultChecked,
  onChange,
  label,
  description,
  disabled,
  'aria-label': ariaLabel,
}) => {
  const [on, set] = useControlled<boolean>(checked, !!defaultChecked, onChange);
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      className="pz-switch"
      onClick={() => set(!on)}
    >
      <span className="pz-switch-thumb" />
    </button>
  );
  if (!label) {
    return button;
  }
  return (
    <label className={cx('pz-switch-row', disabled && 'is-disabled')}>
      {button}
      <span className="pz-check-text">
        <span>{label}</span>
        {description ? (
          <span className="pz-check-desc">{description}</span>
        ) : null}
      </span>
    </label>
  );
};

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: IconName;
}

/* SegmentedControl — one thumb slides between options on the spring curve */
export function SegmentedControl<T extends string>({
  options,
  value,
  defaultValue,
  onChange,
  label,
  size = 'md',
}: {
  options: SegmentOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  const [v, set] = useControlled<T>(
    value,
    defaultValue ?? options[0]?.value,
    onChange
  );
  const i = Math.max(
    0,
    options.findIndex((o) => o.value === v)
  );
  return (
    <div
      className={cx('pz-seg', `pz-seg-${size}`)}
      role="tablist"
      aria-label={label}
      style={{ ['--n' as string]: options.length, ['--i' as string]: i }}
    >
      <span className="pz-seg-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === v}
          className="pz-seg-item"
          onClick={() => set(o.value)}
        >
          {o.icon ? <Icon name={o.icon} size={14} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}
