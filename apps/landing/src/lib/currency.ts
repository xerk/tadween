/** Pricing currencies. EGP and SAR are charged locally (Egyptian and Saudi gateways),
    USD everywhere else. */
export type Currency = 'EGP' | 'SAR' | 'USD';

// Time zone first (it follows where the device actually is), then the browser's locale region.
const ZONE_CURRENCY: Record<string, Currency> = {
  'Africa/Cairo': 'EGP',
  'Asia/Riyadh': 'SAR',
};
const REGION_CURRENCY: Record<string, Currency> = { EG: 'EGP', SA: 'SAR' };

/** The visitor's currency, from their location, else USD. There is no switch: each visitor
    sees one currency. Runs in the browser only; the static page holds the prices hidden until
    this has run. */
export function detectCurrency(): Currency {
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
  return 'USD';
}
