import type { Dict } from '@/content/types';
import { SHOTS, shotSrc, type ShotFrame, type ShotId } from '@/lib/shots';
import { cx } from './Icon';

/** A real screenshot of the app in a browser frame or bare. Both themes are
    in the HTML and CSS shows the one that matches the page. Lazy images that are hidden are
    never fetched; a `priority` shot (the first one on a page) loads eagerly in both themes
    so it is never late. The language picks the English or Arabic capture. */
export function Shot({ t, id, frame, priority, className }: { t: Dict; id: ShotId; frame?: ShotFrame; priority?: boolean; className?: string }) {
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
      loading={priority ? 'eager' : 'lazy'}
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
