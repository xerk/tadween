import type { ReactNode } from 'react';
import type { Dict } from '@/content/types';
import { Icon, cx } from './Icon';
import type { IconName } from './icons';

// The hero showcase: example posts the way each network's feed shows them, each with the
// Tadween status it would have, drifting slowly in two columns. Ported from the app's
// sign-in page (apps/frontend/src/components/tadween/auth/auth.brand.tsx) so the site and
// the app tell the same story. The brands are made up and the photos are Unsplash
// (public/showcase/README.md). Post bodies stay in their own language; only the feed
// chrome and the status chips follow the page. Motion is CSS and stops under
// prefers-reduced-motion. The site shows only Tadween's focus networks here (LinkedIn,
// Instagram, Facebook, Threads, YouTube), so it no longer matches the sign-in page card for card.

type Network = 'linkedin' | 'instagram' | 'facebook' | 'threads' | 'youtube';

interface ShowcasePost {
  id: string;
  network: Network;
  brand: string;
  handle: string;
  initials: string;
  color: string;
  lang: 'en' | 'ar';
  text: string;
  image: { src: string; width: number; height: number };
  status: 'scheduled' | 'published';
  stats?: { a: string; b?: string; c?: string };
  /** A video's length, for the YouTube card. */
  duration?: string;
}

const img = (name: string, width: number, height: number) => ({ src: `/showcase/${name}.webp`, width, height });

const POSTS: ShowcasePost[][] = [
  [
    { id: 'rakeeza', network: 'youtube', brand: 'Rakeeza', handle: '@rakeeza_dev', initials: 'R', color: '#1f2937', lang: 'en', text: 'Arabic-first invoices in Rakeeza: right-to-left PDFs and Hijri dates in 3 minutes', image: img('desk', 800, 450), status: 'published', stats: { a: '38K' }, duration: '3:12' },
    { id: 'qolla', network: 'instagram', brand: 'Qolla Ceramics', handle: 'qolla.ceramics', initials: 'Q', color: '#b45309', lang: 'ar', text: 'تشكيلة الجليز الجديدة: أخضر النيل ولون الرمل 🌿 الحجز يبدأ الخميس من الموقع.', image: img('ceramics', 720, 720), status: 'scheduled' },
    { id: 'sett', network: 'facebook', brand: 'مطبخ ستّ الحُسن', handle: '', initials: 'س', color: '#be123c', lang: 'ar', text: 'كشري الجمعة رجع 🍋 التوصيل متاح من ١٢ الظهر لحد ١٢ بالليل في مدينة نصر والتجمع.', image: img('koshary', 800, 640), status: 'published', stats: { a: '2.3K', b: '184', c: '96' } },
  ],
  [
    { id: 'maadi', network: 'linkedin', brand: 'Maadi Lane Homes', handle: '', initials: 'ML', color: '#0b7062', lang: 'ar', text: 'بدأنا النهاردة تسليم المرحلة الأولى في المعادي 🔑 ٤٨ شقة بتشطيب كامل وإطلالة على الحديقة. شكرًا لكل عميل وثق فينا.', image: img('living-room', 800, 560), status: 'scheduled' },
    { id: 'felucca', network: 'instagram', brand: 'Felucca Hours', handle: 'feluccahours', initials: 'FH', color: '#0e7490', lang: 'en', text: 'Sunset sail from Garden City, tea on board 🌅 #Cairo #Nile', image: img('nile-felucca', 540, 960), status: 'published' },
    { id: 'bunn', network: 'threads', brand: 'Bunn Café', handle: 'bunn.cafe', initials: 'B', color: '#7c2d12', lang: 'en', text: 'Quiet tables, loud flavour. A new single origin from Harar is on the bar in Zamalek this week ☕', image: img('latte', 640, 800), status: 'scheduled' },
  ],
];


const Stat = ({ icon, value }: { icon: IconName; value?: ReactNode }) => (
  <span className="sc-stat">
    <Icon name={icon} size={17} />
    {value ? <span>{value}</span> : null}
  </span>
);

/** Monogram avatar with the network's mark on its corner, like a channel avatar in the app. */
const Avatar = ({ post, size, square }: { post: ShowcasePost; size: number; square?: boolean }) => (
  <span className={cx('sc-avatar', square && 'is-square')} style={{ width: size, height: size, background: post.color }}>
    <span style={{ fontSize: Math.round(size * 0.38) }}>{post.initials}</span>
    <img className="sc-network" src={`/channels/${post.network}.png`} alt="" width={16} height={16} />
  </span>
);

/** Feeds crop tall pictures to 4:5; `is-portrait` does the same. */
const Photo = ({ post, className }: { post: ShowcasePost; className?: string }) => (
  <img className={cx('sc-photo', post.image.height > post.image.width * 1.25 && 'is-portrait', className)} src={post.image.src} alt="" width={post.image.width} height={post.image.height} loading="lazy" decoding="async" />
);

const Body = ({ post, className, children }: { post: ShowcasePost; className?: string; children?: ReactNode }) => (
  <p className={cx('sc-text', className)} lang={post.lang}>
    {children}
    {post.text}
  </p>
);

function Card({ post, t }: { post: ShowcasePost; t: Dict }) {
  const c = t.showcase;
  const s = post.stats;
  let content: ReactNode;
  switch (post.network) {
    case 'linkedin':
      content = (
        <>
          <div className="sc-head">
            <Avatar post={post} size={44} square />
            <div className="sc-who is-stacked">
              <b>{post.brand}</b>
              <small>{c.followers}</small>
              <small>
                {c.now} · <Icon name="globe" size={12} />
              </small>
            </div>
          </div>
          <Body post={post} className="is-padded" />
          <Photo post={post} />
          <div className="sc-bar">
            <Stat icon="thumbs-up" value={c.like} />
            <Stat icon="message-circle" value={c.comment} />
            <Stat icon="repeat-2" value={c.repost} />
            <Stat icon="send" value={c.send} />
          </div>
        </>
      );
      break;
    case 'instagram':
      content = (
        <>
          <div className="sc-head is-compact">
            <span className="sc-ring">
              <Avatar post={post} size={30} />
            </span>
            <div className="sc-who is-stacked">
              <b>{post.handle}</b>
              <small>{c.location}</small>
            </div>
            <Icon name="ellipsis" size={18} />
          </div>
          <Photo post={post} />
          <div className="sc-stats is-ig">
            <Stat icon="heart" />
            <Stat icon="message-circle" />
            <Stat icon="send" />
            <span className="sc-push" />
            <Stat icon="bookmark" />
          </div>
          <Body post={post} className="is-padded is-caption">
            <b>{post.handle}</b>{' '}
          </Body>
        </>
      );
      break;
    case 'facebook':
      content = (
        <>
          <div className="sc-head">
            <Avatar post={post} size={40} />
            <div className="sc-who is-stacked">
              <b>{post.brand}</b>
              <small>
                {c.yesterday} · <Icon name="globe" size={12} />
              </small>
            </div>
          </div>
          <Body post={post} className="is-padded" />
          <Photo post={post} />
          <div className="sc-counts">
            <span className="sc-reactions">
              <span className="is-like">
                <Icon name="thumbs-up" size={10} />
              </span>
              <span className="is-love">
                <Icon name="heart" size={10} />
              </span>
              {s?.a}
            </span>
            <span>{c.commentsShares.replace('{c}', s?.b ?? '').replace('{s}', s?.c ?? '')}</span>
          </div>
          <div className="sc-bar">
            <Stat icon="thumbs-up" value={c.like} />
            <Stat icon="message-circle" value={c.comment} />
            <Stat icon="share" value={c.share} />
          </div>
        </>
      );
      break;
    case 'threads':
      content = (
        <div className="sc-x">
          <Avatar post={post} size={36} />
          <div className="sc-main">
            <div className="sc-who">
              <b>{post.handle}</b>
              <small>{c.now}</small>
            </div>
            <Body post={post} />
            <Photo post={post} className="is-rounded" />
            <div className="sc-stats">
              <Stat icon="heart" />
              <Stat icon="message-circle" />
              <Stat icon="repeat-2" />
              <Stat icon="send" />
            </div>
          </div>
        </div>
      );
      break;
    case 'youtube':
      content = (
        <>
          <div className="sc-yt-thumb">
            <Photo post={post} />
            <span className="sc-yt-time">{post.duration}</span>
          </div>
          <div className="sc-head sc-yt-meta">
            <Avatar post={post} size={36} />
            <div className="sc-who is-stacked">
              <b className="sc-yt-title">{post.text}</b>
              <small>
                {post.brand} · {c.views.replace('{n}', s?.a ?? '')}
              </small>
            </div>
          </div>
        </>
      );
      break;
  }

  // The status chip is Tadween UI (page language); the card is the network's feed in the
  // post's own language and direction.
  return (
    <div className="sc-item">
      <span className={cx('sc-status', `is-${post.status}`)}>
        <Icon name={post.status === 'scheduled' ? 'clock' : 'circle-check'} size={13} />
        {c.status[post.id]}
      </span>
      <article className={cx('sc-card', `is-${post.network}`)} dir={post.lang === 'ar' ? 'rtl' : 'ltr'} lang={post.lang}>
        {content}
      </article>
    </div>
  );
}

export function PostShowcase({ t }: { t: Dict }) {
  return (
    <div className="sc-stage" aria-hidden="true">
      {POSTS.map((column, index) => (
        <div key={index} className={cx('sc-column', index % 2 === 1 && 'is-down')}>
          {/* rendered twice so the slow loop has no seam */}
          <div className="sc-track">
            {[...column, ...column].map((post, i) => (
              <Card key={`${post.id}-${i}`} post={post} t={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
