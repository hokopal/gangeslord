'use client';

import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type RowMenuItem = { href: string; label: string; icon: React.ReactNode };

/**
 * A quiet "⋯" row action menu for data tables. Closes on outside pointer,
 * Escape and selection, using the same interaction contract as the workspace switcher.
 */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="row-menu">
      <button
        type="button"
        className="row-menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Room actions"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal width={17} height={17} aria-hidden="true" />
      </button>
      {open ? (
        <div className="row-menu-panel" role="menu">
          {items.map((item) => (
            <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
