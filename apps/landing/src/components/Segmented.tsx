'use client';

import type { ReactNode } from 'react';

/** The design system's segmented control: a sliding thumb behind the chosen option. */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="pz-seg" role="group" aria-label={label} style={{ ['--n' as string]: options.length, ['--i' as string]: i }}>
      <span className="pz-seg-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" className="pz-seg-item" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
