'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { replyGuestNote, resolveGuestNote, shareTrack, unshareTrack } from '@/lib/guest-notes';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const UUID = /^[0-9a-f-]{36}$/;

/** Checks the track belongs to a workspace the caller is in. The database decides the rest. */
async function target(formData: FormData) {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const context = await getWorkspaceContext(slug);
  const detail = context && UUID.test(trackId) ? await getTrackDetail(context.workspace.id, trackId) : null;
  if (!detail) redirect(`/w/${slug}/tracks`);
  return { trackId: detail.track.id, back: `/w/${slug}/tracks/${detail.track.id}/notes` };
}

async function run(back: string, work: () => Promise<void>): Promise<never> {
  try {
    await work();
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown')}`);
  }
  revalidatePath(back);
  redirect(back);
}

export async function resolveNoteAction(formData: FormData): Promise<void> {
  const { back } = await target(formData);
  const note = text(formData, 'note');
  await run(back, () => (UUID.test(note) ? resolveGuestNote(note, text(formData, 'resolved') === 'true') : Promise.reject(new Error('not_allowed'))));
}

/** Sends the owner's reply to a guest's comment; the guest sees it in the room's comments panel. */
export async function replyNoteAction(formData: FormData): Promise<void> {
  const { back } = await target(formData);
  const note = text(formData, 'note');
  await run(back, () => (UUID.test(note) ? replyGuestNote(note, text(formData, 'reply')) : Promise.reject(new Error('not_allowed'))));
}

export async function shareTrackAction(formData: FormData): Promise<void> {
  const { trackId, back } = await target(formData);
  const user = text(formData, 'user');
  await run(back, () => (UUID.test(user) ? shareTrack(trackId, user) : Promise.reject(new Error('not_allowed'))));
}

export async function unshareTrackAction(formData: FormData): Promise<void> {
  const { trackId, back } = await target(formData);
  const user = text(formData, 'user');
  await run(back, () => (UUID.test(user) ? unshareTrack(trackId, user) : Promise.reject(new Error('not_allowed'))));
}
