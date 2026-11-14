'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  changeRole,
  inviteMember,
  isRole,
  removeMember,
  revokeInvitation,
} from '@/lib/members';
import { can, type Action } from '@/lib/roles';
import { getUser } from '@/lib/supabase/server';
import {
  changeWorkspaceSlug,
  getWorkspaceContext,
  renameWorkspace,
  type WorkspaceContext,
} from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const codeOf = (error: unknown) => (error instanceof Error ? error.message : 'unknown');

/** Loads the workspace for a form post and checks the caller may perform `action`. */
async function authorize(formData: FormData, action: Action, back: string): Promise<WorkspaceContext> {
  const context = await getWorkspaceContext(text(formData, 'workspace'));
  if (!context || !can(context.role, action)) redirect(`${back}?error=not_allowed`);
  return context;
}

export async function updateWorkspaceAction(formData: FormData): Promise<void> {
  const current = text(formData, 'workspace');
  const back = `/w/${current}/settings`;
  const { workspace } = await authorize(formData, 'settings.write', back);
  const slug = text(formData, 'slug');
  try {
    await renameWorkspace(workspace.id, text(formData, 'name'));
    if (slug !== workspace.slug) await changeWorkspaceSlug(workspace.id, slug);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath('/w', 'layout');
  redirect(`/w/${slug}/settings?saved=1`);
}

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const back = `/w/${text(formData, 'workspace')}/settings/members`;
  const { workspace } = await authorize(formData, 'members.manage', back);
  const role = text(formData, 'role');
  try {
    if (!isRole(role)) throw new Error('unknown');
    await inviteMember(workspace.id, text(formData, 'email'), role);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(back);
  redirect(back);
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  const back = `/w/${text(formData, 'workspace')}/settings/members`;
  await authorize(formData, 'members.manage', back);
  try {
    await revokeInvitation(text(formData, 'invitation'));
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(back);
  redirect(back);
}

export async function changeRoleAction(formData: FormData): Promise<void> {
  const back = `/w/${text(formData, 'workspace')}/settings/members`;
  const { workspace } = await authorize(formData, 'members.manage', back);
  const role = text(formData, 'role');
  try {
    if (!isRole(role)) throw new Error('unknown');
    await changeRole(workspace.id, text(formData, 'user'), role);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath('/w', 'layout');
  redirect(back);
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const back = `/w/${text(formData, 'workspace')}/settings/members`;
  const { workspace } = await authorize(formData, 'members.manage', back);
  const userId = text(formData, 'user');
  try {
    await removeMember(workspace.id, userId);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath('/w', 'layout');
  // An admin who removed themselves no longer has access to this workspace.
  const me = await getUser();
  redirect(me?.id === userId ? '/' : back);
}
