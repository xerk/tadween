'use client';

// MediaGallery: a post's pictures and videos in the layouts social networks
// use (1 / 2 / 3 / 4+ with a "+N" tile), opening into a Lightbox.
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { cx, Icon, useEscape, usePresence } from '@gitroom/frontend/components/tadween/ui';
import type { PublicPostMedia } from '@gitroom/frontend/components/tadween/post-page/post.page';

// Same rule as VideoOrImage: Tadween uploads videos as mp4.
const isVideo = (path: string) => hasExtension(path, 'mp4');

const Lightbox: FC<{
  media: PublicPostMedia[];
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
}> = ({ media, index, onIndex, onClose }) => {
  const t = useT();
  const open = index !== null;
  const { mounted, state } = usePresence(open, 220);
  const [shown, setShown] = useState(index ?? 0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const many = media.length > 1;

  useEffect(() => {
    if (index !== null) {
      setShown(index);
    }
  }, [index]);

  const step = useCallback(
    (delta: number) => onIndex((shown + delta + media.length) % media.length),
    [shown, media.length, onIndex]
  );

  // While open: the page doesn't scroll, and focus goes back to the tile that
  // opened the viewer when it closes.
  useEffect(() => {
    if (!open) {
      return;
    }
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open]);

  // The dialog mounts a frame after `open`; move focus in once it exists.
  useEffect(() => {
    if (open && mounted) {
      closeRef.current?.focus();
    }
  }, [open, mounted]);

  useEscape(open, onClose);
  // Arrow keys follow the reading direction.
  useEffect(() => {
    if (!open || !many) {
      return;
    }
    const rtl = document.documentElement.dir === 'rtl';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        step(rtl ? -1 : 1);
      } else if (e.key === 'ArrowLeft') {
        step(rtl ? 1 : -1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, many, step]);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }
  const item = media[shown];
  return createPortal(
    <div className="tdw-ui">
      <div
        className="tdw-pp-lightbox"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label={t('tdw_pp_media_viewer', 'Media viewer')}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <button
          ref={closeRef}
          type="button"
          className="tdw-pp-lb-btn tdw-pp-lb-close"
          onClick={onClose}
          aria-label={t('close', 'Close')}
        >
          <Icon name="x" size={20} />
        </button>
        {many && (
          <div className="tdw-pp-lb-count" aria-live="polite">
            {shown + 1} / {media.length}
          </div>
        )}
        <div className="tdw-pp-lb-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
          {item && isVideo(item.path) ? (
            <video
              key={item.id}
              src={item.path}
              poster={item.thumbnail || undefined}
              controls={true}
              playsInline={true}
              autoPlay={true}
              className="tdw-pp-lb-media"
            />
          ) : item ? (
            <img
              key={item.id}
              src={item.path}
              alt={item.alt || ''}
              className="tdw-pp-lb-media"
            />
          ) : null}
        </div>
        {many && (
          <>
            <button
              type="button"
              className="tdw-pp-lb-btn tdw-pp-lb-prev"
              onClick={() => step(-1)}
              aria-label={t('previous', 'Previous')}
            >
              <Icon name="chevron-left" size={22} className="tdw-pp-flip" />
            </button>
            <button
              type="button"
              className="tdw-pp-lb-btn tdw-pp-lb-next"
              onClick={() => step(1)}
              aria-label={t('next', 'Next')}
            >
              <Icon name="chevron-right" size={22} className="tdw-pp-flip" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export const MediaGallery: FC<{ media: PublicPostMedia[] }> = ({ media }) => {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const shown = media.slice(0, 4);
  const more = media.length - shown.length;
  const single = media.length === 1;

  return (
    <>
      <div
        className={cx('tdw-pp-gallery', `is-${Math.min(media.length, 4)}`)}
      >
        {shown.map((item, index) => {
          const video = isVideo(item.path);
          // A lone video plays in place; everything else opens the viewer.
          if (single && video) {
            return (
              <div key={item.id} className="tdw-pp-tile is-video-inline">
                <video
                  src={item.path}
                  poster={item.thumbnail || undefined}
                  controls={true}
                  playsInline={true}
                  preload="metadata"
                />
              </div>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              className="tdw-pp-tile"
              onClick={() => setOpen(index)}
              aria-label={
                video
                  ? t('tdw_pp_play_video', 'Play video')
                  : t('tdw_pp_open_image', 'Open image {{index}} of {{count}}', {
                      index: index + 1,
                      count: media.length,
                    })
              }
            >
              {video ? (
                <>
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <video src={item.path} preload="metadata" muted={true} playsInline={true} />
                  )}
                  <span className="tdw-pp-play" aria-hidden="true">
                    <Icon name="play" size={22} />
                  </span>
                </>
              ) : (
                <img src={item.path} alt={item.alt || ''} loading="lazy" />
              )}
              {more > 0 && index === shown.length - 1 && (
                <span className="tdw-pp-more">+{more}</span>
              )}
            </button>
          );
        })}
      </div>
      <Lightbox media={media} index={open} onIndex={setOpen} onClose={close} />
    </>
  );
};
