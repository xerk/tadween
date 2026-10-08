'use client';

import { FC, forwardRef, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';
export const Checkbox = forwardRef<
  null,
  {
    checked?: boolean;
    disableForm?: boolean;
    name?: string;
    className?: string;
    label?: string;
    onChange?: (event: {
      target: {
        name?: string;
        value: boolean;
      };
    }) => void;
    variant?: 'default' | 'hollow';
  }
>((props, ref: any) => {
  const { checked, className, label, disableForm, variant } = props;
  const form = useFormContext();
  const register = disableForm ? {} : form.register(props.name!);
  const watch = disableForm ? false : form.watch(props.name!);
  const val = watch || checked;

  const changeStatus = useCallback(() => {
    props?.onChange?.({
      target: {
        name: props.name!,
        value: !val,
      },
    });
    if (!disableForm) {
      // @ts-ignore
      register?.onChange?.({
        target: {
          name: props.name!,
          value: !val,
        },
      });
    }
  }, [val]);
  return (
    <div className="tdw-check-row flex gap-[10px]">
      <div
        ref={ref}
        {...disableForm ? {} : form.register(props.name!)}
        onClick={changeStatus}
        role="checkbox"
        aria-checked={!!val}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            changeStatus();
          }
        }}
        data-variant={variant || 'default'}
        className={clsx(
          'tdw-checkbox cursor-pointer select-none w-[20px] h-[20px] justify-center items-center flex',
          className
        )}
      >
        {val && (
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        )}
      </div>
      {!!label && <div>{label}</div>}
    </div>
  );
});
