'use server';

import { redirect } from 'next/navigation';
import { acceptInvitation } from '@/lib/members';

export async function acceptInvitationAction(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  let slug: string;
  try {
    slug = (await acceptInvitation(token)).workspaceSlug;
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    redirect(`/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(code)}`);
  }
  redirect(`/w/${slug}/library`);
}
