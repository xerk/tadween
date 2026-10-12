'use client';

// Tadween public post page (/p/:id): the permalink of one post, laid out like
// a post page on a social network. The post is the hero card; the side column
// holds its details and how it will look on the network. Comments are the
// existing preview comments (same endpoints, same permissions).
// Styles: app/tadween/post-page.scss. Docs: docs/tadween/post-page.md.
import { FC, KeyboardEvent, MouseEvent, ReactNode, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { useTranslation } from 'react-i18next';
import { PreviewCommentsProvider } from '@gitroom/frontend/components/preview/preview.comments.context';
import { CopyClient } from '@gitroom/frontend/components/preview/copy.client';
import { CreationMethodBadge } from '@gitroom/frontend/components/launches/creation.method.badge';
import { useInstanceSettings } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { Icon, TadweenScope } from '@gitroom/frontend/components/tadween/ui';
import {
  PostCard,
  PostStatus,
} from '@gitroom/frontend/components/tadween/post-page/post.card';
import { LocalDate } from '@gitroom/frontend/components/tadween/post-page/post.time';
import { CommentThread } from '@gitroom/frontend/components/tadween/post-page/comment.thread';
import { NetworkPreview } from '@gitroom/frontend/components/tadween/post-page/network.preview';

const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  { ssr: false }
);
// The flag depends on the language, which is only reliable in the browser.
const LanguageComponent = dynamic(
  () =>
    import('@gitroom/frontend/components/layout/language.component').then(
      (mod) => mod.LanguageComponent
    ),
  { ssr: false }
);

export interface PublicPostMedia {
  id: string;
  path: string;
  thumbnail: string | null;
  alt: string | null;
}

export interface PublicPostPart {
  id: string;
  /** Sanitised HTML, as stored (what the network previews render). */
  content: string;
  /** Sanitised HTML with links and hashtags marked, for the hero card. */
  html: string;
  media: PublicPostMedia[];
}

export interface PublicPost {
  id: string;
  organizationId: string;
  publishDate: string;
  state: 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT';
  creationMethod: string | null;
  integration: {
    name: string;
    picture: string;
    providerIdentifier: string;
    profile: string;
  };
  parts: PublicPostPart[];
}

// The theme and language controls are Postiz's own components; the pill
// forwards its clicks to them (same pattern as the account menu).
const clickHost = (e: MouseEvent<HTMLDivElement>) => {
  const host = e.currentTarget.firstElementChild as HTMLElement | null;
  if (host && !host.contains(e.target as Node)) {
    host.click();
  }
};
const pressHost = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.key !== 'Enter' && e.key !== ' ') {
    return;
  }
  e.preventDefault();
  (e.currentTarget.firstElementChild as HTMLElement | null)?.click();
};

const HostButton: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={label}
    title={label}
    className="tdw-pp-host"
    onClick={clickHost}
    onKeyDown={pressHost}
  >
    {children}
  </div>
);

export const PostTopBar: FC<{ share: boolean }> = ({ share }) => {
  const t = useT();
  const user = useUser();
  const { data: settings } = useInstanceSettings();
  const brand = settings?.branding?.instanceName || 'Tadween';
  const { i18n } = useTranslation();
  // The server shares one i18next instance, so the language is read after mount.
  const [language, setLanguage] = useState('');
  useEffect(
    () => setLanguage((i18n.resolvedLanguage || 'en').toUpperCase()),
    [i18n.resolvedLanguage]
  );
  const canSignUp = settings?.registration?.mode === 'open';

  return (
    <header className="tdw-pp-top">
      <div className="tdw-pp-top-in">
        <Link href="/" className="tdw-pp-brand" aria-label={brand}>
          <Logo />
          <span className="tdw-pp-brand-name">{brand}</span>
        </Link>
        <div className="tdw-pp-top-actions">
          {share && (
            <div className="tdw-pp-share-client">
              <CopyClient />
            </div>
          )}
          <HostButton label={t('tdw_pp_appearance', 'Appearance')}>
            <ModeComponent />
          </HostButton>
          <HostButton label={t('change_language', 'Change Language')}>
            <LanguageComponent />
            <span className="tdw-pp-host-text">{language}</span>
          </HostButton>
          {user?.id ? (
            <Link href="/" className="pz-btn pz-btn-secondary pz-btn-sm no-underline">
              {t('tdw_pp_open_app', 'Open {{brand}}', { brand })}
            </Link>
          ) : canSignUp ? (
            <Link
              href="/auth"
              className="pz-btn pz-btn-primary pz-btn-sm no-underline tdw-pp-cta"
            >
              <Icon name="sparkles" size={14} />
              <span className="tdw-pp-cta-long">
                {t('tdw_pp_create_your_own', 'Create your own with {{brand}}', {
                  brand,
                })}
              </span>
              <span className="tdw-pp-cta-short">
                {t('tdw_pp_try_brand', 'Try {{brand}}', { brand })}
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
};

const DetailRow: FC<{ label: ReactNode; children: ReactNode }> = ({
  label,
  children,
}) => (
  <div className="tdw-pp-detail">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

export const PostDetails: FC<{ post: PublicPost }> = ({ post }) => {
  const t = useT();
  const media = post.parts.reduce((all, p) => all + p.media.length, 0);
  const published = post.state === 'PUBLISHED';
  return (
    <section className="tdw-pp-panel" aria-labelledby="tdw-pp-details">
      <h2 id="tdw-pp-details" className="tdw-pp-panel-h">
        {t('tdw_pp_details', 'Post details')}
      </h2>
      <dl className="tdw-pp-details">
        <DetailRow label={t('tdw_pp_channel', 'Channel')}>
          <span className="tdw-pp-detail-channel">
            <img
              src={`/icons/platforms/${post.integration.providerIdentifier}.png`}
              alt=""
              className="tdw-pp-net"
            />
            <span className="tdw-pp-ellipsis">{post.integration.name}</span>
          </span>
        </DetailRow>
        <DetailRow label={t('tdw_pp_status', 'Status')}>
          <PostStatus state={post.state} date={post.publishDate} compact />
        </DetailRow>
        <DetailRow
          label={
            published
              ? t('tdw_pp_published_on', 'Published on')
              : t('tdw_pp_planned_for', 'Planned for')
          }
        >
          <LocalDate date={post.publishDate} />
        </DetailRow>
        {post.parts.length > 1 && (
          <DetailRow label={t('tdw_pp_thread', 'Thread')}>
            {t('tdw_pp_thread_parts', '{{count}} parts', {
              count: post.parts.length,
            })}
          </DetailRow>
        )}
        {media > 0 && (
          <DetailRow label={t('tdw_pp_media', 'Media')}>
            {t('tdw_pp_media_count', '{{count}} attached', { count: media })}
          </DetailRow>
        )}
        {!!post.creationMethod && post.creationMethod !== 'UNKNOWN' && (
          <DetailRow label={t('tdw_pp_created_with', 'Created with')}>
            <CreationMethodBadge creationMethod={post.creationMethod} size="sm" />
          </DetailRow>
        )}
      </dl>
    </section>
  );
};

export const TadweenPostPage: FC<{ post: PublicPost; share: boolean }> = ({
  post,
  share,
}) => {
  const t = useT();
  return (
    <PreviewCommentsProvider
      previewId={post.id}
      postIds={post.parts.map((p) => p.id)}
      organizationId={post.organizationId}
    >
      <TadweenScope className="tdw-pp">
        <PostTopBar share={share} />
        <main className="tdw-pp-grid">
          <div className="tdw-pp-hero">
            <PostCard post={post} />
          </div>
          <aside
            className="tdw-pp-side"
            aria-label={t('tdw_pp_about_post', 'About this post')}
          >
            <PostDetails post={post} />
            <NetworkPreview post={post} />
          </aside>
          <div className="tdw-pp-comments">
            <CommentThread previewId={post.id} />
          </div>
        </main>
      </TadweenScope>
    </PreviewCommentsProvider>
  );
};
