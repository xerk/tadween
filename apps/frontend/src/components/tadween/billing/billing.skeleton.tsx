'use client';

// Loading shape for Billing (replaces Postiz's purple spinner): the title and
// period switch, the plan cards side by side, then the payment method.
import React, { FC } from 'react';
import {
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

export const BillingSkeleton: FC = () => (
  <TadweenScope className="tdw-billing-page">
    <div className="tdw-billing-head" aria-busy="true">
      <div className="grid gap-[8px]">
        <Skeleton width={260} height={30} />
        <Skeleton width={320} />
      </div>
      <Skeleton width={220} height={36} radius={10} />
    </div>
    <div className="tdw-plan-row" data-count={3}>
      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="tdw-plan">
          <Skeleton width="40%" height={24} />
          <Skeleton width="70%" />
          <Skeleton width="50%" height={40} className="mt-[8px]" />
          <Skeleton height={44} radius={10} className="mt-[8px]" />
          {Array.from({ length: 4 }).map((__, j) => (
            <Skeleton key={j} width={`${80 - j * 10}%`} />
          ))}
        </section>
      ))}
    </div>
    <Skeleton height={88} radius={20} />
  </TadweenScope>
);
