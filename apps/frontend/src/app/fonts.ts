// Tadween typefaces (replaces Plus Jakarta Sans). Geist for UI, Geist Mono for times and
// numbers, Tajawal for Arabic. Exposed as CSS variables; tadween.scss and the
// Tailwind `sans` / `mono` stacks read them. next/font self-hosts the files at build time.
//
// Every Arabic font-family in the app reads `--font-arabic`, so changing the Arabic face is
// this one import. Only the `arabic` subset is loaded, so Latin text always stays on Geist.
import { Geist, Geist_Mono, Tajawal } from 'next/font/google';

const geist = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
// Tajawal has no 600 weight: semibold text resolves to 700
const arabic = Tajawal({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '700', '800'],
  variable: '--font-arabic',
  display: 'swap',
});

export const tadweenFont = {
  className: `${geist.variable} ${geistMono.variable} ${arabic.variable} tdw-font`,
};
