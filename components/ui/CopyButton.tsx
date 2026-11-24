'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/** Copies a path as a full URL, or an explicit value such as a DNS record. */
export function CopyButton({ path, label, origin, value }: { path?: string; label: string; origin?: string; value?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = value ?? `${origin ?? window.location.origin}${path ?? ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(value ? 'Copy this value' : 'Copy this link', text);
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
