'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateDraftTrack } from '@/lib/ai/generate';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

export async function generateTrackAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const back = `/w/${slug}/tracks/ai`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'content.write')) redirect(`${back}?error=not_allowed`);
  const brief = text(formData, 'brief');
  let result: { trackId: string; ctaLabel: string };
  try {
    result = await generateDraftTrack(context.workspace.id, brief);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    redirect(`${back}?error=${encodeURIComponent(code)}&brief=${encodeURIComponent(brief.slice(0, 1500))}`);
  }
  revalidatePath(`/w/${slug}/tracks`);
  redirect(`${back}/${result.trackId}${result.ctaLabel ? `?cta=${encodeURIComponent(result.ctaLabel)}` : ''}`);
}
