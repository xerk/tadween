'use client';

// Loading shape for Billing (replaces Postiz's purple spinner): the centred
// headline, the period control and the plan cards.
import React, { FC } from 'react';
import {
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

export const BillingSkeleton: FC = () => (
  <TadweenScope className="tdw-billing-page">
    <div className="tdw-plans" aria-busy="true">
      <div className="tdw-plans-head">
        <Skeleton width={260} height={34} />
        <Skeleton width={360} height={14} />
        <Skeleton width={220} height={36} radius={10} />
      </div>
      <div className="tdw-plans-grid" data-count={2}>
        {Array.from({ length: 2 }).map((_, i) => (
          <section key={i} className="tdw-plan">
            <Skeleton width="40%" height={24} />
            <Skeleton width="70%" />
            <Skeleton width="50%" height={44} className="mt-[8px]" />
            <Skeleton height={44} radius={12} className="mt-[8px]" />
            {Array.from({ length: 5 }).map((__, j) => (
              <Skeleton key={j} width={`${85 - j * 8}%`} />
            ))}
          </section>
        ))}
      </div>
    </div>
  </TadweenScope>
);
