import { ROLES, type Role } from './roles';
import { createServerSupabase } from './supabase/server';

export type Member = { userId: string; email: string; role: Role; joinedAt: string };
export type Invitation = { id: string; email: string; role: Role; token: string; expiresAt: string };

const KNOWN_ERRORS = [
  'last_admin',
  'invitation_not_found',
  'invitation_expired',
  'invitation_used',
  'invitation_email_mismatch',
  'not_authenticated',
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Maps a database error to its known code, or passes the message through. */
function toError(message: string): Error {
  return new Error(KNOWN_ERRORS.find((code) => message.includes(code)) ?? message);
}

export function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(value)) throw new Error('email_invalid');
  return value;
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export async function listMembers(workspaceId: string): Promise<Member[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('workspace_members', { ws: workspaceId });
  if (error) throw toError(error.message);
  return (data as { user_id: string; email: string; role: Role; joined_at: string }[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
    role: r.role,
    joinedAt: r.joined_at,
  }));
}

export async function listPendingInvitations(workspaceId: string): Promise<Invitation[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, role, token, expires_at')
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at');
  if (error) throw toError(error.message);
  return (data as { id: string; email: string; role: Role; token: string; expires_at: string }[]).map(
    (r) => ({ id: r.id, email: r.email, role: r.role, token: r.token, expiresAt: r.expires_at }),
  );
}

export async function inviteMember(workspaceId: string, email: string, role: Role): Promise<Invitation> {
  const normalized = normalizeEmail(email);
  const [members, pending] = await Promise.all([
    listMembers(workspaceId),
    listPendingInvitations(workspaceId),
  ]);
  if (members.some((m) => m.email.toLowerCase() === normalized)) throw new Error('already_member');
  if (pending.some((i) => i.email === normalized)) throw new Error('already_invited');

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('invitations')
    .insert({ workspace_id: workspaceId, email: normalized, role })
    .select('id, email, role, token, expires_at')
    .single();
  if (error) throw toError(error.message);
  return { id: data.id, email: data.email, role: data.role, token: data.token, expiresAt: data.expires_at };
}

export async function revokeInvitation(id: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('invitations').delete().eq('id', id);
  if (error) throw toError(error.message);
}

export async function changeRole(workspaceId: string, userId: string, role: Role): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('memberships')
    .update({ role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  if (error) throw toError(error.message);
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  if (error) throw toError(error.message);
}

export async function acceptInvitation(token: string): Promise<{ workspaceSlug: string }> {
  const supabase = await createServerSupabase();
  const { data: workspaceId, error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) throw toError(error.message);
  const { data: ws, error: wsError } = await supabase
    .from('workspaces')
    .select('slug')
    .eq('id', workspaceId as string)
    .single();
  if (wsError) throw toError(wsError.message);
  return { workspaceSlug: ws.slug as string };
}
