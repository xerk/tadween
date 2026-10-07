'use client';

import { Icon } from './Icon';
import { THEME_KEY } from '@/lib/theme';

/** Flips data-theme on <html> and remembers the choice. The icons swap in CSS, so the
    server render needs no knowledge of the theme. */
export function ThemeToggle({ label }: { label: string }) {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    root.style.colorScheme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  };
  return (
    <button type="button" className="pz-theme" onClick={toggle} aria-label={label} title={label}>
      <Icon name="moon" size={18} className="is-moon" />
      <Icon name="sun" size={18} className="is-sun" />
    </button>
  );
}
