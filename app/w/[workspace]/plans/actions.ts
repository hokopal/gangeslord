'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addTemplateItem,
  applyTemplateToTrack,
  createTemplate,
  deleteTemplate,
  deleteTemplateItem,
  moveTemplateItem,
  renameTemplate,
  saveTemplateItem,
} from '@/lib/plan-templates';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Maps an Error to a safe error code for the URL. */
const code = (error: unknown, fallback: string) =>
  error instanceof Error && /^[a-z_]{2,40}$/.test(error.message) && !error.message.includes(' ') ? error.message : fallback;

async function guard(formData: FormData) {
  const slug = text(formData, 'workspace');
  const back = `/w/${slug}/plans`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'content.write')) redirect(`${back}?error=not_allowed`);
  return { context, back };
}

export async function createPlan(formData: FormData): Promise<void> {
  const { context, back } = await guard(formData);
  let id: string;
  try {
    id = await createTemplate(context.workspace.id, text(formData, 'name'));
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=${id}`);
}

export async function renamePlan(formData: FormData): Promise<void> {
  const { context, back } = await guard(formData);
  const id = text(formData, 'id');
  if (!UUID.test(id)) redirect(`${back}?error=template_not_found`);
  try {
    await renameTemplate(context.workspace.id, id, text(formData, 'name'));
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

export async function deletePlan(formData: FormData): Promise<void> {
  const { context, back } = await guard(formData);
  const id = text(formData, 'id');
  if (!UUID.test(id)) redirect(`${back}?error=template_not_found`);
  try {
    await deleteTemplate(context.workspace.id, id);
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

export async function addStep(formData: FormData): Promise<void> {
  const { context, back } = await guard(formData);
  const templateId = text(formData, 'template');
  if (!UUID.test(templateId)) redirect(`${back}?error=template_not_found`);
  try {
    await addTemplateItem(context.workspace.id, templateId, { label: text(formData, 'label'), owner: text(formData, 'owner') });
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

export async function saveStep(formData: FormData): Promise<void> {
  const { context, back } = await guard(formData);
  const templateId = text(formData, 'template');
  const id = text(formData, 'id');
  if (!UUID.test(templateId) || !UUID.test(id)) redirect(`${back}?error=template_not_found`);
  try {
    await saveTemplateItem(context.workspace.id, templateId, id, { label: text(formData, 'label'), owner: text(formData, 'owner') });
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

export async function moveStep(formData: FormData): Promise<void> {
  const { context, back } = await guard(formData);
  const templateId = text(formData, 'template');
  const id = text(formData, 'id');
  const to = Number(text(formData, 'to'));
  if (!UUID.test(templateId) || !UUID.test(id) || !Number.isInteger(to)) redirect(`${back}?error=not_found`);
  try {
    await moveTemplateItem(context.workspace.id, templateId, id, to);
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

export async function deleteStep(formData: FormData): Promise<void> {
  const { context, back } = await guard(formData);
  const templateId = text(formData, 'template');
  const id = text(formData, 'id');
  if (!UUID.test(templateId) || !UUID.test(id)) redirect(`${back}?error=template_not_found`);
  try {
    await deleteTemplateItem(context.workspace.id, templateId, id);
  } catch (error) {
    redirect(`${back}?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

/** Copies the template onto a track; lands on the track's plan page with a banner. */
export async function applyPlan(formData: FormData): Promise<void> {
  const { context } = await guard(formData);
  const slug = context.workspace.slug;
  const templateId = text(formData, 'template');
  const trackId = text(formData, 'track');
  if (!UUID.test(templateId) || !UUID.test(trackId)) redirect(`/w/${slug}/plans?error=not_found`);
  let added = 0;
  try {
    added = await applyTemplateToTrack(templateId, trackId);
  } catch (error) {
    redirect(`/w/${slug}/plans?error=${code(error, 'plan_failed')}`);
  }
  revalidatePath(`/w/${slug}/tracks/${trackId}/plan`);
  redirect(`/w/${slug}/tracks/${trackId}/plan?applied=${added}`);
}
