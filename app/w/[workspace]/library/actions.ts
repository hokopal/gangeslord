'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addAssetFromUrl,
  deleteAsset,
  registerUploadedPdf,
  saveSnapshot,
  updateAsset,
  switchToLivePage,
} from '@/lib/assets';
import { siteOrigin } from '@/lib/origin';
import { can, type Action } from '@/lib/roles';
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/workspaces';

const MAX_URLS = 20;
const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const codeOf = (error: unknown) => (error instanceof Error ? error.message : 'unknown');

async function authorize(slug: string, action: Action, back: string): Promise<WorkspaceContext> {
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, action)) redirect(`${back}?error=not_allowed`);
  return context;
}

export async function addContentAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const back = `/w/${slug}/library`;
  const { workspace } = await authorize(slug, 'content.write', back);
  const urls = [...new Set(text(formData, 'urls').split(/\s+/).filter(Boolean))].slice(0, MAX_URLS);
  if (urls.length === 0) redirect(`${back}?error=url_invalid`);

  const origin = await siteOrigin();
  let failed = 0;
  let review = 0;
  let lastId = '';
  // One at a time: polite to the sites being fetched, and keeps slugs from colliding.
  for (const url of urls) {
    const asset = await addAssetFromUrl(workspace.id, url, origin);
    lastId = asset.id;
    if (asset.status === 'failed') failed += 1;
    if (asset.status === 'needs_confirmation') review += 1;
  }
  revalidatePath(back);
  if (urls.length === 1) redirect(`${back}/${lastId}`);
  redirect(`${back}?added=${urls.length - failed}&failed=${failed}&review=${review}`);
}

/** Called by the browser after it has uploaded a PDF straight to storage. */
export async function registerPdfAction(slug: string, id: string, fileName: string): Promise<void> {
  const back = `/w/${slug}/library`;
  const { workspace } = await authorize(slug, 'content.write', back);
  let assetId: string;
  try {
    assetId = (await registerUploadedPdf(workspace.id, id, fileName)).id;
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(back);
  redirect(`${back}/${assetId}`);
}

export async function updateAssetAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const id = text(formData, 'asset');
  const back = `/w/${slug}/library/${id}`;
  const { workspace } = await authorize(slug, 'content.write', back);
  try {
    await updateAsset(workspace.id, id, {
      title: text(formData, 'title'),
      description: text(formData, 'description'),
      slug: text(formData, 'slug'),
      thresholdSeconds: Number(text(formData, 'threshold')),
    });
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(`/w/${slug}/library`);
  redirect(`${back}?saved=1`);
}

export async function deleteAssetAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const id = text(formData, 'asset');
  const back = `/w/${slug}/library/${id}`;
  const { workspace } = await authorize(slug, 'content.delete', back);
  try {
    await deleteAsset(workspace.id, id);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(`/w/${slug}/library`);
  redirect(`/w/${slug}/library`);
}

export async function saveSnapshotAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const id = text(formData, 'asset');
  const back = `/w/${slug}/library/${id}`;
  const { workspace } = await authorize(slug, 'content.write', back);
  if (text(formData, 'rights') !== 'on') redirect(`${back}?error=rights_required`);
  try {
    await saveSnapshot(workspace.id, id, await siteOrigin());
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(`/w/${slug}/library`);
  redirect(`${back}?saved=1`);
}

export async function switchToLivePageAction(formData: FormData): Promise<void> {
  const slug = text(formData, 'workspace');
  const id = text(formData, 'asset');
  const back = `/w/${slug}/library/${id}`;
  const { workspace } = await authorize(slug, 'content.write', back);
  try {
    await switchToLivePage(workspace.id, id, await siteOrigin());
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(codeOf(error))}`);
  }
  revalidatePath(`/w/${slug}/library`);
  redirect(`${back}?saved=1`);
}
