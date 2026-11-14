'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { recomputeTrack, saveOrdering } from '@/lib/optimize-server';
import { can } from '@/lib/roles';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

/** Only editors and admins may change how a track is ordered, and only for a track in their workspace. */
async function authorize(formData: FormData) {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/tracks/${trackId}/optimize`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'content.write')) redirect(`${back}?error=not_allowed`);
  const detail = /^[0-9a-f-]{36}$/.test(trackId) ? await getTrackDetail(context.workspace.id, trackId) : null;
  if (!detail) redirect(`/w/${slug}/tracks`);
  return { workspaceId: context.workspace.id, trackId: detail.track.id, back };
}

export async function saveOrderingAction(formData: FormData): Promise<void> {
  const { workspaceId, trackId, back } = await authorize(formData);
  try {
    await saveOrdering(workspaceId, trackId, text(formData, 'ordering') === 'optimized' ? 'optimized' : 'fixed', formData.get('pinFirst') === 'on');
    // Recalculate straight away, so the page shows what the new setting would do.
    await recomputeTrack(trackId, true);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(error instanceof Error ? error.message : 'optimize_failed')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

export async function recalculateAction(formData: FormData): Promise<void> {
  const { trackId, back } = await authorize(formData);
  try {
    await recomputeTrack(trackId, true);
  } catch {
    redirect(`${back}?error=optimize_failed`);
  }
  revalidatePath(back);
  redirect(`${back}?recalculated=1`);
}
