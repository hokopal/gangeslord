'use client';

import { Check, ChevronsUpDown, LogOut, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { signOut } from '@/app/actions/auth';
import type { Workspace } from '@/lib/workspaces';

/** Deterministic avatar hue from a name, so different workspaces are visually distinct. */
const hue = (name: string) => [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;

export function WorkspaceSwitcher({
  current,
  workspaces,
  userEmail,
}: {
  current: Workspace;
  workspaces: Workspace[];
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="sidebar-row switcher"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="avatar avatar-hash" style={{ '--hue': hue(current.name) } as React.CSSProperties} aria-hidden="true">
          {current.name.charAt(0)}
        </span>
        <span className="truncate" style={{ flex: 1 }}>
          {current.name}
        </span>
        <ChevronsUpDown aria-hidden="true" />
      </button>
      {open ? (
        <div className="menu" role="menu" style={{ top: 34, left: 0 }}>
          <div className="menu-label truncate">{userEmail}</div>
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/w/${ws.slug}/library`}
              role="menuitem"
              className="sidebar-row"
              style={{ color: 'var(--text)' }}
              onClick={() => setOpen(false)}
            >
              <span className="avatar avatar-hash" style={{ '--hue': hue(ws.name) } as React.CSSProperties} aria-hidden="true">
                {ws.name.charAt(0)}
              </span>
              <span className="truncate" style={{ flex: 1 }}>
                {ws.name}
              </span>
              {ws.id === current.id ? <Check aria-hidden="true" /> : null}
            </Link>
          ))}
          <div className="menu-divider" />
          <Link href="/onboarding" role="menuitem" className="sidebar-row" onClick={() => setOpen(false)}>
            <Plus aria-hidden="true" />
            <span>Create workspace</span>
          </Link>
          <form action={signOut}>
            <button type="submit" role="menuitem" className="sidebar-row">
              <LogOut aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
