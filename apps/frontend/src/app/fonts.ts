// Tadween typefaces (replaces Plus Jakarta Sans). Geist for UI, Geist Mono for times and
// numbers, IBM Plex Sans Arabic for Arabic. Exposed as CSS variables; tadween.scss and the
// Tailwind `sans` / `mono` stacks read them.
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google';

const geist = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

export const tadweenFont = {
  className: `${geist.variable} ${geistMono.variable} ${plexArabic.variable} tdw-font`,
};
