// Same faces as the app (apps/frontend/src/app/fonts.ts): Geist for UI, Geist Mono for
// times and numbers, IBM Plex Sans Arabic for Arabic. Self-hosted by next/font at build
// time, swapped in with font-display: swap, and exposed as CSS variables.
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google';

const geist = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap', preload: false });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

export const fontVars = `${geist.variable} ${geistMono.variable} ${plexArabic.variable}`;
