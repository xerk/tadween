import { AiClientPage } from '@/components/pages';
import { en } from '@/content/en';
import { clientStaticParams } from '@/lib/clientRoutes';
import { clientPath } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

// One page per AI client in lib/aiClients.ts, at the top level (/chatgpt, /claude-code).
// Anything else is a 404, and a slug that matches another route fails the build.
export const dynamicParams = false;
export const generateStaticParams = clientStaticParams;

export async function generateMetadata({ params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  const copy = en.aiClients.items[client];
  return pageMetadata(en, { path: clientPath(client), title: copy.title, description: copy.description, og: `client-${client}` });
}

export default async function Client({ params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  return <AiClientPage t={en} slug={client} />;
}
