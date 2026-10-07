'use client';

// Loading shapes for the billing screens (replaces Postiz's purple spinner):
// the plans grid, and the payment form on the first-billing screen.
import React, { FC } from 'react';
import {
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

export const BillingSkeleton: FC = () => (
  <TadweenScope className="tdw-billing">
    <div className="pz-pricing" aria-busy="true">
      <div className="tdw-billing-head">
        <div className="grid gap-[8px]">
          <Skeleton width={140} height={30} />
          <Skeleton width={320} height={14} />
        </div>
        <Skeleton width={220} height={36} radius={10} />
      </div>
      <div className="pz-tiers">
        {Array.from({ length: 4 }).map((_, i) => (
          <section key={i} className="pz-tier">
            <Skeleton width="50%" height={24} />
            <Skeleton width="80%" />
            <Skeleton width="60%" height={36} className="mt-[8px]" />
            <Skeleton height={36} radius={10} className="mt-[8px]" />
            {Array.from({ length: 5 }).map((__, j) => (
              <Skeleton key={j} width={`${85 - j * 8}%`} />
            ))}
          </section>
        ))}
      </div>
    </div>
  </TadweenScope>
);

export const PaymentFormSkeleton: FC = () => (
  <div className="tdw-pay-skel" aria-busy="true">
    <Skeleton width={120} height={22} />
    <Skeleton height={44} radius={10} />
    <div className="grid grid-cols-2 gap-[12px]">
      <Skeleton height={44} radius={10} />
      <Skeleton height={44} radius={10} />
    </div>
    <Skeleton height={44} radius={10} />
    <Skeleton width={160} height={22} className="mt-[16px]" />
    <Skeleton height={120} radius={14} />
  </div>
);
