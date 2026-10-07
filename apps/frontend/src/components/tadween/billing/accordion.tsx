'use client';

// Accordion from the design system (layout.tsx): height animates on grid rows
// with the spring curve, the chevron rotates. Styles are the kit's .pz-acc*
// and .pz-collapse rules.
import React, { FC, ReactNode, useId, useState } from 'react';
import { cx, Icon } from '@gitroom/frontend/components/tadween/ui';

export interface AccordionItem {
  title: ReactNode;
  content: ReactNode;
}

export const Accordion: FC<{
  items: AccordionItem[];
  multiple?: boolean;
  defaultOpen?: number[];
}> = ({ items, multiple = false, defaultOpen = [] }) => {
  const [open, setOpen] = useState<number[]>(defaultOpen);
  const id = useId();
  const toggle = (i: number) =>
    setOpen(
      open.includes(i)
        ? open.filter((x) => x !== i)
        : multiple
        ? [...open, i]
        : [i]
    );
  return (
    <div className="pz-acc">
      {items.map((it, i) => {
        const on = open.includes(i);
        return (
          <div key={i} className={cx('pz-acc-item', on && 'is-open')}>
            <h3 className="pz-acc-h">
              <button
                type="button"
                className="pz-acc-btn"
                aria-expanded={on}
                aria-controls={`${id}-${i}`}
                onClick={() => toggle(i)}
              >
                <span>{it.title}</span>
                <Icon name="chevron-down" className="pz-acc-chev" />
              </button>
            </h3>
            <div
              id={`${id}-${i}`}
              role="region"
              className={cx('pz-collapse', on && 'is-open')}
            >
              <div className="pz-collapse-inner">
                <div className="pz-acc-body">{it.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
