/** Pricing currencies. EGP and SAR are charged locally (Egyptian and Saudi gateways),
    USD everywhere else. */
export type Currency = 'EGP' | 'SAR' | 'USD';

const STORAGE_KEY = 'tdw-currency';

// Time zone first (it follows where the device actually is), then the browser's locale region.
const ZONE_CURRENCY: Record<string, Currency> = {
  'Africa/Cairo': 'EGP',
  'Asia/Riyadh': 'SAR',
};
const REGION_CURRENCY: Record<string, Currency> = { EG: 'EGP', SA: 'SAR' };

/** The visitor's currency: their own earlier pick, else their location, else USD.
    Runs in the browser only; the static page renders `fallback` first. */
export function detectCurrency(fallback: Currency): Currency {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'EGP' || saved === 'SAR' || saved === 'USD') return saved;
  } catch {
    // storage blocked (private mode): fall through to detection
  }
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (ZONE_CURRENCY[zone]) return ZONE_CURRENCY[zone];
  } catch {
    // no Intl time zone support
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const region = tag.split('-')[1]?.toUpperCase();
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  }
  return fallback;
}

/** Remember a currency the visitor picked by hand. */
export function rememberCurrency(currency: Currency) {
  try {
    window.localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    // storage blocked: the choice lasts for this page view only
  }
}
