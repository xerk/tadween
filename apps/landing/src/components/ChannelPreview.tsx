import type { CSSProperties } from 'react';
import type { ChannelCopy, Dict, PostAuthor } from '@/content/types';
import type { ChannelFacts } from '@/lib/channels';
import { Icon, cx } from './Icon';
import { LinkedInPreview, MediaArt } from './LinkedInPreview';

/* Mini previews of a post on each kind of network. Like LinkedInPreview, they use the
   destination's own accent (--net) rather than Tadween's tokens, because a preview shows
   where the post is going. They're illustrations: simple, neutral chrome, no network UI
   copied pixel for pixel. */

const accent = (c: string) => ({ ['--net' as string]: c }) as CSSProperties;

function Who({ author, icon, name, sub }: { author: PostAuthor; icon: string; name: string; sub: string }) {
  return (
    <header className="pz-np-head">
      <span className="pz-avatar pz-np-avatar" aria-hidden="true">
        {author.initials}
      </span>
      <span className="pz-np-who">
        <strong>{author.name}</strong>
        <span>{sub}</span>
      </span>
      <img className="pz-np-net" src={icon} width={18} height={18} alt={name} />
    </header>
  );
}

/** A short post in a feed (X, Threads, Bluesky, Mastodon, Facebook, Google Business). */
export function FeedPreview({ author, text, icon, name, color, media, className, ...rest }: {
  author: PostAuthor;
  text: string;
  icon: string;
  name: string;
  color: string;
  media?: boolean;
  className?: string;
  [data: `data-${string}`]: string | undefined;
}) {
  return (
    <article className={cx('pz-np', 'is-feed', className)} style={accent(color)} {...rest}>
      <Who author={author} icon={icon} name={name} sub={name} />
      <p className="pz-np-text">{text}</p>
      {media ? (
        <div className="pz-np-media">
          <MediaArt />
        </div>
      ) : null}
      <footer className="pz-np-actions" aria-hidden="true">
        <Icon name="message-square" size={16} />
        <Icon name="repeat-2" size={16} />
        <Icon name="thumbs-up" size={16} />
        <Icon name="send" size={16} />
      </footer>
    </article>
  );
}

function PhotoPreview({ facts, author, text }: { facts: ChannelFacts; author: PostAuthor; text: string }) {
  return (
    <article className="pz-np is-photo" style={accent(facts.accent)}>
      <Who author={author} icon={facts.icon} name={facts.name} sub={facts.name} />
      <div className="pz-np-media is-square">
        <MediaArt />
      </div>
      <p className="pz-np-text">{text}</p>
    </article>
  );
}

function VideoPreview({ facts, author, text }: { facts: ChannelFacts; author: PostAuthor; text: string }) {
  const short = facts.preview === 'short';
  return (
    <article className={cx('pz-np', 'is-video', short && 'is-short')} style={accent(facts.accent)}>
      <div className="pz-np-video">
        <MediaArt />
        <span className="pz-np-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </span>
        {short ? <p className="pz-np-caption">{text}</p> : null}
      </div>
      {short ? null : (
        <div className="pz-np-vmeta">
          <span className="pz-avatar pz-np-avatar" aria-hidden="true">
            {author.initials}
          </span>
          <span className="pz-np-who">
            <strong>{text}</strong>
            <span>{author.name}</span>
          </span>
        </div>
      )}
    </article>
  );
}

function ChatPreview({ facts, author, text }: { facts: ChannelFacts; author: PostAuthor; text: string }) {
  return (
    <article className="pz-np is-chat" style={accent(facts.accent)}>
      <header className="pz-np-chan">
        <img src={facts.icon} width={18} height={18} alt={facts.name} />
        <strong># announcements</strong>
      </header>
      <div className="pz-np-msg">
        <span className="pz-avatar pz-np-avatar" aria-hidden="true">
          {author.initials}
        </span>
        <div>
          <strong>{author.name}</strong>
          <p className="pz-np-text">{text.replace(/\*\*/g, '')}</p>
        </div>
      </div>
    </article>
  );
}

function ArticlePreview({ facts, author, text }: { facts: ChannelFacts; author: PostAuthor; text: string }) {
  return (
    <article className="pz-np is-article" style={accent(facts.accent)}>
      <div className="pz-np-media is-cover">
        <MediaArt />
      </div>
      <div className="pz-np-body">
        <h3 className="pz-np-title">{text}</h3>
        <Who author={author} icon={facts.icon} name={facts.name} sub={facts.name} />
        <span className="pz-np-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </article>
  );
}

/** The preview for one channel page, with a character count against the network's limit. */
export function ChannelPreview({ t, facts, copy }: { t: Dict; facts: ChannelFacts; copy: ChannelCopy }) {
  const author = t.channels.page.previewAuthor;
  const text = copy.sample;
  const used = Array.from(text).length;
  const fmt = new Intl.NumberFormat(t.numberLocale);
  let preview;
  switch (facts.preview) {
    case 'linkedin':
      preview = <LinkedInPreview author={author} labels={t.linkedin} text={text} dir={t.dir} metrics={t.lang === 'ar' ? { reactions: '١٢٨', comments: '١٤', reposts: '٦' } : undefined} media={<div className="pz-flow-media"><MediaArt /></div>} />;
      break;
    case 'photo':
      preview = <PhotoPreview facts={facts} author={author} text={text} />;
      break;
    case 'video':
    case 'short':
      preview = <VideoPreview facts={facts} author={author} text={text} />;
      break;
    case 'chat':
      preview = <ChatPreview facts={facts} author={author} text={text} />;
      break;
    case 'article':
      preview = <ArticlePreview facts={facts} author={author} text={text} />;
      break;
    default:
      preview = <FeedPreview author={author} text={text} icon={facts.icon} name={facts.name} color={facts.accent} media />;
  }
  return (
    <figure className="pz-cprev">
      <div className="pz-cprev-stage" aria-hidden="true">
        {preview}
      </div>
      <figcaption className="pz-cprev-cap">
        <span className="pz-cprev-count time">
          <span className="pz-cprev-bar" style={{ ['--fill' as string]: Math.min(1, used / facts.limit) }} />
          {fmt.format(used)} / {fmt.format(facts.limit)}
        </span>
        <span className="caption pz-muted">{t.channels.page.previewNote}</span>
      </figcaption>
    </figure>
  );
}
