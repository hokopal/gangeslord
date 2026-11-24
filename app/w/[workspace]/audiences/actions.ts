'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deleteAudience, generateLinks, importSegment, writeLinksToHubspot } from '@/lib/audiences';
import { siteOrigin } from '@/lib/origin';
import { can } from '@/lib/roles';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const codeOf = (error: unknown) => (error instanceof Error ? error.message : 'unknown');
const UUID = /^[0-9a-f-]{36}$/;

async function authorize(formData: FormData, back: (slug: string) => string) {
  const slug = text(formData, 'workspace');
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'content.write')) redirect(`${back(slug)}?error=not_allowed`);
  return { workspace: context.workspace, slug };
}

export async function importSegmentAction(formData: FormData): Promise<void> {
  const { workspace, slug } = await authorize(formData, (s) => `/w/${s}/audiences`);
  let audienceId: string;
  try {
    audienceId = await importSegment(workspace.id, text(formData, 'segment'), text(formData, 'name'), text(formData, 'properties'));
  } catch (error) {
    redirect(`/w/${slug}/audiences?error=${encodeURIComponent(codeOf(error))}&q=${encodeURIComponent(text(formData, 'q'))}`);
  }
  revalidatePath(`/w/${slug}/audiences`);
  redirect(`/w/${slug}/audiences/${audienceId}?synced=1`);
}

export async function deleteAudienceAction(formData: FormData): Promise<void> {
  const audienceId = text(formData, 'audience');
  const { workspace, slug } = await authorize(formData, (s) => `/w/${s}/audiences/${audienceId}`);
  try {
    await deleteAudience(workspace.id, audienceId);
  } catch (error) {
    redirect(`/w/${slug}/audiences/${audienceId}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(`/w/${slug}/audiences`);
  redirect(`/w/${slug}/audiences?deleted=1`);
}

/** Resolves the audience page, track and origin shared by the two link actions. */
async function linkContext(formData: FormData) {
  const audienceId = text(formData, 'audience');
  const trackId = text(formData, 'track');
  const { workspace, slug } = await authorize(formData, (s) => `/w/${s}/audiences/${audienceId}`);
  const back = `/w/${slug}/audiences/${audienceId}`;
  if (!UUID.test(audienceId) || !UUID.test(trackId)) redirect(`${back}?error=not_found`);
  const detail = await getTrackDetail(workspace.id, trackId);
  if (!detail) redirect(`${back}?error=not_found`);
  return { workspace, slug, back, audienceId, track: detail.track };
}

export async function generateLinksAction(formData: FormData): Promise<void> {
  const { workspace, back, audienceId, track } = await linkContext(formData);
  let count: number;
  try {
    count = await generateLinks(workspace.id, audienceId, track.id);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(back);
  redirect(`${back}?links=${count}#links`);
}

export async function writeLinksAction(formData: FormData): Promise<void> {
  const { workspace, slug, back, audienceId, track } = await linkContext(formData);
  let count: number;
  try {
    count = await writeLinksToHubspot(workspace.id, audienceId, track.id, await siteOrigin(slug), slug, track.slug);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  redirect(`${back}?written=${count}#links`);
}
