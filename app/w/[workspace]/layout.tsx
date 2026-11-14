import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { createServerSupabase, getUser } from '@/lib/supabase/server';
import { getWorkspaceContext, listMyWorkspaces } from '@/lib/workspaces';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const [context, user] = await Promise.all([getWorkspaceContext(slug), getUser()]);
  // Same response for "does not exist" and "not a member", so slugs cannot be probed.
  if (!context && user) {
    // A suspended workspace is hidden from its members by the database. Say so, rather than "not found".
    const supabase = await createServerSupabase();
    const { data: suspended } = await supabase.rpc('workspace_is_suspended', { p_slug: slug });
    if (suspended) {
      return (
        <main className="center">
          <div className="card">
            <h1>Workspace suspended</h1>
            <p className="sub">This workspace has been suspended, so its content and rooms are unavailable. Contact Pipemouse support if you think this is a mistake.</p>
          </div>
        </main>
      );
    }
  }
  if (!context || !user) notFound();
  const [workspaces, store] = await Promise.all([listMyWorkspaces(), cookies()]);

  return (
    <AppShell context={context} workspaces={workspaces} userEmail={user.email ?? ''} initialCollapsed={store.get('fello_sidebar')?.value === 'min'}>
      {children}
    </AppShell>
  );
}
