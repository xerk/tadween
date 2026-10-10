import { AgentPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.agent, ...ar.meta.agent, og: 'ai-agent' });

export default function ArabicAgent() {
  return <AgentPage t={ar} />;
}
