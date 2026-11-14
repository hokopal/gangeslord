'use client';

import { Menu } from 'lucide-react';
import { createContext, useContext, useState } from 'react';
import type { Workspace, WorkspaceContext } from '@/lib/workspaces';
import { Sidebar } from './Sidebar';

const WorkspaceCtx = createContext<WorkspaceContext | null>(null);

export function useWorkspace(): WorkspaceContext {
  const value = useContext(WorkspaceCtx);
  if (!value) throw new Error('useWorkspace must be used inside AppShell');
  return value;
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
              className="icon-button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu width={18} height={18} aria-hidden="true" />
            </button>
            <span className="truncate" style={{ fontWeight: 600 }}>
              {context.workspace.name}
            </span>
          </div>
          {children}
        </div>
      </div>
    </WorkspaceCtx.Provider>
  );
}
