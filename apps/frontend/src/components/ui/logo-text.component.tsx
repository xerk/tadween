import React from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';

// Tadween lockup: the ت mark plus the wordmark in Geist 600.
export const LogoTextComponent = () => {
  return (
    <span className="inline-flex items-center gap-[10px] text-newTextColor">
      <span className="[&>svg]:!mt-0 [&>svg]:!min-w-[32px] [&>svg]:!min-h-[32px] [&>svg]:!w-[32px] [&>svg]:!h-[32px]">
        <Logo />
      </span>
      <span className="text-[24px] leading-none font-[600] tracking-[-0.03em]">Tadween</span>
    </span>
  );
};
