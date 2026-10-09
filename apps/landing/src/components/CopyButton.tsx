'use client';

import { useState } from 'react';
import { Icon } from './Icon';

/** Copies `text` and says so for two seconds. Without clipboard access it does nothing,
    and the text is still there to select. */
export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no clipboard permission: the address stays selectable */
    }
  };
  return (
    <button type="button" className="pz-copy" onClick={copy} aria-live="polite">
      <Icon name={copied ? 'check' : 'link'} size={14} />
      {copied ? done : label}
    </button>
  );
}
