import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import {
  decoratePostContent,
  postContentPlainText,
  sanitizePostContent,
} from '@gitroom/helpers/utils/sanitize.post.content';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import {
  PublicPost,
  TadweenPostPage,
} from '@gitroom/frontend/components/tadween/post-page/post.page';
export const dynamic = 'force-dynamic';

// The public post endpoint returns the whole thread of one post (the post and
// its follow-ups, one channel). Only the fields the page renders are passed on
// to the client, so the page payload never carries error text, settings or tags.
const loadPost = cache(async (id: string): Promise<PublicPost | null> => {
  const response = await internalFetch(`/public/posts/${id}`);
  if (!response.ok) {
    throw new Error(`public post request failed: ${response.status}`);
  }
  const parts = await response.json();
  if (!Array.isArray(parts) || !parts.length) {
    return null;
  }
  const [first] = parts;
  return {
    id,
    organizationId: first.organizationId,
    publishDate: first.publishDate,
    state: first.state,
    creationMethod: first.creationMethod || null,
    integration: {
      name: first.integration?.name || '',
      picture: first.integration?.picture || '',
      providerIdentifier: first.integration?.providerIdentifier || '',
      profile: first.integration?.profile || '',
    },
    parts: parts.map((p: any) => {
      let media: PublicPost['parts'][number]['media'] = [];
      try {
        media = (JSON.parse(p.image || '[]') as any[])
          .filter((m) => typeof m?.path === 'string')
          .map((m) => ({
            id: String(m.id || m.path),
            path: m.path,
            thumbnail: m.thumbnail || null,
            alt: m.alt || null,
          }));
      } catch {
        media = [];
      }
      return {
        id: p.id,
        content: sanitizePostContent(p.content),
        html: decoratePostContent(p.content),
        media,
      };
    }),
  };
});

// Brand name from /admin → Branding, for the page title and link previews.
const loadBrand = cache(async () => {
  try {
    const response = await internalFetch('/instance/settings');
    const settings = response.ok ? await response.json() : null;
    return (settings?.branding?.instanceName as string) || '';
  } catch {
    return '';
  }
});

const fallbackBrand = () => (isGeneralServerSide() ? 'Tadween' : 'Gitroom');

// One line per paragraph of the first part, as plain text.
const textLines = (html: string) =>
  html
    .split(/<\/p>|<br\s*\/?>/i)
    .map((chunk) => postContentPlainText(chunk).replace(/\s+/g, ' ').trim())
    .filter(Boolean);

const clip = (text: string, max: number) =>
  text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;

const absolute = (path: string) => {
  try {
    return new URL(path, process.env.FRONTEND_URL).toString();
  } catch {
    return '';
  }
};

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const brand = (await loadBrand()) || fallbackBrand();
  const post: PublicPost | null = await loadPost(id).catch(() => null);
  if (!post) {
    return { title: brand, robots: { index: false } };
  }

  const lines = textLines(post.parts[0].content);
  const title = lines[0] ? `${brand}: ${clip(lines[0], 80)}` : brand;
  const description = clip(lines.join(' '), 200);
  const image = post.parts
    .flatMap((p) => p.media)
    .map((m) => (/\.(mp4|mov|webm)(\?|$)/i.test(m.path) ? m.thumbnail : m.path))
    .find(Boolean);
  const imageUrl = image ? absolute(image) : '';

  return {
    title,
    description,
    // Preview links are unlisted: shared on purpose, not for search engines.
    robots: { index: false },
    openGraph: {
      type: 'article',
      siteName: brand,
      title,
      description,
      url: absolute(`/p/${id}`) || undefined,
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default async function PostPreviewPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ share?: string }>;
}) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const post = await loadPost(id);
  if (!post) {
    notFound();
  }

  return <TadweenPostPage post={post} share={!!searchParams?.share} />;
}
