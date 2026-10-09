'use client';

// PostCard: one post as the hero of its permalink page. Author, status, the
// text (rendered by the preview comments' PostContentClient, so selecting
// text still starts an anchored comment), media and the thread parts.
import { FC, MouseEvent, useEffect, useRef, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PostContentClient } from '@gitroom/frontend/components/preview/post.content.client';
import { Pill } from '@gitroom/frontend/components/tadween/ui';
import type { PublicPost } from '@gitroom/frontend/components/tadween/post-page/post.page';
import { LocalDate } from '@gitroom/frontend/components/tadween/post-page/post.time';
import { MediaGallery } from '@gitroom/frontend/components/tadween/post-page/media.gallery';
import { ActionBar } from '@gitroom/frontend/components/tadween/post-page/action.bar';

// Display names for the network mark; unknown identifiers fall back to the
// identifier itself.
const NETWORK_NAMES: Record<string, string> = {
  linkedin: 'LinkedIn',
  'linkedin-page': 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  'instagram-standalone': 'Instagram',
  threads: 'Threads',
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  'tiktok-business': 'TikTok',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  telegram: 'Telegram',
  discord: 'Discord',
  slack: 'Slack',
  gmb: 'Google Business',
  wordpress: 'WordPress',
  medium: 'Medium',
  devto: 'DEV',
  hashnode: 'Hashnode',
  dribbble: 'Dribbble',
  lemmy: 'Lemmy',
  nostr: 'Nostr',
  vk: 'VK',
  wrapcast: 'Warpcast',
  tumblr: 'Tumblr',
};

export const networkName = (identifier: string) =>
  NETWORK_NAMES[identifier] ||
  identifier.charAt(0).toUpperCase() + identifier.slice(1);

// Status of the post for a reader. A failed post never shows its error here:
// it reads as scheduled (future) or not published yet (past).
export const PostStatus: FC<{
  state: PublicPost['state'];
  date: string;
  compact?: boolean;
}> = ({ state, date, compact }) => {
  const t = useT();
  const [future, setFuture] = useState(true);
  useEffect(() => setFuture(new Date(date).getTime() > Date.now()), [date]);

  if (state === 'PUBLISHED') {
    return (
      <Pill tone="ok" icon="circle-check">
        {t('tdw_pp_published', 'Published')}
      </Pill>
    );
  }
  if (state === 'DRAFT') {
    return (
      <Pill icon="pencil">{t('tdw_pp_draft', 'Draft')}</Pill>
    );
  }
  if (state === 'ERROR' && !future) {
    return (
      <Pill icon="clock">{t('tdw_pp_not_published', 'Not published yet')}</Pill>
    );
  }
  return (
    <Pill tone="brand" icon="clock">
      {compact ? (
        t('tdw_pp_scheduled', 'Scheduled')
      ) : (
        <>
          {t('tdw_pp_scheduled_for', 'Scheduled for')}{' '}
          <LocalDate
            date={date}
            options={{ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }}
          />
        </>
      )}
    </Pill>
  );
};

// Channel picture, or its initials when the picture can't load (network CDN
// links expire).
export const AuthorAvatar: FC<{ name: string; src: string; size: number }> = ({
  name,
  src,
  size,
}) => {
  const [failed, setFailed] = useState(!src);
  const ref = useRef<HTMLImageElement>(null);
  // A picture that failed before hydration never fires onError in React.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && !img.naturalWidth) {
      setFailed(true);
    }
  }, []);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <span
      className="tdw-pp-avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {failed ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <img ref={ref} src={src} alt="" onError={() => setFailed(true)} />
      )}
    </span>
  );
};

export const NetworkMark: FC<{ identifier: string }> = ({ identifier }) => (
  <span className="tdw-pp-netmark">
    <img src={`/icons/platforms/${identifier}.png`} alt="" className="tdw-pp-net" />
    {networkName(identifier)}
  </span>
);

// Links in a post open in a new tab, so the review page stays open.
const openLinksOutside = (e: MouseEvent<HTMLDivElement>) => {
  const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
  if (!link || window.getSelection()?.toString()) {
    return;
  }
  e.preventDefault();
  window.open(link.href, '_blank', 'noopener,noreferrer');
};

export const PostCard: FC<{ post: PublicPost; withActions?: boolean }> = ({
  post,
  withActions = true,
}) => {
  const t = useT();
  const { integration, parts } = post;
  const thread = parts.length > 1;

  return (
    <article className="tdw-pp-card" aria-label={integration.name}>
      <header className="tdw-pp-author">
        <AuthorAvatar name={integration.name} src={integration.picture} size={48} />
        <div className="tdw-pp-author-id">
          <div className="tdw-pp-author-name">{integration.name}</div>
          <div className="tdw-pp-author-meta">
            {!!integration.profile && (
              <span className="tdw-pp-ellipsis tdw-pp-handle lbox">
                @{integration.profile}
              </span>
            )}
            <NetworkMark identifier={integration.providerIdentifier} />
          </div>
        </div>
        <div className="tdw-pp-author-status">
          <PostStatus state={post.state} date={post.publishDate} />
        </div>
      </header>

      <ol className={thread ? 'tdw-pp-parts is-thread' : 'tdw-pp-parts'}>
        {parts.map((part, index) => (
          <li key={part.id} className="tdw-pp-part">
            {thread && (
              <div className="tdw-pp-part-rail" aria-hidden="true">
                <AuthorAvatar
                  name={integration.name}
                  src={integration.picture}
                  size={28}
                />
                {index < parts.length - 1 && <span className="tdw-pp-part-line" />}
              </div>
            )}
            <div className="tdw-pp-part-body">
              {thread && (
                <div className="tdw-pp-part-count">
                  {t('tdw_pp_part_of', '{{index}} of {{count}}', {
                    index: index + 1,
                    count: parts.length,
                  })}
                </div>
              )}
              {!!part.html && (
                <div
                  className={index === 0 ? 'tdw-pp-text is-lead' : 'tdw-pp-text'}
                  onClick={openLinksOutside}
                >
                  <PostContentClient postId={part.id} html={part.html} />
                </div>
              )}
              {!!part.media.length && <MediaGallery media={part.media} />}
            </div>
          </li>
        ))}
      </ol>

      {withActions && <ActionBar previewId={post.id} />}
    </article>
  );
};
