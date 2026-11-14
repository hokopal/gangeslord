'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/** Copies an app-relative path as a full URL. The path is exposed as data-link for tests. */
export function CopyButton({ path, label }: { path: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', `${window.location.origin}${path}`);
    }
  }

  return (
    <button type="button" className="btn btn-sm" data-link={path} onClick={copy} aria-live="polite">
      {copied ? (
        <Check width={14} height={14} className="pop success-mark" aria-hidden="true" />
      ) : (
        <Copy width={14} height={14} aria-hidden="true" />
      )}
      {copied ? 'Copied' : label}
    </button>
  );
}
