'use server';

import { redirect } from 'next/navigation';
import { billingPortalUrl } from '@/lib/billing';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';

/** Sends a workspace admin to Paddle's own page to change card, switch plan or cancel. */
export async function manageBillingAction(formData: FormData): Promise<void> {
  const slug = String(formData.get('workspace') ?? '');
  const back = `/w/${slug}/settings/plan`;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.write')) redirect(`${back}?error=not_allowed`);
  const url = await billingPortalUrl(context.workspace.id);
  redirect(url ?? `${back}?error=portal`);
}
