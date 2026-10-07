'use client';

import {
  DetailedHTMLProps,
  FC,
  forwardRef,
  Fragment,
  KeyboardEvent as ReactKeyboardEvent,
  SelectHTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';
import { RegisterOptions } from 'react-hook-form/dist/types/validator';
import { TranslatedLabel } from '../translation/translated-label';

// Tadween: the native <select> stays in the DOM (visually hidden) as the
// source of truth, so react-hook-form registration, controlled `value` /
// `onChange` and `<option>` children keep working unchanged at every call
// site. A popover listbox, portalled to <body> so cards can't clip it, drives it.

type Opt = { value: string; label: string; disabled: boolean; group?: string };

const readOptions = (el: HTMLSelectElement | null): Opt[] =>
  el
    ? Array.from(el.options).map((o) => ({
        value: o.value,
        label: o.text,
        disabled: o.disabled,
        group:
          o.parentElement instanceof HTMLOptGroupElement
            ? o.parentElement.label
            : undefined,
      }))
    : [];

const nativeValue = Object.getOwnPropertyDescriptor(
  typeof window !== 'undefined' ? HTMLSelectElement.prototype : {},
  'value'
);

const assignRef = (r: any, el: HTMLSelectElement | null) => {
  if (typeof r === 'function') r(el);
  else if (r) r.current = el;
};

export const Select: FC<
  DetailedHTMLProps<
    SelectHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  > & {
    error?: any;
    extraForm?: RegisterOptions<any>;
    disableForm?: boolean;
    label: string;
    name: string;
    hideErrors?: boolean;
    translationKey?: string;
    translationParams?: Record<string, string | number>;
  }
> = forwardRef((props, ref) => {
  const {
    label,
    className,
    hideErrors,
    disableForm,
    error,
    extraForm,
    translationKey,
    translationParams,
    ...rest
  } = props;
  const form = useFormContext();
  const err = useMemo(() => {
    if (error) return error;
    if (!form || !form.formState.errors[props?.name!]) return;
    return form?.formState?.errors?.[props?.name!]?.message! as string;
  }, [form?.formState?.errors?.[props?.name!]?.message, error]);

  const registered = disableForm ? undefined : form.register(props.name, extraForm);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const [options, setOptions] = useState<Opt[]>([]);
  const [current, setCurrent] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean }>();

  const sync = useCallback(() => {
    const el = selectRef.current;
    if (!el) return;
    const next = readOptions(el);
    setOptions((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next
    );
    setCurrent(nativeValue?.get ? nativeValue.get.call(el) : el.value);
  }, []);

  // Re-read after every render: covers controlled `value` and changed <option>s.
  useLayoutEffect(sync);

  const setSelect = useCallback(
    (el: HTMLSelectElement | null) => {
      selectRef.current = el;
      if (el && nativeValue?.set && !(el as any).__tdw) {
        (el as any).__tdw = true;
        // react-hook-form's setValue / reset write `el.value` without an event.
        Object.defineProperty(el, 'value', {
          configurable: true,
          get: () => nativeValue.get!.call(el),
          set: (v) => {
            nativeValue.set!.call(el, v);
            sync();
          },
        });
        // Validation focuses the registered element: send it to the trigger.
        el.focus = () => triggerRef.current?.focus();
      }
      assignRef(ref, el);
      registered?.ref(el);
    },
    [ref, registered?.ref, sync]
  );

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom;
    const up = below < 240 && r.top > below;
    setPos({ left: r.left, width: r.width, up, top: up ? r.top - 6 : r.bottom + 6 });
  }, []);

  const show = useCallback(() => {
    sync();
    place();
    const opts = readOptions(selectRef.current);
    setActive(Math.max(0, opts.findIndex((o) => o.value === selectRef.current?.value)));
    setOpen(true);
  }, [sync, place]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const choose = useCallback(
    (o?: Opt) => {
      const el = selectRef.current;
      if (!el || !o || o.disabled) return;
      if (o.value !== el.value) {
        nativeValue?.set ? nativeValue.set.call(el, o.value) : (el.value = o.value);
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sync();
      close();
    },
    [sync, close]
  );

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!listRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    window.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, close, place]);

  useEffect(() => {
    if (open) listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const move = (from: number, step: number) => {
    for (let i = 1; i <= options.length; i++) {
      const n = (from + step * i + options.length * i) % options.length;
      if (!options[n].disabled) return n;
    }
    return from;
  };

  const typed = useRef({ text: '', at: 0 });
  const onKey = (e: ReactKeyboardEvent) => {
    if (rest.disabled) return;
    const k = e.key;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (k === 'Escape' || k === 'Tab') {
      if (k === 'Escape') e.preventDefault();
      return close(k === 'Escape');
    }
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      return setActive((a) => move(a, k === 'ArrowDown' ? 1 : -1));
    }
    if (k === 'Home' || k === 'End') {
      e.preventDefault();
      return setActive(move(k === 'Home' ? -1 : options.length, k === 'Home' ? 1 : -1));
    }
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      return choose(options[active]);
    }
    if (k.length === 1) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at > 600 ? '' : typed.current.text) + k.toLowerCase(), at: now };
      const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
      if (hit > -1) setActive(hit);
    }
  };

  const selected = options.find((o) => o.value === current);
  const isPlaceholder = !selected || selected.value === '';

  return (
    <div className={clsx('tdw-field flex flex-col', label ? 'gap-[6px]' : '')}>
      <div className="tdw-field-label text-[14px]">
        <TranslatedLabel
          label={label}
          translationKey={translationKey}
          translationParams={translationParams}
        />
      </div>
      <div className="tdw-select">
        <select
          {...(registered || {})}
          {...rest}
          ref={setSelect}
          tabIndex={-1}
          aria-hidden="true"
          className="tdw-select-native"
        />
        <button
          type="button"
          ref={triggerRef}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-invalid={!!err || undefined}
          aria-label={label || props.name}
          disabled={rest.disabled}
          data-state={open ? 'open' : 'closed'}
          className={clsx(
            'tdw-select-trigger h-[42px] bg-newBgColorInner px-[16px] outline-none border-newTableBorder border rounded-[8px] text-[14px]',
            className
          )}
          onClick={() => (open ? close() : show())}
          onKeyDown={onKey}
        >
          <span className={clsx('tdw-select-value', isPlaceholder && 'is-placeholder')}>
            {selected?.label || ' '}
          </span>
          <svg className="tdw-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open && pos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              className={clsx('tdw-listbox', pos.up && 'is-up')}
              style={{
                left: pos.left,
                minWidth: pos.width,
                ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {options.map((o, i) => (
                <Fragment key={`${o.group || ''}:${o.value}:${i}`}>
                  {o.group && o.group !== options[i - 1]?.group ? (
                    <div className="tdw-listbox-group" role="presentation">{o.group}</div>
                  ) : null}
                  <div
                    role="option"
                    aria-selected={o.value === current}
                    aria-disabled={o.disabled || undefined}
                    data-active={i === active}
                    className="tdw-option"
                    onPointerEnter={() => !o.disabled && setActive(i)}
                    onClick={() => choose(o)}
                  >
                    <span className="tdw-option-label">{o.label || ' '}</span>
                    {o.value === current ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="tdw-option-check">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </div>
                </Fragment>
              ))}
            </div>,
            document.body
          )
        : null}
      {!hideErrors && (
        <div className="tdw-field-error text-red-400 text-[12px]">
          {err || <>&nbsp;</>}
        </div>
      )}
    </div>
  );
});
