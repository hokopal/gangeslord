'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { decideJoinRequest } from '@/lib/join-requests';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

/** Approves or declines a request to join. The database checks again that the caller is an admin of that workspace. */
export async function decideJoinRequestAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const back = `/w/${slug}/settings/members`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'members.manage')) redirect(`${back}?error=not_allowed`);
  try {
    await decideJoinRequest(text(formData, 'request'), text(formData, 'decision') === 'approve', text(formData, 'role'));
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown')}`);
  }
  revalidatePath(back);
  redirect(back);
}
