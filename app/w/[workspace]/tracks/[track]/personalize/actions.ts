'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { can } from '@/lib/roles';
import { createServerSupabase } from '@/lib/supabase/server';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

export async function saveWelcomeAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/tracks/${trackId}/personalize`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'content.write')) redirect(`${back}?error=not_allowed`);
  const message = text(formData, 'welcome');
  if (message.length > 500) redirect(`${back}?error=welcome_too_long`);
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('tracks').update({ welcome_message: message }).eq('workspace_id', context.workspace.id).eq('id', trackId);
  if (error) redirect(`${back}?error=not_allowed`);
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}
