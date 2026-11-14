'use client';

import { Check, Link2 } from 'lucide-react';
import { useState } from 'react';
import { shareLinks } from '@/lib/room-options';

/** Buttons for passing the room on: LinkedIn, X, email, or copying its address. */
export function RoomShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the other buttons still work.
    }
  }
  return (
    <div className="room-share" aria-label="Share this room">
      <span className="room-share-label">Share</span>
      {shareLinks(url, title).map((link) => (
        <a key={link.label} className="room-share-btn" href={link.href} target="_blank" rel="noopener noreferrer">
          {link.label}
        </a>
      ))}
      <button type="button" className="room-share-btn" onClick={copy} aria-live="polite">
        {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
