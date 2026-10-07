'use client';

import { FC, useCallback } from 'react';
export const Slider: FC<{
  value: 'on' | 'off';
  fill?: boolean;
  onChange: (value: 'on' | 'off') => void;
}> = (props) => {
  const { value, onChange, fill } = props;
  const change = useCallback(() => {
    onChange(value === 'on' ? 'off' : 'on');
  }, [value]);
  return (
    <div
      role="switch"
      aria-checked={value === 'on'}
      data-fill={fill ? 'true' : undefined}
      className="tdw-switch cursor-pointer"
      onClick={change}
    >
      <div className="tdw-switch-thumb" />
    </div>
  );
};
