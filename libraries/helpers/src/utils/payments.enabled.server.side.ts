import { cache } from 'react';
import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';

// Tadween: billing shows only when Stripe is set up and payments are switched
// on in /admin (GET /instance/settings → billing.enabled). Without Stripe keys
// nothing is asked; a failed read keeps billing hidden.
export const paymentsEnabledServerSide = cache(async () => {
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    return false;
  }
  try {
    const response = await internalFetch('/instance/settings');
    const settings = response.ok ? await response.json() : null;
    return settings?.billing?.enabled === true;
  } catch {
    return false;
  }
});
