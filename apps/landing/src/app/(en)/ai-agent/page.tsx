import { AgentPage } from '@/components/pages';
import { en } from '@/content/en';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.agent, ...en.meta.agent, og: 'ai-agent' });

export default function Agent() {
  return <AgentPage t={en} />;
}
