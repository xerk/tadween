import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { textSlicer } from '@gitroom/helpers/utils/count.length';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { FC } from 'react';
import clsx from 'clsx';
import { TadweenAvatarImage } from '@gitroom/frontend/components/tadween/editor/channel.avatar';

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// a link reads left to right even inside an Arabic line ([dir=ltr] is flipped
// by the RTL stylesheet, so the direction is set inline)
const link = (html: string) =>
  `<span class="text-textThreadsLink" style="direction:ltr;unicode-bidi:isolate">${html}</span>`;

// Threads shows a link without its scheme and cuts a long one short
const shortUrl = (url: string) => {
  const bare = url.replace(/^https?:\/\/(www\.)?/i, '');
  return bare.length > 22 ? bare.slice(0, 20) + '…' : bare;
};

// Formats one post of the thread: mentions (picked or typed as @username) and
// links in the link colour, and the first #tag as the post's topic (Threads
// keeps the first tag of a post as its topic, shown without the #; any other
// hashtag stays plain text).
const formatter = () => {
  let topic = false;
  return (value: string) =>
    escape(value).replace(
      /\[\[\[([.\s\S]*?)\]\]\]|(https?:\/\/[^\s]+)|(^|[^\p{L}\p{N}_&])([#@])([\p{L}\p{N}_.]*[\p{L}\p{N}_])/gu,
      (match, mention, url, before, sign, word) => {
        if (mention) {
          return link(mention);
        }
        if (url) {
          return link(shortUrl(url));
        }
        if (sign === '@') {
          return before + link('@' + word);
        }
        if (topic) {
          return match;
        }
        topic = true;
        return `${before}<span class="text-textThreadsLink">${word}</span>`;
      }
    );
};

// One block per line, so each takes its own direction (an Arabic line reads
// right to left, a link stays left to right). The text after `end` is marked
// as cropped.
const toParagraphs = (text: string, end: number) => {
  const format = formatter();
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

const Paragraphs: FC<{ paragraphs: string[] }> = ({ paragraphs }) => (
  <>
    {paragraphs.map((html, index) => (
      <div
        key={index}
        dir="auto"
        className="min-h-[21px] [text-align:start]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    ))}
  </>
);

export const ThreadsPreview: FC<{
  maximumCharacters?: number;
}> = (props) => {
  const { value: topValue, integration } = useIntegration();
  const mediaDir = useMediaDirectory();
  // Threads shows the username, the channel's display name is the same
  // username unless it was renamed in Tadween
  const username = integration?.display || integration?.name;

  const posts = topValue.map((p) => {
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

  return (
    // an English Threads screen: left to right even inside the Arabic app
    // (.lbox, global.scss), each line of the post still takes its own direction
    <div className="lbox flex flex-col w-full bg-bgThreads text-textThreads rounded-[12px] px-[16px] pt-[16px] pb-[4px] text-[15px] leading-[21px] [font-family:system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif]">
      {posts.map((post, index) => {
        const last = index === posts.length - 1;
        return (
          // every reply of the thread is a post of the same account, joined
          // to the one above by the thread line
          <div key={index} className="flex gap-[12px]">
            <div className="flex flex-col items-center w-[36px] flex-none">
              <div className="relative w-[36px] h-[36px]">
                <TadweenAvatarImage
                  src={integration?.picture}
                  name={username}
                  className="w-[36px] h-[36px] rounded-full object-cover"
                />
                {index === 0 && <FollowBadge />}
              </div>
              {!last && (
                <div className="flex-1 w-[2px] my-[6px] rounded-full bg-threadsLine" />
              )}
            </div>
            <div
              className={clsx('flex-1 min-w-0', last ? 'pb-[8px]' : 'pb-[16px]')}
            >
              <div className="flex items-center gap-[6px] h-[21px]">
                <span className="font-[600] truncate">{username}</span>
                <span className="text-textThreadsMuted flex-none">now</span>
                <span className="flex-1" />
                <span
                  className="flex-none -mr-[4px] text-textThreadsMuted"
                  aria-hidden="true"
                >
                  <ThreadsIcon size={20} d={MORE} />
                </span>
              </div>
              <div className="mt-[2px] break-words">
                <Paragraphs paragraphs={post.paragraphs} />
              </div>
              <ThreadsMedia images={post.images} />
              <div className="flex items-center h-[36px] mt-[4px] -ml-[8px] text-textThreadsIcon select-none">
                <ThreadsAction label="Like" d={LIKE} />
                <ThreadsAction label="Comment" d={COMMENT} />
                <ThreadsAction label="Repost" d={REPOST} />
                <ThreadsAction label="Share" d={SHARE} size={18} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MediaItem: FC<{ src: string; className: string }> = ({
  src,
  className,
}) =>
  hasExtension(src, 'mp4') ? (
    <span className="relative block">
      <video src={src} autoPlay muted loop className={className} />
      <span
        className="absolute right-[12px] bottom-[12px] w-[28px] h-[28px] rounded-full bg-[rgba(40,40,40,0.5)] text-white flex items-center justify-center"
        aria-hidden="true"
      >
        <ThreadsIcon size={14} d={MUTED} />
      </span>
    </span>
  ) : (
    <img src={src} alt="" className={className} />
  );

// one picture or video takes the post's width, several scroll sideways
const ThreadsMedia: FC<{ images: string[] }> = ({ images }) => {
  if (!images.length) {
    return null;
  }
  const frame =
    'rounded-[8px] outline outline-1 -outline-offset-1 outline-threadsMediaOutline';
  if (images.length === 1) {
    return (
      <a
        href={images[0]}
        target="_blank"
        className="block mt-[8px] w-fit max-w-full"
      >
        <MediaItem
          src={images[0]}
          className={clsx('block max-w-full max-h-[430px] object-cover', frame)}
        />
      </a>
    );
  }
  return (
    <div className="mt-[8px] flex gap-[6px] overflow-x-auto [scrollbar-width:none]">
      {images.map((src, index) => (
        <a key={index} href={src} target="_blank" className="flex-none">
          <MediaItem
            src={src}
            className={clsx('block h-[250px] w-auto max-w-none object-cover', frame)}
          />
        </a>
      ))}
    </div>
  );
};

// the "+" on a profile picture in the feed (follow)
const FollowBadge = () => (
  <span
    className="absolute -right-[3px] -bottom-[3px] w-[18px] h-[18px] rounded-full bg-textThreads text-bgThreads border-[2px] border-bgThreads flex items-center justify-center"
    aria-hidden="true"
  >
    <ThreadsIcon size={10} d={PLUS} />
  </span>
);

const ThreadsAction: FC<{ label: string; d: string; size?: number }> = ({
  label,
  d,
  size = 20,
}) => (
  <span
    className="flex items-center justify-center w-[36px] h-[36px] rounded-full hover:bg-threadsHover cursor-default"
    aria-label={label}
  >
    <ThreadsIcon size={size} d={d} />
  </span>
);

const ThreadsIcon: FC<{ size: number; d: string }> = ({ size, d }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden="true"
    className="flex-none"
  >
    <path fillRule="evenodd" clipRule="evenodd" d={d} />
  </svg>
);

// Threads' own outline icons (threads.com)
const LIKE =
  'M16.5 2c-1.666 0-3.278.707-4.5 1.937C10.778 2.707 9.166 2 7.5 2c-4.122 0-7 3.084-7 7.5 0 4.628 4.345 9.962 10.811 13.272a1.507 1.507 0 0 0 1.378 0C19.155 19.462 23.5 14.128 23.5 9.5c0-4.416-2.878-7.5-7-7.5zM12 20.876c-5.692-2.98-9.5-7.53-9.5-11.376 0-3.341 1.963-5.5 5-5.5 2 0 3.75 1.75 4.5 3.5.75-1.75 2.5-3.5 4.5-3.5 3.038 0 5 2.159 5 5.5 0 3.847-3.808 8.396-9.5 11.376z';
const COMMENT =
  'M12 3a9 9 0 0 0 0 18c1.414 0 2.75-.325 3.937-.904a1 1 0 0 1 .614-.086l4.206.752-.764-4.17a1 1 0 0 1 .086-.621C20.67 14.774 21 13.427 21 12a9 9 0 0 0-9-9zM1 12C1 5.925 5.925 1 12 1s11 4.925 11 11c0 1.62-.351 3.162-.982 4.549l.966 5.27a1 1 0 0 1-1.16 1.165l-5.312-.95C15.134 22.656 13.606 23 12 23 5.925 23 1 18.075 1 12z';
const REPOST =
  'M4.516 6.999a8.99 8.99 0 0 1 7.483-4 9.002 9.002 0 0 1 8.294 5.498 1 1 0 0 0 1.842-.78A11.002 11.002 0 0 0 11.999 1C8.278 1 4.99 2.848 3 5.674V3a1 1 0 1 0-2 0v5a1 1 0 0 0 1 1h5a1 1 0 0 0 0-2H4.517zM2.396 14.971a1 1 0 0 1 1.31.532A9.002 9.002 0 0 0 12 21 8.99 8.99 0 0 0 19.483 17h-2.484a1 1 0 1 1 0-2h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-2.675A10.986 10.986 0 0 1 12 23a11.002 11.002 0 0 1-10.135-6.718 1 1 0 0 1 .532-1.31z';
const SHARE =
  'M7.247 1.499C4.183-.187.6 2.643 1.53 6.014L3.182 12 1.53 17.986c-.93 3.37 2.653 6.201 5.717 4.515l13.578-7.468c2.39-1.315 2.39-4.75 0-6.066L7.246 1.5zM3.458 5.482c-.46-1.666 1.311-3.064 2.825-2.231L19.86 10.72c.142.077.263.172.365.28H4.98L3.458 5.482zM4.981 13l-1.523 5.518c-.46 1.665 1.311 3.064 2.825 2.231l13.577-7.468c.142-.078.263-.173.365-.281H4.98z';
const MORE =
  'M4 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z';
const PLUS =
  'M12 2a1.5 1.5 0 0 1 1.5 1.5v7h7a1.5 1.5 0 0 1 0 3h-7v7a1.5 1.5 0 0 1-3 0v-7h-7a1.5 1.5 0 0 1 0-3h7v-7A1.5 1.5 0 0 1 12 2z';
const MUTED =
  'M11.3 3.3a1 1 0 0 1 1.7.7v16a1 1 0 0 1-1.7.7L6.6 16H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h3.6zM16.3 8.3a1 1 0 0 1 1.4 0l1.8 1.8 1.8-1.8a1 1 0 1 1 1.4 1.4L20.9 11.5l1.8 1.8a1 1 0 0 1-1.4 1.4l-1.8-1.8-1.8 1.8a1 1 0 0 1-1.4-1.4l1.8-1.8-1.8-1.8a1 1 0 0 1 0-1.4z';
