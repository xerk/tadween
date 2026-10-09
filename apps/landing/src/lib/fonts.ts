// Same faces as the app (apps/frontend/src/app/fonts.ts): Geist for UI, Geist Mono for
// times and numbers, Tajawal for Arabic. Self-hosted by next/font at build time, swapped in
// with font-display: swap, and exposed as CSS variables. Tajawal has no 600, so Arabic
// headings use 700 (landing.css).
import { Geist, Geist_Mono, Tajawal } from 'next/font/google';

const geist = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap', preload: false });
const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const fontVars = `${geist.variable} ${geistMono.variable} ${tajawal.variable}`;
