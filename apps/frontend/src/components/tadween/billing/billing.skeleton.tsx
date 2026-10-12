'use client';

// Loading shape for Billing (replaces Postiz's purple spinner): the plan
// cards side by side, then the summary beside the payment column.
import React, { FC } from 'react';
import {
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

export const BillingSkeleton: FC = () => (
  <TadweenScope className="tdw-billing-page">
    <div className="tdw-billing-plans" aria-busy="true">
      <div className="tdw-picker-head">
        <Skeleton width={160} height={28} />
        <Skeleton width={220} height={36} radius={10} />
      </div>
      <div className="tdw-picker-grid" data-count={3}>
        {Array.from({ length: 3 }).map((_, i) => (
          <section key={i} className="tdw-plan-pick is-disabled">
            <Skeleton width="40%" height={24} />
            <Skeleton width="70%" />
            <Skeleton width="50%" height={40} className="mt-[8px]" />
            {Array.from({ length: 3 }).map((__, j) => (
              <Skeleton key={j} width={`${80 - j * 10}%`} />
            ))}
          </section>
        ))}
      </div>
      <div className="tdw-pay">
        <section className="tdw-order">
          <Skeleton width="30%" height={24} />
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} width={`${85 - j * 8}%`} />
          ))}
        </section>
        <section className="tdw-checkout">
          <Skeleton width="40%" height={24} />
          <Skeleton height={320} radius={12} />
        </section>
      </div>
    </div>
  </TadweenScope>
);
