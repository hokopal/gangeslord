'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requestToJoin } from '@/lib/join-requests';
import { createWorkspace } from '@/lib/workspaces';

export async function createWorkspaceAction(formData: FormData): Promise<void> {
  let slug: string;
  try {
    slug = (await createWorkspace(String(formData.get('name') ?? ''))).slug;
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    redirect(`/onboarding?error=${encodeURIComponent(code)}`);
  }
  redirect(`/w/${slug}/library`);
}

/** Asks the admins of a colleague's workspace to let the signed-in person in. */
export async function requestToJoinAction(formData: FormData): Promise<void> {
  try {
    await requestToJoin(String(formData.get('workspace') ?? ''));
  } catch (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown')}`);
  }
  revalidatePath('/onboarding');
  redirect('/onboarding?requested=1');
}
