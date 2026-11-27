'use client';

import { ChevronRight, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useState } from 'react';
import type { Workspace, WorkspaceContext } from '@/lib/workspaces';
import { Sidebar } from './Sidebar';

const WorkspaceCtx = createContext<WorkspaceContext | null>(null);

export function useWorkspace(): WorkspaceContext {
  const value = useContext(WorkspaceCtx);
  if (!value) throw new Error('useWorkspace must be used inside AppShell');
  return value;
}

const SECTION_LABELS: Record<string, string> = {
  library: 'Library',
  tracks: 'Tracks',
  plans: 'Plans',
  audiences: 'Audiences',
  analytics: 'Analytics',
  integrations: 'Integrations',
  settings: 'Settings',
};

function sectionLabel(pathname: string, slug: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  // ['w', '<slug>', '<section>', ...]
  if (segments[0] !== 'w' || segments[1] !== slug) return null;
  const section = segments[2];
  if (!section) return null;
  return SECTION_LABELS[section] ?? section.charAt(0).toUpperCase() + section.slice(1);
}

export function AppShell({
  context,
  workspaces,
  userEmail,
  initialCollapsed = false,
  children,
}: {
  context: WorkspaceContext;
  workspaces: Workspace[];
  userEmail: string;
  initialCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    // Remembered in a cookie so the server renders the sidebar in the right state next time.
    document.cookie = `fello_sidebar=${next ? 'min' : 'full'}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <WorkspaceCtx.Provider value={context}>
      <div className="shell">
        <div className="scrim" data-open={drawerOpen} onClick={() => setDrawerOpen(false)} />
        <Sidebar
          context={context}
          workspaces={workspaces}
          userEmail={userEmail}
          open={drawerOpen}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onNavigate={() => setDrawerOpen(false)}
        />
        <div className="main">
          <div className="topbar">
            <button
              type="button"
              className="icon-button menu-toggle"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu width={18} height={18} aria-hidden="true" />
            </button>
            <nav className="crumbs" aria-label="Breadcrumb">
              <span className="crumb truncate">{context.workspace.name}</span>
              <ChevronRight aria-hidden="true" />
              <span className="crumb crumb-current truncate">
                {sectionLabel(pathname, context.workspace.slug) ?? 'Workspace'}
              </span>
            </nav>
          </div>
          {children}
        </div>
      </div>
    </WorkspaceCtx.Provider>
  );
}
