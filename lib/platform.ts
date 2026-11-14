import { isRole } from './members';
import type { Role } from './roles';
import { createAdminSupabase } from './supabase/admin';
import { getUser } from './supabase/server';

// The platform admin console. Everything here uses the service role and reaches across
// workspaces, so every exported function that reads or changes data takes the acting admin,
// which can only be obtained from getPlatformAdmin().

export type PlatformAdmin = { id: string; email: string };

/** The signed-in user, if and only if they are on the platform admin list. */
export async function getPlatformAdmin(): Promise<PlatformAdmin | null> {
  const user = await getUser();
  if (!user) return null;
  const { data } = await createAdminSupabase().from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  return data ? { id: user.id, email: user.email ?? '' } : null;
}

/** A runtime check that a caller really passed an admin, for the functions that only read. */
function assertAdmin(admin: PlatformAdmin): void {
  if (!admin?.id) throw new Error('not_allowed');
}

export type WorkspaceStats = {
  id: string; name: string; slug: string; createdAt: string; suspendedAt: string | null;
  members: number; adminEmails: string[]; tracks: number; publishedTracks: number; assets: number;
  visits30d: number; lastVisitAt: string | null; integrations: string[];
};

type StatsRow = {
  id: string; name: string; slug: string; created_at: string; suspended_at: string | null;
  members: number; admin_emails: string[]; tracks: number; published_tracks: number; assets: number;
  visits_30d: number; last_visit_at: string | null; integrations: string[];
};

const toStats = (r: StatsRow): WorkspaceStats => ({
  id: r.id, name: r.name, slug: r.slug, createdAt: r.created_at, suspendedAt: r.suspended_at,
  members: Number(r.members), adminEmails: r.admin_emails ?? [], tracks: Number(r.tracks), publishedTracks: Number(r.published_tracks),
  assets: Number(r.assets), visits30d: Number(r.visits_30d), lastVisitAt: r.last_visit_at, integrations: r.integrations ?? [],
});

export async function platformOverview(acting: PlatformAdmin): Promise<{ workspaces: WorkspaceStats[]; users: number }> {
  assertAdmin(acting);
  const admin = createAdminSupabase();
  const [stats, users] = await Promise.all([admin.rpc('platform_workspace_stats'), admin.rpc('platform_user_count')]);
  if (stats.error) throw new Error(stats.error.message);
  return { workspaces: ((stats.data ?? []) as StatsRow[]).map(toStats), users: Number(users.data ?? 0) };
}

export type PlatformMember = { userId: string; email: string; role: Role; joinedAt: string };

export async function platformWorkspace(acting: PlatformAdmin, id: string): Promise<{ workspace: WorkspaceStats; members: PlatformMember[] } | null> {
  assertAdmin(acting);
  const admin = createAdminSupabase();
  const [stats, members] = await Promise.all([admin.rpc('platform_workspace_stats'), admin.rpc('platform_workspace_members', { p_workspace: id })]);
  const row = ((stats.data ?? []) as StatsRow[]).find((r) => r.id === id);
  if (!row) return null;
  return {
    workspace: toStats(row),
    members: ((members.data ?? []) as { user_id: string; email: string; role: string; joined_at: string }[]).map((m) => ({
      userId: m.user_id, email: m.email, role: (isRole(m.role) ? m.role : 'viewer') as Role, joinedAt: m.joined_at,
    })),
  };
}

type Target = { id: string; name: string };

async function target(id: string): Promise<Target> {
  const { data } = await createAdminSupabase().from('workspaces').select('id, name').eq('id', id).maybeSingle();
  if (!data) throw new Error('not_found');
  return { id: data.id as string, name: data.name as string };
}

async function audit(admin: PlatformAdmin, action: string, workspace: Target | null, detail: Record<string, unknown> = {}): Promise<void> {
  await createAdminSupabase().from('platform_audit_log').insert({
    admin_id: admin.id, admin_email: admin.email, action, workspace_id: workspace?.id ?? null, workspace_name: workspace?.name ?? null, detail,
  });
}

export async function setWorkspaceSuspended(admin: PlatformAdmin, id: string, suspended: boolean): Promise<void> {
  const workspace = await target(id);
  const { error } = await createAdminSupabase().from('workspaces').update({ suspended_at: suspended ? new Date().toISOString() : null }).eq('id', id);
  if (error) throw new Error('admin_failed');
  await audit(admin, suspended ? 'workspace.suspend' : 'workspace.restore', workspace);
}

/** Deletes a workspace and everything in it. The caller must repeat the workspace's address to confirm. */
export async function deleteWorkspace(admin: PlatformAdmin, id: string, confirmSlug: string): Promise<void> {
  const db = createAdminSupabase();
  const { data } = await db.from('workspaces').select('id, name, slug').eq('id', id).maybeSingle();
  if (!data) throw new Error('not_found');
  if (confirmSlug.trim() !== data.slug) throw new Error('confirm_mismatch');
  // The audit entry is written first, so there is a record even if the delete is interrupted.
  await audit(admin, 'workspace.delete', { id: data.id as string, name: data.name as string }, { slug: data.slug });
  const { error } = await db.from('workspaces').delete().eq('id', id);
  if (error) throw new Error('admin_failed');
}

export async function setMemberRole(admin: PlatformAdmin, workspaceId: string, userId: string, role: string): Promise<void> {
  if (!isRole(role)) throw new Error('admin_failed');
  const workspace = await target(workspaceId);
  const { error } = await createAdminSupabase().from('memberships').update({ role }).eq('workspace_id', workspaceId).eq('user_id', userId);
  // The database refuses to leave a workspace without an admin.
  if (error) throw new Error(error.message.includes('last_admin') ? 'last_admin' : 'admin_failed');
  await audit(admin, 'member.role', workspace, { userId, role });
}

export async function removeMember(admin: PlatformAdmin, workspaceId: string, userId: string): Promise<void> {
  const workspace = await target(workspaceId);
  const { error } = await createAdminSupabase().from('memberships').delete().eq('workspace_id', workspaceId).eq('user_id', userId);
  if (error) throw new Error(error.message.includes('last_admin') ? 'last_admin' : 'admin_failed');
  await audit(admin, 'member.remove', workspace, { userId });
}

/** Adds someone who has already signed in to Pipemouse. Throws user_not_found or already_member. */
export async function addMember(admin: PlatformAdmin, workspaceId: string, email: string, role: string): Promise<void> {
  if (!isRole(role)) throw new Error('admin_failed');
  const workspace = await target(workspaceId);
  const db = createAdminSupabase();
  const { data: userId } = await db.rpc('platform_find_user', { p_email: email });
  if (!userId) throw new Error('user_not_found');
  const { error } = await db.from('memberships').insert({ workspace_id: workspaceId, user_id: userId, role });
  if (error) throw new Error(error.code === '23505' ? 'already_member' : 'admin_failed');
  await audit(admin, 'member.add', workspace, { email: email.trim().toLowerCase(), role });
}

export type AuditEntry = { id: number; adminEmail: string; action: string; workspaceName: string | null; detail: Record<string, unknown>; createdAt: string };

export async function listAudit(acting: PlatformAdmin, limit = 200): Promise<AuditEntry[]> {
  assertAdmin(acting);
  const { data } = await createAdminSupabase()
    .from('platform_audit_log')
    .select('id, admin_email, action, workspace_name, detail, created_at')
    .order('id', { ascending: false })
    .limit(limit);
  return ((data ?? []) as { id: number; admin_email: string; action: string; workspace_name: string | null; detail: Record<string, unknown>; created_at: string }[]).map(
    (r) => ({ id: r.id, adminEmail: r.admin_email, action: r.action, workspaceName: r.workspace_name, detail: r.detail ?? {}, createdAt: r.created_at }),
  );
}
