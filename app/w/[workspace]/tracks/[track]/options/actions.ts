'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { saveRoomOptions } from '@/lib/forms-server';
import { can } from '@/lib/roles';
import { FORM_FIELDS, MAX_CUSTOM_FIELDS } from '@/lib/room-options';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const on = (formData: FormData, key: string) => formData.get(key) === 'on';

export async function saveRoomOptionsAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const trackId = text(formData, 'track');
  const back = `/w/${slug}/tracks/${trackId}/options`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'content.write')) redirect(`${back}?error=not_allowed`);
  const detail = /^[0-9a-f-]{36}$/.test(trackId) ? await getTrackDetail(context.workspace.id, trackId) : null;
  if (!detail) redirect(`/w/${slug}/tracks`);
  try {
    await saveRoomOptions(
      context.workspace.id,
      detail.track.id,
      { share: on(formData, 'share'), progress: on(formData, 'progress'), numbers: on(formData, 'numbers') },
      {
        enabled: on(formData, 'formEnabled'),
        when: text(formData, 'when'),
        seconds: text(formData, 'seconds'),
        items: text(formData, 'items'),
        heading: text(formData, 'heading'),
        intro: text(formData, 'intro'),
        button: text(formData, 'button'),
        // Each field is "off", "optional" or "required". Email is forced on by the library.
        fields: FORM_FIELDS.map((field) => ({ key: field.key, mode: text(formData, `field-${field.key}`) }))
          .filter((field) => field.mode === 'optional' || field.mode === 'required')
          .map((field) => ({ key: field.key, required: field.mode === 'required' })),
        consent: text(formData, 'consent'),
        // Up to three questions of the workspace's own; a row with no wording is not asked.
        custom: Array.from({ length: MAX_CUSTOM_FIELDS }, (_, i) => ({
          label: text(formData, `custom-label-${i + 1}`),
          required: text(formData, `custom-mode-${i + 1}`) === 'required',
        })),
        hubspot: on(formData, 'hubspot'),
        webhook: text(formData, 'webhook'),
      },
      on(formData, 'removeWebhook'),
    );
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown')}`);
  }
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}
