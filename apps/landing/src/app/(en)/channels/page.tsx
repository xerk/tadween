import { ChannelsIndexPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.channels, ...en.channels.meta, og: 'channels' });

export default function Channels() {
  return <ChannelsIndexPage t={en} />;
}
