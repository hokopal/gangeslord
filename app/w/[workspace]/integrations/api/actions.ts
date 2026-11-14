'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createApiKey, revokeApiKey } from '@/lib/api-keys';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getUser } from '@/lib/supabase/server';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

export type CreateKeyState = { key?: string; name?: string; error?: string };

/** Creates a key and hands it back to the form once. It is never put in a URL or stored readable. */
export async function createApiKeyAction(_previous: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const slug = text(formData, 'workspace');
  const [context, user] = await Promise.all([getWorkspaceContext(slug), getUser()]);
  if (!context || !user || !can(context.role, 'settings.write')) return { error: errorMessage('not_allowed') };
  const name = text(formData, 'name');
  try {
    const key = await createApiKey(context.workspace.id, user.id, name, text(formData, 'scope') === 'write' ? 'write' : 'read');
    revalidatePath(`/w/${slug}/integrations/api`);
    return { key, name };
  } catch (error) {
    return { error: errorMessage(error instanceof Error ? error.message : 'api_key_failed') };
  }
}

export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const back = `/w/${slug}/integrations/api`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.write')) redirect(`${back}?error=not_allowed`);
  try {
    await revokeApiKey(context.workspace.id, text(formData, 'key'));
  } catch {
    redirect(`${back}?error=api_key_failed`);
  }
  revalidatePath(back);
  redirect(`${back}?revoked=1`);
}
