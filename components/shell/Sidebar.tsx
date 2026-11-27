'use client';

import { BarChart3, Library, ListChecks, ListVideo, PanelLeftClose, PanelLeftOpen, Plug, Settings, Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Brand } from '@/components/ui/Brand';
import { can } from '@/lib/roles';
import type { Workspace, WorkspaceContext } from '@/lib/workspaces';
import { SidebarRow } from './SidebarRow';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export function Sidebar({
  context,
  workspaces,
  userEmail,
  open,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: {
  context: WorkspaceContext;
  workspaces: Workspace[];
  userEmail: string;
  open: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const base = `/w/${context.workspace.slug}`;
  const items = [
    { href: `${base}/library`, label: 'Library', icon: <Library aria-hidden="true" /> },
    { href: `${base}/tracks`, label: 'Tracks', icon: <ListVideo aria-hidden="true" /> },
    { href: `${base}/plans`, label: 'Plans', icon: <ListChecks aria-hidden="true" /> },
    { href: `${base}/audiences`, label: 'Audiences', icon: <Users aria-hidden="true" /> },
    { href: `${base}/analytics`, label: 'Analytics', icon: <BarChart3 aria-hidden="true" /> },
    ...(can(context.role, 'settings.write')
      ? [{ href: `${base}/integrations`, label: 'Integrations', icon: <Plug aria-hidden="true" /> }]
      : []),
    ...(can(context.role, 'settings.read')
      ? [{ href: `${base}/settings`, label: 'Settings', icon: <Settings aria-hidden="true" /> }]
      : []),
  ];

  return (
    <nav className="sidebar" aria-label="Workspace" data-open={open} data-collapsed={collapsed}>
      <WorkspaceSwitcher current={context.workspace} workspaces={workspaces} userEmail={userEmail} />
      <div className="sidebar-section">Workspace</div>
      {items.map((item) => (
        <SidebarRow
          key={item.href}
          {...item}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          onNavigate={onNavigate}
        />
      ))}
      <div className="sidebar-footer">
        <Brand compact />
        <button
          type="button"
          className="icon-button sidebar-toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Minimise sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Minimise sidebar'}
        >
          {collapsed ? <PanelLeftOpen width={16} height={16} aria-hidden="true" /> : <PanelLeftClose width={16} height={16} aria-hidden="true" />}
        </button>
      </div>
    </nav>
  );
}
