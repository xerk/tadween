'use client';

// Brand side of the auth layout: example posts the way each network's feed
// shows them (X, LinkedIn, Instagram, Facebook, Threads, TikTok), each with the
// Tadween status it would have (scheduled / published), drifting slowly in two
// columns, plus the bilingual tagline. Presentation only: the brands are made
// up, the photos are Unsplash (public/tadween/auth/README.md), and the post
// bodies are content in their own language, so only the feed chrome is
// translated. Motion lives in app/tadween/auth.scss and stops under
// prefers-reduced-motion. On phones the pane becomes a short band below the form.
import { FC, ReactNode } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { cx, Icon, IconName } from '@gitroom/frontend/components/tadween/ui';

type Network = 'x' | 'linkedin' | 'instagram' | 'facebook' | 'threads' | 'tiktok';

interface ShowcasePost {
  network: Network;
  brand: string;
  handle: string;
  initials: string;
  color: string;
  lang: 'en' | 'ar';
  text: string;
  image: { src: string; width: number; height: number };
  status: 'scheduled' | 'published';
  // translation key + default for the status chip
  when: [string, string];
  // feed numbers, published posts only
  stats?: { a: string; b: string; c: string; d?: string };
}

const POSTS: ShowcasePost[][] = [
  [
    {
      network: 'x',
      brand: 'Rakeeza',
      handle: '@rakeeza_dev',
      initials: 'R',
      color: '#1f2937',
      lang: 'en',
      text: 'Arabic-first invoices are live: right-to-left PDFs, Hijri dates and EGP formatting out of the box. Rolling out to every workspace this week.',
      image: { src: '/tadween/auth/desk.webp', width: 800, height: 450 },
      status: 'published',
      when: ['tdw_auth_showcase_published_2h', 'Published · 2h ago'],
      stats: { a: '48', b: '212', c: '1.4K', d: '38K' },
    },
    {
      network: 'instagram',
      brand: 'Qolla Ceramics',
      handle: 'qolla.ceramics',
      initials: 'Q',
      color: '#b45309',
      lang: 'ar',
      text: 'تشكيلة الجليز الجديدة: أخضر النيل ولون الرمل 🌿 الحجز يبدأ الخميس من الموقع.',
      image: { src: '/tadween/auth/ceramics.webp', width: 720, height: 720 },
      status: 'scheduled',
      when: ['tdw_auth_showcase_scheduled_thu', 'Scheduled · Thu 18:00'],
    },
    {
      network: 'facebook',
      brand: 'مطبخ ستّ الحُسن',
      handle: '',
      initials: 'س',
      color: '#be123c',
      lang: 'ar',
      text: 'كشري الجمعة رجع 🍋 التوصيل متاح من ١٢ الظهر لحد ١٢ بالليل في مدينة نصر والتجمع.',
      image: { src: '/tadween/auth/koshary.webp', width: 800, height: 640 },
      status: 'published',
      when: ['tdw_auth_showcase_published_yesterday', 'Published · Yesterday'],
      stats: { a: '2.3K', b: '184', c: '96' },
    },
  ],
  [
    {
      network: 'linkedin',
      brand: 'Maadi Lane Homes',
      handle: '',
      initials: 'ML',
      color: '#0b7062',
      lang: 'ar',
      text: 'بدأنا النهاردة تسليم المرحلة الأولى في المعادي 🔑 ٤٨ شقة بتشطيب كامل وإطلالة على الحديقة. شكرًا لكل عميل وثق فينا.',
      image: { src: '/tadween/auth/living-room.webp', width: 800, height: 560 },
      status: 'scheduled',
      when: ['tdw_auth_showcase_scheduled_tue', 'Scheduled · Tue 09:30'],
    },
    {
      network: 'tiktok',
      brand: 'Felucca Hours',
      handle: '@feluccahours',
      initials: 'FH',
      color: '#0e7490',
      lang: 'en',
      text: 'Sunset sail from Garden City, tea on board 🌅 #Cairo #Nile',
      image: { src: '/tadween/auth/nile-felucca.webp', width: 540, height: 960 },
      status: 'published',
      when: ['tdw_auth_showcase_published_5h', 'Published · 5h ago'],
      stats: { a: '48.2K', b: '1,032', c: '3,410', d: '912' },
    },
    {
      network: 'threads',
      brand: 'Bunn Café',
      handle: 'bunn.cafe',
      initials: 'B',
      color: '#7c2d12',
      lang: 'en',
      text: 'Quiet tables, loud flavour. A new single origin from Harar is on the bar in Zamalek this week ☕',
      image: { src: '/tadween/auth/latte.webp', width: 640, height: 800 },
      status: 'scheduled',
      when: ['tdw_auth_showcase_scheduled_fri', 'Scheduled · Fri 08:00'],
    },
  ],
];

/* Glyphs the kit has no icon for (Lucide, ISC) */
const GLYPHS = {
  heart: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  bookmark: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
};

const Glyph: FC<{ name: keyof typeof GLYPHS | IconName; size?: number }> = ({
  name,
  size = 18,
}) =>
  name in GLYPHS ? (
    <svg
      className="pz-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={GLYPHS[name as keyof typeof GLYPHS]} />
    </svg>
  ) : (
    <Icon name={name as IconName} size={size} />
  );

const Stat: FC<{ icon: keyof typeof GLYPHS | IconName; value?: ReactNode }> = ({
  icon,
  value,
}) => (
  <span className="tdw-sc-stat">
    <Glyph name={icon} />
    {value ? <span>{value}</span> : null}
  </span>
);

/* Monogram avatar with the network's mark on its corner, like a channel avatar */
const Avatar: FC<{ post: ShowcasePost; size: number; square?: boolean }> = ({
  post,
  size,
  square,
}) => (
  <span
    className={cx('tdw-sc-avatar', square && 'is-square')}
    style={{ width: size, height: size, background: post.color }}
  >
    <span style={{ fontSize: Math.round(size * 0.38) }}>{post.initials}</span>
    <img
      className="tdw-sc-network"
      src={`/icons/platforms/${post.network}.png`}
      alt=""
      width={16}
      height={16}
    />
  </span>
);

const Photo: FC<{ post: ShowcasePost; className?: string }> = ({
  post,
  className,
}) => (
  <img
    className={cx('tdw-sc-photo', className)}
    src={post.image.src}
    alt=""
    width={post.image.width}
    height={post.image.height}
    decoding="async"
  />
);

const Body: FC<{ post: ShowcasePost; className?: string; children?: ReactNode }> = ({
  post,
  className,
  children,
}) => (
  <p className={cx('tdw-sc-text', className)} lang={post.lang}>
    {children}
    {post.text}
  </p>
);

const Card: FC<{ post: ShowcasePost }> = ({ post }) => {
  const t = useT();
  const s = post.stats;
  const ago = (key: string, count: number, unit: string) =>
    t(key, `{{count}}${unit}`, { count });

  let content: ReactNode;
  switch (post.network) {
    case 'x':
      content = (
        <div className="tdw-sc-x">
          <Avatar post={post} size={40} />
          <div className="tdw-sc-main">
            <div className="tdw-sc-who">
              <b>{post.brand}</b>
              <span className="tdw-sc-verified" aria-hidden="true">
                <Icon name="badge-check" size={16} />
              </span>
              <small>
                {post.handle} · {ago('tdw_auth_preview_ago_h', 2, 'h')}
              </small>
            </div>
            <Body post={post} />
            <Photo post={post} className="is-rounded" />
            <div className="tdw-sc-stats is-spread">
              <Stat icon="message-circle" value={s?.a} />
              <Stat icon="repeat-2" value={s?.b} />
              <Stat icon="heart" value={s?.c} />
              <Stat icon="chart-column" value={s?.d} />
              <Stat icon="share" />
            </div>
          </div>
        </div>
      );
      break;
    case 'linkedin':
      content = (
        <>
          <div className="tdw-sc-head">
            <Avatar post={post} size={44} square />
            <div className="tdw-sc-who is-stacked">
              <b>{post.brand}</b>
              <small>
                {t('tdw_auth_preview_followers', '{{value}} followers', {
                  value: '12,480',
                })}
              </small>
              <small>
                {t('tdw_auth_preview_now', 'Now')} ·{' '}
                <Icon name="globe" size={12} />
              </small>
            </div>
          </div>
          <Body post={post} className="is-padded" />
          <Photo post={post} />
          <div className="tdw-sc-bar">
            <Stat icon="thumbs-up" value={t('tdw_auth_preview_like', 'Like')} />
            <Stat icon="message-circle" value={t('tdw_auth_preview_comment', 'Comment')} />
            <Stat icon="repeat-2" value={t('tdw_auth_preview_repost', 'Repost')} />
            <Stat icon="send" value={t('tdw_auth_preview_send', 'Send')} />
          </div>
        </>
      );
      break;
    case 'instagram':
      content = (
        <>
          <div className="tdw-sc-head is-compact">
            <span className="tdw-sc-ring">
              <Avatar post={post} size={30} />
            </span>
            <div className="tdw-sc-who is-stacked">
              <b>{post.handle}</b>
              <small>{t('tdw_auth_preview_location', 'Zamalek, Cairo')}</small>
            </div>
            <Icon name="ellipsis" size={18} />
          </div>
          <Photo post={post} />
          <div className="tdw-sc-stats is-ig">
            <Stat icon="heart" />
            <Stat icon="message-circle" />
            <Stat icon="send" />
            <span className="tdw-sc-push" />
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
          <div className="tdw-sc-head">
            <Avatar post={post} size={40} />
            <div className="tdw-sc-who is-stacked">
              <b>{post.brand}</b>
              <small>
                {t('tdw_auth_preview_yesterday', 'Yesterday')} ·{' '}
                <Icon name="globe" size={12} />
              </small>
            </div>
          </div>
          <Body post={post} className="is-padded" />
          <Photo post={post} />
          <div className="tdw-sc-counts">
            <span className="tdw-sc-reactions">
              <span className="is-like">
                <Icon name="thumbs-up" size={10} />
              </span>
              <span className="is-love">
                <Glyph name="heart" size={10} />
              </span>
              {s?.a}
            </span>
            <span>
              {t('tdw_auth_preview_comments_count', '{{value}} comments', {
                value: s?.b,
              })}{' '}
              ·{' '}
              {t('tdw_auth_preview_shares_count', '{{value}} shares', {
                value: s?.c,
              })}
            </span>
          </div>
          <div className="tdw-sc-bar">
            <Stat icon="thumbs-up" value={t('tdw_auth_preview_like', 'Like')} />
            <Stat icon="message-circle" value={t('tdw_auth_preview_comment', 'Comment')} />
            <Stat icon="share" value={t('tdw_auth_preview_share', 'Share')} />
          </div>
        </>
      );
      break;
    case 'threads':
      content = (
        <div className="tdw-sc-x">
          <Avatar post={post} size={36} />
          <div className="tdw-sc-main">
            <div className="tdw-sc-who">
              <b>{post.handle}</b>
              <small>{t('tdw_auth_preview_now', 'Now')}</small>
            </div>
            <Body post={post} />
            <Photo post={post} className="is-rounded is-tall" />
            <div className="tdw-sc-stats">
              <Stat icon="heart" />
              <Stat icon="message-circle" />
              <Stat icon="repeat-2" />
              <Stat icon="send" />
            </div>
          </div>
        </div>
      );
      break;
    case 'tiktok':
      content = (
        <div className="tdw-sc-tt">
          <Photo post={post} />
          <div className="tdw-sc-tt-rail">
            <Avatar post={post} size={36} />
            <Stat icon="heart" value={s?.a} />
            <Stat icon="message-circle" value={s?.b} />
            <Stat icon="bookmark" value={s?.c} />
            <Stat icon="share" value={s?.d} />
          </div>
          <div className="tdw-sc-tt-caption lbox" lang="en">
            <b>{post.handle}</b>
            <span>{post.text}</span>
            <small>
              <Glyph name="music" size={12} /> {post.brand} · original sound
            </small>
          </div>
        </div>
      );
      break;
  }

  // The status chip is Tadween UI (page language); the card is the network's
  // feed in the post's own language and direction.
  return (
    <div className="tdw-sc-item">
      <span className={cx('tdw-sc-status', `is-${post.status}`)}>
        <Icon name={post.status === 'scheduled' ? 'clock' : 'circle-check'} size={13} />
        {t(post.when[0], post.when[1])}
      </span>
      <article
        className={cx('tdw-sc-card', `is-${post.network}`, post.lang === 'en' && 'lbox')}
        dir={post.lang === 'ar' ? 'rtl' : undefined}
        lang={post.lang}
      >
        {content}
      </article>
    </div>
  );
};

export const AuthBrand: FC = () => {
  const t = useT();
  return (
    <aside className="tdw-auth-brand">
      <div className="tdw-auth-stage" aria-hidden="true">
        {POSTS.map((column, index) => (
          <div key={index} className={cx('tdw-sc-column', index % 2 && 'is-down')}>
            {/* rendered twice so the slow loop has no seam */}
            <div className="tdw-sc-track">
              {[...column, ...column].map((post, i) => (
                <Card key={`${post.network}-${i}`} post={post} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="tdw-auth-tagline">
        <p className="tdw-auth-networks" aria-hidden="true">
          {(['linkedin', 'x', 'instagram', 'facebook', 'threads', 'tiktok'] as Network[]).map(
            (network) => (
              <img
                key={network}
                src={`/icons/platforms/${network}.png`}
                alt=""
                width={20}
                height={20}
              />
            )
          )}
          <span>{t('tdw_auth_showcase_channels', 'One calendar for every channel')}</span>
        </p>
        {/* The tagline is a bilingual lockup on purpose: English, then Arabic, in every UI language.
            `lbox` keeps the English line LTR on Arabic pages (global.scss flips [dir=ltr]). */}
        <p className="is-en lbox" lang="en">
          Your week of posts, written and scheduled.
        </p>
        <p className="is-ar" lang="ar" dir="rtl">
          أسبوعك من المنشورات، مكتوب ومجدول.
        </p>
      </div>
    </aside>
  );
};
