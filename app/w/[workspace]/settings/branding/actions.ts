'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { saveBranding } from '@/lib/branding';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

export async function saveBrandingAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const back = `/w/${slug}/settings/branding`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.write')) redirect(`${back}?error=not_allowed`);
  try {
    await saveBranding(context.workspace.id, {
      logoUrl: text(formData, 'logoUrl'),
      brandColor: text(formData, 'useColor') === 'on' ? text(formData, 'brandColor') : '',
      faviconUrl: text(formData, 'faviconUrl'),
      footerText: text(formData, 'footerText'),
      footerUrl: text(formData, 'footerUrl'),
      hideFelloMark: text(formData, 'hideFelloMark') === 'on',
    });
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown')}`);
  }
  revalidatePath(`/w/${slug}`, 'layout');
  redirect(`${back}?saved=1`);
}
