import { ChannelsIndexPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.channels, ...ar.channels.meta, og: 'channels' });

export default function ArabicChannels() {
  return <ChannelsIndexPage t={ar} />;
}
