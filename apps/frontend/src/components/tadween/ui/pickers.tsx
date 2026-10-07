'use client';

// Tadween UI kit: Popover and Select (design system pickers.tsx). Never use a
// native <select> in Tadween screens.
import React, {
  FC,
  ReactNode,
  RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cx, Icon, IconName } from './primitives';
import { usePresence } from './overlays';
import { useControlled } from './forms';

/* Popover — anchored to its trigger, flips above when there's no room */
export const Popover: FC<{
  open: boolean;
  onClose: () => void;
  anchor: RefObject<HTMLElement>;
  children: ReactNode;
  align?: 'start' | 'end';
  width?: number;
  className?: string;
}> = ({ open, onClose, anchor, children, align = 'start', width, className }) => {
  const { mounted, state } = usePresence(open, 180);
  const ref = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);
  const [flip, setFlip] = useState(false);
  useLayoutEffect(() => {
    if (!open || !anchor?.current || !ref.current) return;
    const a = anchor.current.getBoundingClientRect();
    const h = ref.current.offsetHeight;
    const w = ref.current.offsetWidth;
    setUp(a.bottom + h + 12 > window.innerHeight && a.top - h - 12 > 0);
    setFlip(
      align === 'start' ? a.left + w > window.innerWidth - 8 : a.right - w < 8
    );
  }, [open, mounted]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        anchor?.current?.focus?.();
      }
    };
    const c = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !anchor?.current?.contains(target)
      )
        onClose();
    };
    document.addEventListener('keydown', k, true);
    document.addEventListener('pointerdown', c);
    return () => {
      document.removeEventListener('keydown', k, true);
      document.removeEventListener('pointerdown', c);
    };
  }, [open]);
  if (!mounted) return null;
  const side = flip ? (align === 'start' ? 'end' : 'start') : align;
  return (
    <div
      ref={ref}
      className={cx('pz-pop', `pz-pop-${side}`, up && 'is-up', className)}
      data-state={state}
      style={{ width }}
    >
      {children}
    </div>
  );
};

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  disabled?: boolean;
}

/* Select — listbox in a popover: arrows, Home/End, Enter, Escape, typeahead */
export function Select<T extends string | number = string>({
  label,
  hint,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Choose…',
  size = 'md',
  icon,
  className,
  'aria-label': ariaLabel,
  width,
  disabled,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  options: SelectOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (v: T) => void;
  placeholder?: string;
  size?: 'sm' | 'md';
  icon?: IconName;
  className?: string;
  'aria-label'?: string;
  width?: number | string;
  disabled?: boolean;
}) {
  const [v, set] = useControlled<T | undefined>(value, defaultValue, (x) =>
    onChange && x !== undefined ? onChange(x) : undefined
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ s: '', t: 0 });
  const id = useId();
  const cur = options.find((o) => String(o.value) === String(v));
  const openList = () => {
    if (disabled) return;
    setActive(
      Math.max(
        0,
        options.findIndex((o) => String(o.value) === String(v))
      )
    );
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => list.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => {
    list.current
      ?.querySelector(`[data-i="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  const choose = (o: SelectOption<T>) => {
    if (o.disabled) return;
    set(o.value);
    setOpen(false);
    btn.current?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    const n = options.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((active + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((active - 1 + n) % n);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(n - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1) {
      const now = Date.now();
      typed.current = {
        s:
          (now - typed.current.t < 600 ? typed.current.s : '') +
          e.key.toLowerCase(),
        t: now,
      };
      const i = options.findIndex((o) =>
        String(typeof o.label === 'string' ? o.label : o.value)
          .toLowerCase()
          .startsWith(typed.current.s)
      );
      if (i >= 0) setActive(i);
    }
  };
  return (
    <div className={cx('pz-field', className)} style={{ width }}>
      {label ? (
        <label
          className="pz-label"
          id={id + '-l'}
          onClick={() => btn.current?.focus()}
        >
          {label}
        </label>
      ) : null}
      <div className="pz-anchor">
        <button
          ref={btn}
          type="button"
          disabled={disabled}
          className={cx(
            'pz-input',
            'pz-trigger',
            `pz-trigger-${size}`,
            open && 'is-open'
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={label ? id + '-l ' + id + '-v' : undefined}
          aria-label={label ? undefined : ariaLabel}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={(e) => {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
              e.preventDefault();
              openList();
            }
          }}
        >
          {icon ? (
            <Icon name={icon} className="pz-trigger-icon" />
          ) : cur?.icon ? (
            <Icon name={cur.icon} className="pz-trigger-icon" />
          ) : null}
          <span
            id={id + '-v'}
            className={cx('pz-trigger-value', !cur && 'is-placeholder')}
          >
            {cur ? cur.label : placeholder}
          </span>
          <Icon name="chevron-down" className="pz-trigger-chev" />
        </button>
        <Popover open={open} onClose={() => setOpen(false)} anchor={btn}>
          <div
            ref={list}
            role="listbox"
            tabIndex={-1}
            className="pz-listbox"
            aria-activedescendant={`${id}-o${active}`}
            onKeyDown={onKey}
          >
            {options.map((o, i) => (
              <div
                key={String(o.value)}
                id={`${id}-o${i}`}
                data-i={i}
                role="option"
                aria-selected={String(o.value) === String(v)}
                aria-disabled={o.disabled || undefined}
                className={cx(
                  'pz-option',
                  i === active && 'is-active',
                  o.disabled && 'is-disabled'
                )}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(o)}
              >
                {o.icon ? <Icon name={o.icon} /> : null}
                <span className="pz-option-text">
                  <span>{o.label}</span>
                  {o.description ? (
                    <span className="pz-option-desc">{o.description}</span>
                  ) : null}
                </span>
                {String(o.value) === String(v) ? (
                  <Icon name="check" className="pz-option-check" />
                ) : null}
              </div>
            ))}
          </div>
        </Popover>
      </div>
      {hint ? <p className="pz-note">{hint}</p> : null}
    </div>
  );
}
