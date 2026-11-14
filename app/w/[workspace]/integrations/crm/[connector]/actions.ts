'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { removeCrm, saveCrm, testCrm } from '@/lib/crm-connectors';
import { CRM_INFO, isCrmKind } from '@/lib/crm-core';
import { can } from '@/lib/roles';
import { getUser } from '@/lib/supabase/server';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

/** Only workspace admins may connect, test or disconnect a sales tool. */
async function admin(formData: FormData) {
  const slug = text(formData, 'workspace');
  const kind = text(formData, 'connector');
  if (!isCrmKind(kind)) redirect(`/w/${slug}/integrations`);
  const back = `/w/${slug}/integrations/crm/${kind}`;
  const [context, user] = await Promise.all([getWorkspaceContext(slug), getUser()]);
  if (!context || !user || !can(context.role, 'settings.write')) redirect(`${back}?error=not_allowed`);
  return { workspace: context.workspace, userId: user.id, kind, back };
}

export async function connectCrmAction(formData: FormData): Promise<void> {
  const { workspace, userId, kind, back } = await admin(formData);
  try {
    await saveCrm(workspace.id, userId, kind, Object.fromEntries(CRM_INFO[kind].fields.map((field) => [field.key, text(formData, field.key)])));
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown')}`);
  }
  // Saving does not prove the credentials work, so they are checked straight away.
  const message = await testCrm(workspace.id, kind);
  revalidatePath(back);
  redirect(`${back}?notice=${encodeURIComponent(`Saved. ${message}`)}`);
}

export async function testCrmAction(formData: FormData): Promise<void> {
  const { workspace, kind, back } = await admin(formData);
  const message = await testCrm(workspace.id, kind);
  revalidatePath(back);
  redirect(`${back}?notice=${encodeURIComponent(message)}`);
}

export async function disconnectCrmAction(formData: FormData): Promise<void> {
  const { workspace, kind, back } = await admin(formData);
  await removeCrm(workspace.id, kind);
  revalidatePath(back);
  redirect(back);
}
