import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { textSlicer } from '@gitroom/helpers/utils/count.length';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { FC, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { TadweenAvatarImage } from '@gitroom/frontend/components/tadween/editor/channel.avatar';

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// mentions and hashtags in Instagram's link colour, a link stays plain text
// (Instagram does not link it in a caption)
const format = (value: string) =>
  escape(value).replace(
    /\[\[\[([.\s\S]*?)\]\]\]|(^|[^\p{L}\p{N}_&])([#@][\p{L}\p{N}_.]*[\p{L}\p{N}_])/gu,
    (match, mention, before, tag) =>
      mention
        ? `<span class="text-textInstagramLink">${mention}</span>`
        : `${before}<span class="text-textInstagramLink">${tag}</span>`
  );

// One block per line, so each takes its own direction (an Arabic line reads
// right to left). The text after `end` is marked as cropped.
const toParagraphs = (text: string, end: number) => {
  let offset = 0;
  return text.split('\n').map((line) => {
    const from = offset;
    offset += line.length + 1;
    const keep = Math.min(Math.max(end - from, 0), line.length);
    const cropped = line.slice(keep);
    return (
      format(line.slice(0, keep)) +
      (cropped
        ? `<mark class="bg-red-500" data-tooltip-id="tooltip" data-tooltip-content="This text will be cropped">${format(
            cropped
          )}</mark>`
        : '')
    );
  });
};

// "username caption": the name opens the first line; <bdi> keeps it out of
// that line's direction, so an Arabic caption still reads right to left
const Caption: FC<{ username?: string; paragraphs: string[] }> = ({
  username,
  paragraphs,
}) => (
  <>
    {paragraphs.map((html, index) => (
      <div
        key={index}
        dir="auto"
        className="min-h-[18px] [text-align:start]"
        dangerouslySetInnerHTML={{
          __html:
            (index === 0
              ? `<bdi class="font-[600]">${escape(username || '')}</bdi> `
              : '') + html,
        }}
      />
    ))}
  </>
);

export const InstagramPreview: FC<{
  maximumCharacters?: number;
}> = (props) => {
  const { value: topValue, integration } = useIntegration();
  const mediaDir = useMediaDirectory();
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  // "… more": the caption shows two lines until it is opened, like the feed
  const captionRef = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState(false);
  const [moreRtl, setMoreRtl] = useState(false);
  const username = integration?.display || integration?.name;

  const renderContent = topValue.map((p) => {
    const newContent = stripHtmlValidation(
      'normal',
      p.content.replace(
        /<span.*?data-mention-id="([.\s\S]*?)"[.\s\S]*?>([.\s\S]*?)<\/span>/gi,
        (match, match1, match2) => {
          return `[[[${match2}]]]`;
        }
      ),
      true
    );

    const { end } = textSlicer(
      integration?.identifier || '',
      props.maximumCharacters || 10000,
      newContent
    );

    return {
      paragraphs: toParagraphs(newContent, end),
      images: (p.image || []).map((image) => mediaDir.set(image.path)),
    };
  });
  const paragraphs = renderContent?.[0]?.paragraphs || [];
  const images = renderContent?.[0]?.images || [];
  const comments = renderContent.slice(1);

  useLayoutEffect(() => {
    const el = captionRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      setClamped(!expanded && el.scrollHeight > el.clientHeight + 1);
      // "… more" goes at the end of the last visible line, in that line's
      // direction (an Arabic line ends on the left)
      const lines = Array.from(el.children) as HTMLElement[];
      const last = lines.filter((p) => p.offsetTop < el.clientHeight).pop();
      setMoreRtl(!!last && getComputedStyle(last).direction === 'rtl');
    };
    measure();
    // the inspector and the phone frame change width without a render
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, paragraphs.join('\n')]);

  return (
    // an English Instagram screen: left to right even inside the Arabic app
    // (.lbox, global.scss), each line of the caption still takes its own
    // direction
    <div className="lbox flex flex-col w-full bg-bgInstagram text-textInstagram rounded-[12px] overflow-hidden pb-[12px] text-[14px] leading-[18px] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif]">
      <div className="flex items-center gap-[10px] h-[54px] px-[12px]">
        <TadweenAvatarImage
          src={integration?.picture}
          name={username}
          className="w-[32px] h-[32px] rounded-full object-cover flex-none"
        />
        <div className="flex-1 min-w-0 font-[600] truncate">{username}</div>
        <span className="flex-none" aria-hidden="true">
          <InstagramIcon d={MORE} fill />
        </span>
      </div>
      <InstagramMedia
        images={images}
        emptyLabel={t(
          'tdw_instagram_needs_media',
          'Instagram needs a photo or video'
        )}
      />
      <div className="px-[12px]">
        <div className="relative">
          <div
            ref={captionRef}
            // cut by height, not line-clamp: its own ellipsis would double the "…"
            className={clsx(
              'break-words',
              !expanded && 'max-h-[36px] overflow-hidden'
            )}
          >
            <Caption username={username} paragraphs={paragraphs} />
          </div>
          {clamped && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={clsx(
                'absolute bottom-0 [direction:ltr] [unicode-bidi:isolate] bg-bgInstagram text-textInstagramMuted select-none',
                // physical sides: the app's RTL stylesheet flips logical ones
                moreRtl ? 'left-0 pr-[4px]' : 'right-0 pl-[4px]'
              )}
            >
              … more
            </button>
          )}
        </div>
        {comments.map((comment, index) => (
          <div key={index} className="mt-[4px] break-words">
            <Caption username={username} paragraphs={comment.paragraphs} />
          </div>
        ))}
        <div className="mt-[6px] text-[12px] leading-[16px] text-textInstagramMuted select-none">
          now
        </div>
      </div>
    </div>
  );
};

// the post's media: one picture, a carousel with its dots and "1/3", or a
// Reels frame for a video. Instagram needs one, so its absence is shown as an
// empty frame.
const InstagramMedia: FC<{ images: string[]; emptyLabel: string }> = ({
  images,
  emptyLabel,
}) => {
  const [slide, setIndex] = useState(0);
  // a picture removed while a later one was shown
  const index = Math.min(slide, Math.max(images.length - 1, 0));
  // a feed picture is cropped between 4:5 and 1.91:1; a carousel uses the
  // first one's shape for all
  const [ratio, setRatio] = useState(1);
  const trackRef = useRef<HTMLDivElement>(null);
  const video = images.length === 1 && hasExtension(images[0], 'mp4');
  const go = (next: number) => {
    const el = trackRef.current;
    el?.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };

  if (!images.length) {
    return (
      <>
        <div className="w-full aspect-square flex flex-col items-center justify-center gap-[12px] bg-instagramEmpty text-textInstagramMuted select-none">
          <InstagramIcon d={PHOTO} size={48} />
          <div className="text-[14px] font-[600] px-[24px] text-center">
            {emptyLabel}
          </div>
        </div>
        <ActionRow count={0} index={0} />
      </>
    );
  }

  return (
    <>
      <div
        className="relative w-full bg-black"
        style={{ aspectRatio: video ? '9 / 16' : String(ratio) }}
      >
        <div
          ref={trackRef}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none]"
          onScroll={(e) =>
            setIndex(
              Math.round(
                e.currentTarget.scrollLeft / e.currentTarget.clientWidth
              )
            )
          }
        >
          {images.map((src, i) =>
            hasExtension(src, 'mp4') ? (
              <video
                key={i}
                src={src}
                autoPlay
                muted
                loop
                className="w-full h-full flex-none snap-start object-cover"
              />
            ) : (
              <img
                key={i}
                src={src}
                alt=""
                className="w-full h-full flex-none snap-start object-cover"
                onLoad={(e) => {
                  if (i === 0) {
                    const { naturalWidth: w, naturalHeight: h } =
                      e.currentTarget;
                    setRatio(Math.min(Math.max(w / h || 1, 0.8), 1.91));
                  }
                }}
              />
            )
          )}
        </div>
        {images.length > 1 && (
          <>
            <span className="absolute top-[12px] right-[12px] px-[8px] py-[4px] rounded-full bg-[rgba(18,18,18,0.7)] text-white text-[12px] leading-[14px] font-[600] select-none">
              {index + 1}/{images.length}
            </span>
            {index > 0 && (
              <SlideButton side="left" onClick={() => go(index - 1)} />
            )}
            {index < images.length - 1 && (
              <SlideButton side="right" onClick={() => go(index + 1)} />
            )}
          </>
        )}
        {video && (
          <span
            className="absolute right-[12px] bottom-[12px] w-[28px] h-[28px] rounded-full bg-[rgba(18,18,18,0.7)] text-white flex items-center justify-center"
            aria-hidden="true"
          >
            <InstagramIcon d={MUTED} size={14} fill />
          </span>
        )}
      </div>
      <ActionRow count={images.length} index={index} />
    </>
  );
};

const SlideButton: FC<{ side: 'left' | 'right'; onClick: () => void }> = ({
  side,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={side === 'left' ? 'Previous' : 'Next'}
    className={clsx(
      'absolute top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full bg-white/80 text-black flex items-center justify-center shadow',
      side === 'left' ? 'left-[8px] rotate-180' : 'right-[8px]'
    )}
  >
    <InstagramIcon d={CHEVRON} size={14} />
  </button>
);

// heart, comment, share on the left, save at the far end, the carousel dots
// in the middle; no counts
const ActionRow: FC<{ count: number; index: number }> = ({ count, index }) => (
  <div className="relative flex items-center gap-[16px] h-[46px] px-[12px] select-none">
    <InstagramIcon d={LIKE} fill label="Like" />
    <InstagramIcon d={COMMENT} label="Comment" />
    <InstagramIcon d={SHARE} label="Share" />
    <span className="flex-1" />
    <InstagramIcon d={SAVE} label="Save" />
    {count > 1 && (
      <div className="absolute left-1/2 -translate-x-1/2 flex gap-[4px]">
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className={clsx(
              'w-[6px] h-[6px] rounded-full',
              i === index ? 'bg-[#0095f6]' : 'bg-textInstagramMuted opacity-50'
            )}
          />
        ))}
      </div>
    )}
  </div>
);

const InstagramIcon: FC<{
  d: string;
  size?: number;
  fill?: boolean;
  label?: string;
}> = ({ d, size = 24, fill, label }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    role={label ? 'img' : undefined}
    className="flex-none"
    fill={fill ? 'currentColor' : 'none'}
    stroke={fill ? undefined : 'currentColor'}
    strokeWidth={fill ? undefined : 2}
    strokeLinejoin="round"
    strokeLinecap="round"
  >
    <path d={d} />
  </svg>
);

// Instagram's own outline icons (instagram.com)
const LIKE =
  'M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z';
const COMMENT = 'M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z';
const SHARE =
  'M13.973 20.046 21.77 6.928C22.8 5.195 21.55 3 19.535 3H4.466C2.138 3 .984 5.825 2.646 7.456l4.842 4.752 1.723 7.121c.548 2.266 3.571 2.721 4.762.717ZM7.488 12.208l8.027-4.567';
const SAVE = 'M20 21 12 13.44 4 21 4 3 20 3 20 21Z';
const MORE =
  'M12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm12 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z';
const PHOTO =
  'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 11 5-5 4 4 3-3 6 6M15.5 9.5a1 1 0 1 0 0-.01';
const CHEVRON = 'm9 5 7 7-7 7';
const MUTED =
  'M11.3 3.3a1 1 0 0 1 1.7.7v16a1 1 0 0 1-1.7.7L6.6 16H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h3.6zM16.3 8.3a1 1 0 0 1 1.4 0l1.8 1.8 1.8-1.8a1 1 0 1 1 1.4 1.4L20.9 11.5l1.8 1.8a1 1 0 0 1-1.4 1.4l-1.8-1.8-1.8 1.8a1 1 0 0 1-1.4-1.4l1.8-1.8-1.8-1.8a1 1 0 0 1 0-1.4z';
