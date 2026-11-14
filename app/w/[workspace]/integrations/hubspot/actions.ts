'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { removeHubspot, saveHubspotToken } from '@/lib/audiences';
import { getHubspotActivity, setHubspotActivity } from '@/lib/hubspot-activity';
import { can } from '@/lib/roles';
import { getUser } from '@/lib/supabase/server';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const codeOf = (error: unknown) => (error instanceof Error ? error.message : 'unknown');

/** Only admins may connect or disconnect HubSpot. */
async function authorize(formData: FormData) {
  const slug = text(formData, 'workspace');
  const back = `/w/${slug}/integrations/hubspot`;
  const [context, user] = await Promise.all([getWorkspaceContext(slug), getUser()]);
  if (!context || !user || !can(context.role, 'settings.write')) redirect(`${back}?error=not_allowed`);
  return { workspaceId: context.workspace.id, userId: user.id, back, slug };
}

export async function connectHubspotAction(formData: FormData): Promise<void> {
  const { workspaceId, userId, back, slug } = await authorize(formData);
  try {
    // Replacing the token must not silently switch timeline logging off.
    const { enabled } = await getHubspotActivity(workspaceId);
    await saveHubspotToken(workspaceId, userId, text(formData, 'token'));
    if (enabled) await setHubspotActivity(workspaceId, true);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(`/w/${slug}/integrations`);
  redirect(`${back}?saved=1`);
}

export async function removeHubspotAction(formData: FormData): Promise<void> {
  const { workspaceId, back, slug } = await authorize(formData);
  try {
    await removeHubspot(workspaceId);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(`/w/${slug}/integrations`);
  redirect(`${back}?removed=1`);
}

export async function setHubspotActivityAction(formData: FormData): Promise<void> {
  const { workspaceId, back } = await authorize(formData);
  try {
    await setHubspotActivity(workspaceId, formData.get('activity') === 'on');
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(back);
  redirect(`${back}?activity=1#activity`);
}
