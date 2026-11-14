'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { can } from '@/lib/roles';
import { createShareLink, deleteShareLink } from '@/lib/share-links';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const codeOf = (error: unknown) => (error instanceof Error ? error.message : 'unknown');

export async function createShareLinkAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/analytics/${trackId}`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'links.write')) redirect(`${back}?error=not_allowed`);
  try {
    await createShareLink(context.workspace.id, trackId, {
      name: text(formData, 'name'),
      email: text(formData, 'email'),
      account: text(formData, 'account'),
    });
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(back);
  redirect(`${back}#personal-links`);
}

export async function deleteShareLinkAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/analytics/${trackId}`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'links.write')) redirect(`${back}?error=not_allowed`);
  try {
    await deleteShareLink(context.workspace.id, trackId, text(formData, 'link'));
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(back);
  redirect(`${back}#personal-links`);
}
