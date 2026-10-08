'use client';

import React, { Component, ComponentProps, FC, ReactNode } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import {
  AiRuntimeFailedContext,
  useAiAvailable,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';

// Keeps a failing assistant from taking the page down with it: CopilotKit
// throws during render when its runtime or agent is not what it expects.
class AiErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('AI assistant disabled after an error:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// <CopilotKit> for the app shell. If CopilotKit itself throws (for example a
// runtime that answers without the agent it needs), the app renders again
// without it and every AiOnly part stays hidden.
export const AiProvider: FC<ComponentProps<typeof CopilotKit>> = ({
  children,
  ...props
}) => (
  <AiErrorBoundary
    fallback={
      <AiRuntimeFailedContext.Provider value={true}>
        {children}
      </AiRuntimeFailedContext.Provider>
    }
  >
    <CopilotKit {...props}>{children}</CopilotKit>
  </AiErrorBoundary>
);

// Renders AI UI (CopilotKit chat, readables, actions) only when the server has
// an AI runtime, behind an error boundary. `fallback` shows when AI is not
// available or the assistant failed; nothing shows while the settings load.
export const AiOnly: FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null,
}) => {
  const available = useAiAvailable();
  if (available === undefined) {
    return null;
  }
  if (!available) {
    return <>{fallback}</>;
  }
  return <AiErrorBoundary fallback={fallback}>{children}</AiErrorBoundary>;
};
