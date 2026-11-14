'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/**
 * Copies a path as a full URL. The address is this page's own unless `origin` names another,
 * as it does for room links, which point at the public site. The path is exposed as data-link for tests.
 */
export function CopyButton({ path, label, origin }: { path: string; label: string; origin?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${origin ?? window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
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
