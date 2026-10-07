// Public URLs, read at build time. NEXT_PUBLIC_* values are inlined into the bundle.
const trim = (u: string) => u.replace(/\/+$/, '');

/** The Tadween app (sign-up and sign-in live there). */
export const APP_URL = trim(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4200');
/** The Tadween API; when set, pricing reads plans from GET /instance/settings. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ? trim(process.env.NEXT_PUBLIC_API_URL) : '';
/** Where this marketing site is served from (canonical URLs, sitemap, Open Graph). */
export const SITE_URL = trim(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4300');

export const SIGN_UP_URL = `${APP_URL}/auth`;
export const SIGN_IN_URL = `${APP_URL}/auth/login`;

/** Tadween is built on Postiz (AGPL-3.0); the footer credit links to its source. */
export const SOURCE_URL = 'https://github.com/gitroomhq/postiz-app';
export const LICENSE_URL = 'https://www.gnu.org/licenses/agpl-3.0.html';
