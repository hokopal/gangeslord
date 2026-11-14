'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { removeIntegration, saveIntegration, sendTest } from '@/lib/integrations';
import { isIntegrationKind, type IntegrationKind } from '@/lib/integrations-core';
import { appOrigin } from '@/lib/origin';
import { can } from '@/lib/roles';
import { getUser } from '@/lib/supabase/server';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const codeOf = (error: unknown) => (error instanceof Error ? error.message : 'unknown');

/** Only admins may manage connections. */
async function authorize(formData: FormData) {
  const slug = text(formData, 'workspace');
  const kind = text(formData, 'kind');
  if (!isIntegrationKind(kind)) redirect(`/w/${slug}/integrations?error=integration_invalid`);
  const back = `/w/${slug}/integrations/${kind}`;
  const [context, user] = await Promise.all([getWorkspaceContext(slug), getUser()]);
  if (!context || !user || !can(context.role, 'settings.write')) redirect(`${back}?error=not_allowed`);
  return { workspace: context.workspace, userId: user.id, kind: kind as IntegrationKind, back, slug };
}

export async function saveIntegrationAction(formData: FormData): Promise<void> {
  const { workspace, userId, kind, back, slug } = await authorize(formData);
  try {
    await saveIntegration(workspace.id, userId, kind, text(formData, 'url'), formData.getAll('events'));
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(`/w/${slug}/integrations`);
  redirect(`${back}?saved=1`);
}

export async function testIntegrationAction(formData: FormData): Promise<void> {
  const { workspace, kind, back, slug } = await authorize(formData);
  let status: string;
  try {
    status = await sendTest(workspace.id, kind, {
      workspaceName: workspace.name,
      trackName: 'Test track',
      visitor: 'Test visitor',
      account: null,
      sessionUrl: `${await appOrigin()}/w/${slug}/analytics`,
    });
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(back);
  redirect(`${back}?test=${encodeURIComponent(status)}`);
}

export async function removeIntegrationAction(formData: FormData): Promise<void> {
  const { workspace, kind, back, slug } = await authorize(formData);
  try {
    await removeIntegration(workspace.id, kind);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(`/w/${slug}/integrations`);
  redirect(`${back}?removed=1`);
}
