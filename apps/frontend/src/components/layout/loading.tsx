'use client';

import { FC } from 'react';

// Tadween: one quiet ring spinner everywhere (styles: app/tadween/consistency.scss).
// A white spinner sits on a filled button, so it takes the text colour; any other
// colour (Postiz's purple) becomes the Nile accent.
const Spinner: FC<{
  type?: string;
  color?: string;
  width?: number;
  height?: number;
}> = ({ color, width = 100, height = 100 }) => {
  const size = Math.min(width, height, 48);
  const onFill = !!color && /^#fff(fff)?$/i.test(color);

  return (
    <span
      className="tdw-spinner"
      role="status"
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, Math.round(size / 10)),
        ...(onFill ? {} : { color: 'var(--tdw-primary)' }),
      }}
    />
  );
};

export { Spinner as default };

// Page and panel loading: a small spinner, not a 100px wheel
export const LoadingComponent: FC<{
  width?: number;
  height?: number;
}> = (props) => {
  const size = Math.min(props.width || 28, props.height || 28, 40);
  return (
    <div className="tdw-loading flex-1 flex justify-center pt-[96px]">
      <Spinner width={size} height={size} />
    </div>
  );
};
