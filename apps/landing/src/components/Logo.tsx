/** The ت mark beside the Geist wordmark. The mark carries its own Nile ground, so one
    file works in both themes. */
export function Logo({ size = 30, href, label, arabic }: { size?: number; href?: string; label?: string; arabic?: boolean }) {
  const inner = (
    <>
      <img src="/logo.svg" width={size} height={size} alt="" />
      <span className="pz-logo-word">Tadween</span>
      {arabic ? <span className="pz-logo-ar" lang="ar">تدوين</span> : null}
    </>
  );
  return href ? (
    <a className="pz-logo" href={href} aria-label={label}>
      {inner}
    </a>
  ) : (
    <span className="pz-logo">{inner}</span>
  );
}
