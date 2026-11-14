'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { removeGa4, saveGa4, testGa4 } from '@/lib/ga4';
import { can } from '@/lib/roles';
import { getUser } from '@/lib/supabase/server';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

/** Only workspace admins may connect, test or disconnect. */
async function admin(formData: FormData) {
  const slug = text(formData, 'workspace');
  const back = `/w/${slug}/integrations/ga4`;
  const [context, user] = await Promise.all([getWorkspaceContext(slug), getUser()]);
  if (!context || !user || !can(context.role, 'settings.write')) redirect(`${back}?error=not_allowed`);
  return { workspace: context.workspace, userId: user.id, back };
}

export async function connectGa4Action(formData: FormData): Promise<void> {
  const { workspace, userId, back } = await admin(formData);
  try {
    await saveGa4(workspace.id, userId, text(formData, 'measurementId'), text(formData, 'apiSecret'));
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown')}`);
  }
  revalidatePath(back);
  redirect(`${back}?notice=${encodeURIComponent('Connected. Send a test event to confirm it arrives.')}`);
}

export async function testGa4Action(formData: FormData): Promise<void> {
  const { workspace, back } = await admin(formData);
  const message = await testGa4(workspace.id, workspace.name);
  revalidatePath(back);
  redirect(`${back}?notice=${encodeURIComponent(message)}`);
}

export async function disconnectGa4Action(formData: FormData): Promise<void> {
  const { workspace, back } = await admin(formData);
  await removeGa4(workspace.id);
  revalidatePath(back);
  redirect(back);
}
