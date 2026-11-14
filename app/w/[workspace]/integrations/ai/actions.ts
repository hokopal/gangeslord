'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isProvider } from '@/lib/ai/providers';
import { removeAiKey, saveAiKey, setAiModel } from '@/lib/ai/settings';
import { can } from '@/lib/roles';
import { getUser } from '@/lib/supabase/server';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const codeOf = (error: unknown) => (error instanceof Error ? error.message : 'unknown');

/** Only admins may manage the workspace's API key. Returns the workspace id and the admin's user id. */
async function authorize(formData: FormData): Promise<{ workspaceId: string; userId: string; back: string }> {
  const slug = text(formData, 'workspace');
  const back = `/w/${slug}/integrations/ai`;
  const [context, user] = await Promise.all([getWorkspaceContext(slug), getUser()]);
  if (!context || !user || !can(context.role, 'settings.write')) redirect(`${back}?error=not_allowed`);
  return { workspaceId: context.workspace.id, userId: user.id, back };
}

export async function saveAiKeyAction(formData: FormData): Promise<void> {
  const { workspaceId, userId, back } = await authorize(formData);
  const provider = text(formData, 'provider');
  if (!isProvider(provider)) redirect(`${back}?error=ai_provider_invalid`);
  try {
    await saveAiKey(workspaceId, userId, provider, text(formData, 'apiKey'));
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}&provider=${provider}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=key`);
}

export async function setAiModelAction(formData: FormData): Promise<void> {
  const { workspaceId, back } = await authorize(formData);
  try {
    await setAiModel(workspaceId, text(formData, 'model'));
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=model`);
}

export async function removeAiKeyAction(formData: FormData): Promise<void> {
  const { workspaceId, back } = await authorize(formData);
  try {
    await removeAiKey(workspaceId);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=removed`);
}
