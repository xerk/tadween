import type { ReactNode } from 'react';
import { RootDocument } from '@/components/RootDocument';
import { ar } from '@/content/ar';

export { viewport } from '@/lib/seo';

export default function ArabicLayout({ children }: { children: ReactNode }) {
  return <RootDocument t={ar}>{children}</RootDocument>;
}
