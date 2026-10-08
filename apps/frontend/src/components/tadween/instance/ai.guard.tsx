'use client';

import React, {
  Component,
  ComponentProps,
  FC,
  ReactNode,
  useContext,
} from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import {
  AiRuntimeFailedContext,
  useAiAvailable,
} from '@gitroom/frontend/components/tadween/instance/instance.settings';

// Keeps a failing assistant from taking the page down with it: CopilotKit
// throws during render when its runtime or agent is not what it expects.
// `catches` limits which errors it handles; the others go up as before.
class AiErrorBoundary extends Component<
  {
    fallback: ReactNode;
    children: ReactNode;
    catches?: (error: unknown) => boolean;
  },
  { error: unknown; failed: boolean }
> {
  state = { error: undefined as unknown, failed: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, failed: true };
  }

  componentDidCatch(error: unknown) {
    if (!this.props.catches || this.props.catches(error)) {
      console.warn('AI assistant disabled after an error:', error);
    }
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }
    if (this.props.catches && !this.props.catches(this.state.error)) {
      throw this.state.error;
    }
    return this.props.fallback;
  }
}

// CopilotKit's own errors: its error classes, and the plain errors its hooks
// throw (`useAgent: Agent 'default' not found ...`).
const isCopilotKitError = (error: unknown) => {
  const { name = '', message = '' } = (error || {}) as {
    name?: string;
    message?: string;
  };
  return (
    /CopilotKit/.test(name) || /CopilotKit|useAgent|useCopilot/.test(message)
  );
};

// <CopilotKit> for the app shell. If CopilotKit itself throws (for example a
// runtime that answers without the agent it needs), the app renders again
// without it and every AiOnly part stays hidden.
export const AiProvider: FC<ComponentProps<typeof CopilotKit>> = ({
  children,
  ...props
}) => (
  <AiErrorBoundary
    catches={isCopilotKitError}
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

// CopilotTextarea needs <CopilotKit> above it; once AiProvider fell back it
// becomes a plain textarea so the form keeps working.
export const AiTextarea: FC<ComponentProps<typeof CopilotTextarea>> = (
  props
) => {
  const runtimeFailed = useContext(AiRuntimeFailedContext);
  if (!runtimeFailed) {
    return <CopilotTextarea {...props} />;
  }
  return (
    <textarea
      className={props.className}
      placeholder={props.placeholder}
      value={props.value}
      onChange={props.onChange}
    />
  );
};
