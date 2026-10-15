import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { PreviewWrapper } from '@gitroom/frontend/components/preview/preview.wrapper';

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Tadween: a visitor without a session gets the public page only
  const signedIn = !!(await cookies()).get('auth')?.value;
  return (
    <div className="bg-newBgColor min-h-screen text-newTextColor">
      <PreviewWrapper signedIn={signedIn}>{children}</PreviewWrapper>
    </div>
  );
}
