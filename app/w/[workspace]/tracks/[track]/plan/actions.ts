'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addActionItem, deleteActionItem, moveActionItem, saveActionItem, setActionDoneAsSeller } from '@/lib/action-plan';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Maps an Error to a safe error code for the URL: known codes pass through, everything else collapses. */
const code = (error: unknown, fallback: string) =>
  error instanceof Error && /^[a-z_]{2,40}$/.test(error.message) && !error.message.includes(' ') ? error.message : fallback;

async function guard(formData: FormData) {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/tracks/${trackId}/plan`;
  if (!UUID.test(trackId)) redirect(`${back}?error=not_found`);
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'content.write')) redirect(`${back}?error=not_allowed`);
  return { context, trackId, back };
}

export async function addAction(formData: FormData): Promise<void> {
  const { context, trackId, back } = await guard(formData);
  try {
    await addActionItem(context.workspace.id, trackId, { label: text(formData, 'label'), owner: text(formData, 'owner'), dueDate: text(formData, 'due') });
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

export async function saveAction(formData: FormData): Promise<void> {
  const { context, trackId, back } = await guard(formData);
  const id = text(formData, 'id');
  try {
    await saveActionItem(context.workspace.id, trackId, id, { label: text(formData, 'label'), owner: text(formData, 'owner'), dueDate: text(formData, 'due') });
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

export async function toggleAction(formData: FormData): Promise<void> {
  const { context, trackId, back } = await guard(formData);
  const id = text(formData, 'id');
  try {
    await setActionDoneAsSeller(context.workspace.id, trackId, id, text(formData, 'done') === '1');
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

export async function moveAction(formData: FormData): Promise<void> {
  const { context, trackId, back } = await guard(formData);
  const id = text(formData, 'id');
  const to = Number(text(formData, 'to'));
  if (!UUID.test(id) || !Number.isInteger(to)) redirect(`${back}?error=not_found`);
  try {
    await moveActionItem(context.workspace.id, trackId, id, to);
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

export async function deleteAction(formData: FormData): Promise<void> {
  const { context, trackId, back } = await guard(formData);
  const id = text(formData, 'id');
  if (!UUID.test(id)) redirect(`${back}?error=not_found`);
  try {
    await deleteActionItem(context.workspace.id, trackId, id);
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}
