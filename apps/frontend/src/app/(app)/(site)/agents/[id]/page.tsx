import { Metadata } from 'next';
import { TadweenAgentChat } from '@gitroom/frontend/components/tadween/agent/agent.chat';
export const metadata: Metadata = {
  title: 'Tadween - Agent',
  description: '',
};
export default async function Page() {
  return <TadweenAgentChat />;
}
