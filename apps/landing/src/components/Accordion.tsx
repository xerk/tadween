'use client';

import { useId, useState } from 'react';
import { Icon, cx } from './Icon';

/** Accordion from the design system: one panel open at a time, rows spring open. */
export function Accordion({ items, defaultOpen = [0] }: { items: { title: string; content: string }[]; defaultOpen?: number[] }) {
  const [open, setOpen] = useState<number[]>(defaultOpen);
  const id = useId();
  const toggle = (i: number) => setOpen(open.includes(i) ? [] : [i]);
  return (
    <div className="pz-acc">
      {items.map((it, i) => {
        const on = open.includes(i);
        return (
          <div key={it.title} className={cx('pz-acc-item', on && 'is-open')}>
            <h3 className="pz-acc-h">
              <button type="button" id={`${id}-b${i}`} className="pz-acc-btn" aria-expanded={on} aria-controls={`${id}-p${i}`} onClick={() => toggle(i)}>
                <span>{it.title}</span>
                <Icon name="chevron-down" className="pz-acc-chev" />
              </button>
            </h3>
            <div id={`${id}-p${i}`} role="region" aria-labelledby={`${id}-b${i}`} className={cx('pz-collapse', on && 'is-open')} inert={!on}>
              <div className="pz-collapse-inner">
                <div className="pz-acc-body">{it.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
