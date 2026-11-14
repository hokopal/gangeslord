'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

/** A small, dismissible greeting shown over the room. */
export function WelcomeNote({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  if (!open || text === '') return null;
  return (
    <div className="welcome-note" role="status">
      <p>{text}</p>
      <button type="button" className="icon-button" aria-label="Dismiss" onClick={() => setOpen(false)}>
        <X width={16} height={16} aria-hidden="true" />
      </button>
    </div>
  );
}
