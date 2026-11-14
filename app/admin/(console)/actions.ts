'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addMember, deleteWorkspace, getPlatformAdmin, removeMember, setMemberRole, setWorkspaceSuspended, type PlatformAdmin } from '@/lib/platform';
import { removeWorkspaceFiles } from '@/lib/storage-cleanup';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const UUID = /^[0-9a-f-]{36}$/;

/** Every action re-checks that the caller is a platform admin; the page guard alone is not enough. */
async function authorize(formData: FormData): Promise<{ admin: PlatformAdmin; id: string; back: string }> {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/admin/login');
  const id = text(formData, 'workspace');
  if (!UUID.test(id)) redirect('/admin');
  return { admin, id, back: `/admin/workspaces/${id}` };
}

async function run(back: string, done: string, work: () => Promise<void>): Promise<never> {
  try {
    await work();
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(error instanceof Error ? error.message : 'admin_failed')}`);
  }
  revalidatePath('/admin', 'layout');
  redirect(done);
}

export async function suspendAction(formData: FormData): Promise<void> {
  const { admin, id, back } = await authorize(formData);
  await run(back, `${back}?done=suspended`, () => setWorkspaceSuspended(admin, id, true));
}

export async function restoreAction(formData: FormData): Promise<void> {
  const { admin, id, back } = await authorize(formData);
  await run(back, `${back}?done=restored`, () => setWorkspaceSuspended(admin, id, false));
}

export async function deleteWorkspaceAction(formData: FormData): Promise<void> {
  const { admin, id, back } = await authorize(formData);
  await run(back, '/admin?done=deleted', async () => {
    await deleteWorkspace(admin, id, text(formData, 'confirm'));
    // Only after the workspace is really gone: remove its uploaded files and snapshots too.
    await removeWorkspaceFiles(id);
  });
}

export async function memberRoleAction(formData: FormData): Promise<void> {
  const { admin, id, back } = await authorize(formData);
  await run(back, `${back}?done=role`, () => setMemberRole(admin, id, text(formData, 'user'), text(formData, 'role')));
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const { admin, id, back } = await authorize(formData);
  await run(back, `${back}?done=removed`, () => removeMember(admin, id, text(formData, 'user')));
}

export async function addMemberAction(formData: FormData): Promise<void> {
  const { admin, id, back } = await authorize(formData);
  await run(back, `${back}?done=added`, () => addMember(admin, id, text(formData, 'email'), text(formData, 'role')));
}
