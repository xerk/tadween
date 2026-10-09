import type { Dict } from '@/content/types';
import { SHOTS, shotSrc, type ShotFrame, type ShotId } from '@/lib/shots';
import { cx } from './Icon';

/** A real screenshot of the app in a browser frame, a phone frame or bare. Both themes are
    in the HTML and CSS shows the one that matches the page; both are lazy, so the browser
    never fetches the hidden one. The language picks the English or Arabic capture. */
export function Shot({ t, id, frame, priority, className, sizes }: { t: Dict; id: ShotId; frame?: ShotFrame; priority?: boolean; className?: string; sizes?: string }) {
  const spec = SHOTS[id];
  const kind = frame ?? spec.frame;
  const alt = t.shots[id];
  const img = (theme: 'light' | 'dark') => (
    <img
      className={`is-${theme}`}
      src={shotSrc(id, t.lang, theme)}
      width={spec.w}
      height={spec.h}
      alt={alt}
      sizes={sizes}
      // Lazy even above the fold: an eager image would load in both themes.
      loading="lazy"
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
    />
  );
  return (
    <figure className={cx('pz-shot', `is-${kind}`, className)}>
      {kind === 'browser' ? (
        <div className="pz-shot-bar" aria-hidden="true">
          <span className="pz-shot-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="pz-shot-url">{`${t.shotUrl}${'path' in spec ? spec.path : ''}`}</span>
          <i />
        </div>
      ) : null}
      <div className="pz-shot-zoom">
        {img('light')}
        {img('dark')}
      </div>
    </figure>
  );
}
