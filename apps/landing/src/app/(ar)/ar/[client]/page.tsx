import { AiClientPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { clientStaticParams } from '@/lib/clientRoutes';
import { clientPath } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

// One page per AI client in lib/aiClients.ts (/ar/chatgpt, /ar/claude, /ar/cursor); anything else
// is a 404, and a slug that matches another route fails the build.
export const dynamicParams = false;
export const generateStaticParams = clientStaticParams;

export async function generateMetadata({ params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  const copy = ar.aiClients.items[client];
  return pageMetadata(ar, { path: clientPath(client), title: copy.title, description: copy.description, og: `client-${client}` });
}

export default async function ArabicClient({ params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  return <AiClientPage t={ar} slug={client} />;
}
