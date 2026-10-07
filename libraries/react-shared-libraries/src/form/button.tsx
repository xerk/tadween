'use client';

import {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  FC,
  useEffect,
  useRef,
  useState,
} from 'react';
import { clsx } from 'clsx';
const ReactLoading = ({ width = 20, height = 20 }: { type?: string; color?: string; width?: number; height?: number }) => {
  const size = Math.min(width, height);
  return (
    <span
      className="tdw-spinner"
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, Math.round(size / 8)),
      }}
    />
  );
};

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

// Tadween: call sites colour Postiz buttons with Tailwind classes (`!bg-red-800`,
// `bg-transparent`, `rounded-[4px]`…). Those become a Tadween variant (styles in
// app/tadween/consistency.scss) and are dropped; every other class passes through.
const variantTokens: Array<[RegExp, ButtonVariant | null]> = [
  [/^!?bg-red-\d+$/, 'destructive'],
  [/^!?bg-blue-\d+$/, 'primary'],
  [/^!?bg-secondary$/, 'secondary'],
  [/^!?bg-transparent$/, 'ghost'],
  [/^!?rounded-\[4px\]$/, null],
];

const readVariant = (className = '', secondary?: boolean) => {
  let variant = (secondary ? 'secondary' : 'primary') as ButtonVariant;
  const rest = className.split(/\s+/).filter((token) => {
    const hit = variantTokens.find(([re]) => re.test(token));
    if (!hit) {
      return true;
    }
    if (hit[1]) {
      variant = hit[1];
    }
    return false;
  });
  if (rest.includes('is-danger')) {
    variant = 'destructive';
  }
  // a transparent button with a border is an outlined (secondary) one
  if (variant === 'ghost' && rest.includes('border')) {
    variant = 'secondary';
  }
  return { variant, className: rest.join(' ') };
};

export const Button: FC<
  DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > & {
    secondary?: boolean;
    loading?: boolean;
    innerClassName?: string;
  }
> = ({ children, loading, innerClassName, secondary, ...props }) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    setHeight(ref.current?.offsetHeight || 40);
  }, []);
  const { variant, className } = readVariant(props?.className, secondary);
  return (
    <button
      {...props}
      type={props.type || 'button'}
      ref={ref}
      aria-busy={loading || undefined}
      className={clsx(
        (props.disabled || loading) && 'opacity-50 pointer-events-none',
        'tdw-btn',
        `tdw-btn-${variant}`,
        variant === 'primary' && 'bg-forth text-white',
        variant === 'secondary' && 'bg-third',
        loading && 'is-loading',
        'cursor-pointer items-center justify-center flex relative',
        className
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ReactLoading
            type="spin"
            width={height! / 2}
            height={height! / 2}
          />
        </div>
      )}
      <div
        className={clsx(
          innerClassName,
          'flex-1 items-center justify-center flex',
          loading && 'invisible'
        )}
      >
        {children}
      </div>
    </button>
  );
};
