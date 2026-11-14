import { isRole } from './members';
import type { Role } from './roles';
import { createServerSupabase } from './supabase/server';

// Everything here runs as the signed-in person. The database functions decide what they may see and do.

export type MyInvitation = { token: string; workspaceName: string; role: Role };
export type SuggestedWorkspace = { id: string; name: string; members: number; requestStatus: 'pending' | 'approved' | 'declined' | null };
export type JoinRequest = { id: string; email: string; createdAt: string };

/** Invitations waiting for the signed-in person's email address. */
export async function listMyInvitations(): Promise<MyInvitation[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc('my_invitations');
  return ((data ?? []) as { token: string; workspace_name: string; role: string }[]).map((row) => ({
    token: row.token,
    workspaceName: row.workspace_name,
    role: (isRole(row.role) ? row.role : 'viewer') as Role,
  }));
}

/** Workspaces run by colleagues on the same company email domain. Empty for public mail providers. */
export async function listSuggestedWorkspaces(): Promise<SuggestedWorkspace[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc('suggested_workspaces');
  return ((data ?? []) as { id: string; name: string; members: number; request_status: SuggestedWorkspace['requestStatus'] }[]).map((row) => ({
    id: row.id,
    name: row.name,
    members: Number(row.members),
    requestStatus: row.request_status ?? null,
  }));
}

export async function requestToJoin(workspaceId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc('request_to_join', { p_workspace: workspaceId });
  if (error) throw new Error('not_allowed');
}

/** Requests waiting for a decision. Only the workspace's admins receive any rows. */
export async function listJoinRequests(workspaceId: string): Promise<JoinRequest[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('join_requests')
    .select('id, email, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at');
  return ((data ?? []) as { id: string; email: string; created_at: string }[]).map((row) => ({ id: row.id, email: row.email, createdAt: row.created_at }));
}

export async function decideJoinRequest(requestId: string, approve: boolean, role: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc('decide_join_request', { p_request: requestId, p_approve: approve, p_role: isRole(role) ? role : 'viewer' });
  if (error) throw new Error('not_allowed');
}
