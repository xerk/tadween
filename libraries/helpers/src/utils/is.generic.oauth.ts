// POSTIZ_GENERIC_OAUTH switches the generic OIDC sign-in on. .env.example ships
// it as "false", so an empty value, "false", "0", "no" and "off" all mean off.
export const isGenericOauth = () => {
  const value = (process.env.POSTIZ_GENERIC_OAUTH || '').trim().toLowerCase();
  return !!value && !['false', '0', 'no', 'off'].includes(value);
};
