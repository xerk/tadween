'use client';

import { useEffect } from 'react';
import { APP_URL, REFERRAL_COOKIE_DAYS, REFERRAL_COOKIE_DOMAIN } from '@/lib/config';

const CODE = /^[A-Za-z0-9_-]{3,32}$/;
const COOKIE = 'tdw_ref';

/** A link into the app (sign-up, sign-in, a plan), not one that only starts with the same
    characters (http://localhost:4403 vs http://localhost:44030). */
const isAppLink = (href: string) => href === APP_URL || href.startsWith(`${APP_URL}/`) || href.startsWith(`${APP_URL}?`);

/** Hands a referral code to the app. On `?ref=CODE` it stores the code (upper case) in the
    tdw_ref cookie, on NEXT_PUBLIC_REFERRAL_COOKIE_DOMAIN when this host is on it, and the
    latest code wins. Then every link into the app carries `ref=CODE`, from the URL or else
    the cookie, so the app can read it at sign-up. Runs after hydration; renders nothing. */
export function ReferralCapture() {
  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get('ref') ?? '';
    let code = CODE.test(fromUrl) ? fromUrl.toUpperCase() : '';
    if (code) {
      const domain = REFERRAL_COOKIE_DOMAIN.replace(/^\./, '');
      const onDomain = domain && (location.hostname === domain || location.hostname.endsWith(`.${domain}`));
      document.cookie = [
        `${COOKIE}=${code}`,
        'Path=/',
        `Max-Age=${REFERRAL_COOKIE_DAYS * 86400}`,
        'SameSite=Lax',
        ...(onDomain ? [`Domain=${REFERRAL_COOKIE_DOMAIN}`] : []),
        ...(location.protocol === 'https:' ? ['Secure'] : []),
      ].join('; ');
    } else {
      const saved = document.cookie.match(/(?:^|;\s*)tdw_ref=([^;]*)/)?.[1] ?? '';
      code = CODE.test(saved) ? saved.toUpperCase() : '';
    }
    if (!code) return;

    const tag = (a: HTMLAnchorElement) => {
      if (!isAppLink(a.href)) return;
      const url = new URL(a.href);
      if (url.searchParams.get('ref') === code) return;
      url.searchParams.set('ref', code);
      a.href = url.toString();
    };
    document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(tag);
    // Links React draws again later (the pricing period toggle) get it on the way out.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (a instanceof HTMLAnchorElement) tag(a);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('auxclick', onClick, true);
    };
  }, []);
  return null;
}
