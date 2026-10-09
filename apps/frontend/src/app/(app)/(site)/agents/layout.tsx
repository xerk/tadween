import { Metadata } from 'next';
import { AgentWorkspace } from '@gitroom/frontend/components/tadween/agent/agent.workspace';
export const metadata: Metadata = {
  title: 'Tadween - Agent',
  description: 'agents',
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentWorkspace>{children}</AgentWorkspace>;
}
