import type { ReactNode } from 'react';
import { RootDocument } from '@/components/RootDocument';
import { en } from '@/content/en';

export { viewport } from '@/lib/seo';

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <RootDocument t={en}>{children}</RootDocument>;
}
