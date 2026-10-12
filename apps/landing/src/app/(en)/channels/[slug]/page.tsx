import { ChannelPage } from '@/components/pages';
import { en } from '@/content/en';
import { CHANNELS } from '@/lib/channels';
import { channelPath } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

// One page per network in lib/channels.ts; anything else is a 404.
export const dynamicParams = false;
export const generateStaticParams = () => CHANNELS.map((c) => ({ slug: c.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const copy = en.channels.items[slug];
  return pageMetadata(en, { path: channelPath(slug), title: copy.title, description: copy.description, og: `channel-${slug}` });
}

export default async function Channel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ChannelPage t={en} slug={slug} />;
}
