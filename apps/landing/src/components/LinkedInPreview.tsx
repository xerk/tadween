import type { ReactNode } from 'react';
import type { LinkedInLabels, PostAuthor } from '@/content/types';
import { Icon, cx } from './Icon';

/* Rich text the way LinkedIn renders it: #hashtags, @mentions and links in LinkedIn blue. */
function richText(text: string) {
  const parts = text.split(/(#[\p{L}\p{N}_]+|https?:\/\/\S+)/u);
  return parts.map((p, i) => (i % 2 ? <span key={i} className="pz-li-link">{p}</span> : p));
}

/** LinkedInPreview: the post as LinkedIn's feed will show it, ported from the design
    system's preview.tsx. It deliberately uses LinkedIn's own feed palette (--li-*) rather
    than Tadween tokens, because a preview shows the destination. */
export function LinkedInPreview({
  author,
  labels,
  text,
  device = 'desktop',
  dir,
  metrics = { reactions: '128', comments: '14', reposts: '6' },
  className,
  textSlot,
  media,
  avatarSize,
  lang,
  ...rest
}: {
  author: PostAuthor;
  labels: LinkedInLabels;
  text?: string;
  device?: 'desktop' | 'mobile';
  dir?: 'ltr' | 'rtl';
  metrics?: { reactions: string; comments: string; reposts: string };
  className?: string;
  /** Replaces the text paragraph (the flow section types into its own). */
  textSlot?: ReactNode;
  media?: ReactNode;
  avatarSize?: number;
  lang?: string;
  [data: `data-${string}`]: string | boolean | undefined;
}) {
  const size = avatarSize ?? (device === 'mobile' ? 40 : 48);
  return (
    <article className={cx('pz-li', `is-${device}`, className)} dir={dir} lang={lang} {...rest}>
      <header className="pz-li-head">
        <span className="pz-avatar pz-li-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
          {author.initials}
        </span>
        <div className="pz-li-who">
          <div className="pz-li-name">
            {author.name}
            <span className="pz-li-degree"> • {labels.you}</span>
          </div>
          <div className="pz-li-sub">{author.headline}</div>
          <div className="pz-li-sub pz-li-time">
            {labels.now} • <Icon name="globe" size={12} label={labels.visibleToAnyone} />
          </div>
        </div>
        <Icon name="ellipsis" size={20} className="pz-li-more-ico" />
      </header>
      <div className="pz-li-body">{textSlot ?? <p className="pz-li-text">{richText(text ?? '')}</p>}</div>
      {media}
      <div className="pz-li-counts">
        <span className="pz-li-reacts" aria-hidden="true">
          <i className="r-like">
            <Icon name="thumbs-up" size={9} />
          </i>
          <i className="r-celebrate" />
          <i className="r-love" />
        </span>
        <span>{metrics.reactions}</span>
        <span className="pz-li-counts-end">
          {metrics.comments} {labels.comments} • {metrics.reposts} {labels.reposts}
        </span>
      </div>
      <footer className="pz-li-actions">
        {(['thumbs-up', 'message-square', 'repeat-2', 'send'] as const).map((ic, i) => (
          <span key={ic} className="pz-li-action">
            <Icon name={ic} size={device === 'mobile' ? 18 : 20} />
            <span>{labels.actions[i]}</span>
          </span>
        ))}
      </footer>
    </article>
  );
}

/** Neutral placeholder artwork for previews without an uploaded image. */
export function MediaArt() {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="pz-art">
      <rect width="400" height="200" className="a0" />
      <rect x="40" y="40" width="130" height="130" rx="14" className="a1" />
      <rect x="190" y="70" width="170" height="100" rx="14" className="a2" />
      <circle cx="300" cy="42" r="20" className="a3" />
    </svg>
  );
}
