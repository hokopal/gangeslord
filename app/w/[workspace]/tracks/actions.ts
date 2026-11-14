'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { can, type Action } from '@/lib/roles';
import {
  addItem,
  createTrack,
  deleteTrack,
  moveItem,
  removeItem,
  setCta,
  setPublished,
  updateItem,
  updateTrack,
} from '@/lib/tracks';
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const codeOf = (error: unknown) => (error instanceof Error ? error.message : 'unknown');
const fail = (back: string, error: unknown): never =>
  redirect(`${back}${back.includes('?') ? '&' : '?'}error=${encodeURIComponent(codeOf(error))}`);

async function authorize(slug: string, action: Action, back: string): Promise<WorkspaceContext> {
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, action)) fail(back, new Error('not_allowed'));
  return context as WorkspaceContext;
}

export async function createTrackAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const back = `/w/${slug}/tracks`;
  const { workspace } = await authorize(slug, 'content.write', back);
  let id = '';
  try {
    id = (await createTrack(workspace.id, text(formData, 'name'))).id;
  } catch (error) {
    fail(back, error);
  }
  revalidatePath(back);
  redirect(`${back}/${id}`);
}

export async function updateTrackAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/tracks/${trackId}`;
  const { workspace } = await authorize(slug, 'content.write', back);
  try {
    await updateTrack(workspace.id, trackId, {
      name: text(formData, 'name'),
      slug: text(formData, 'slug'),
      headerTitle: text(formData, 'headerTitle'),
      showNextButton: formData.get('showNextButton') === 'on',
    });
    await setCta(workspace.id, trackId, 'header', null, text(formData, 'headerLabel'), text(formData, 'headerUrl'));
    await setCta(workspace.id, trackId, 'sidebar', null, text(formData, 'sidebarLabel'), text(formData, 'sidebarUrl'));
  } catch (error) {
    fail(back, error);
  }
  revalidatePath(`/w/${slug}/tracks`);
  redirect(`${back}?saved=1`);
}

export async function publishTrackAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/tracks/${trackId}`;
  const { workspace } = await authorize(slug, 'content.publish', back);
  try {
    await setPublished(workspace.id, trackId, text(formData, 'publish') === '1');
  } catch (error) {
    fail(back, error);
  }
  revalidatePath(`/w/${slug}/tracks`);
  redirect(back);
}

export async function deleteTrackAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/tracks/${trackId}`;
  const { workspace } = await authorize(slug, 'content.delete', back);
  try {
    await deleteTrack(workspace.id, trackId);
  } catch (error) {
    fail(back, error);
  }
  revalidatePath(`/w/${slug}/tracks`);
  redirect(`/w/${slug}/tracks`);
}

export async function addItemAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/tracks/${trackId}`;
  const { workspace } = await authorize(slug, 'content.write', back);
  try {
    await addItem(workspace.id, trackId, text(formData, 'asset'));
  } catch (error) {
    fail(back, error);
  }
  revalidatePath(back);
  redirect(back);
}

export async function removeItemAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/tracks/${trackId}`;
  const { workspace } = await authorize(slug, 'content.write', back);
  try {
    await removeItem(workspace.id, trackId, text(formData, 'item'));
  } catch (error) {
    fail(back, error);
  }
  revalidatePath(back);
  redirect(back);
}

export async function updateItemAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const itemId = text(formData, 'item');
  const back = `/w/${slug}/tracks/${trackId}?item=${itemId}`;
  const { workspace } = await authorize(slug, 'content.write', back);
  try {
    await updateItem(workspace.id, trackId, itemId, {
      titleOverride: text(formData, 'title'),
      descriptionOverride: text(formData, 'description'),
      slug: text(formData, 'slug'),
    });
    await setCta(workspace.id, trackId, 'item', itemId, text(formData, 'ctaLabel'), text(formData, 'ctaUrl'));
  } catch (error) {
    fail(back, error);
  }
  revalidatePath(`/w/${slug}/tracks/${trackId}`);
  redirect(`${back}&saved=1`);
}

/** Called from the drag-and-drop list. Returns an error code instead of redirecting. */
export async function moveItemAction(slug: string, trackId: string, itemId: string, toIndex: number): Promise<string | null> {
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'content.write')) return 'not_allowed';
  try {
    await moveItem(context.workspace.id, trackId, itemId, toIndex);
  } catch (error) {
    return codeOf(error);
  }
  revalidatePath(`/w/${slug}/tracks/${trackId}`);
  return null;
}
