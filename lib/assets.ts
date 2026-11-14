import { buildSnapshot } from './ingest/html';
import { inspectUrl, type Inspection } from './ingest/inspect';
import { parseYouTubeId } from './ingest/youtube';
import { isValidTitleSlug, nextAvailableSlug, slugifyTitle, TITLE_SLUG_MAX } from './slug';
import { createServerSupabase } from './supabase/server';

export type AssetType = 'web' | 'pdf' | 'youtube';
export type RenderMode = 'iframe' | 'snapshot' | 'file' | 'embed';
export type AssetStatus = 'ready' | 'needs_confirmation' | 'failed';

export type Asset = {
  id: string;
  workspaceId: string;
  type: AssetType;
  sourceUrl: string | null;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  slug: string;
  renderMode: RenderMode;
  filePath: string | null;
  videoId: string | null;
  thresholdSeconds: number;
  status: AssetStatus;
  error: string | null;
  snapshotAt: string | null;
  createdAt: string;
};

type AssetRow = {
  id: string;
  workspace_id: string;
  type: AssetType;
  source_url: string | null;
  title: string;
  description: string;
  thumbnail_url: string | null;
  slug: string;
  render_mode: RenderMode;
  file_path: string | null;
  video_id: string | null;
  threshold_seconds: number;
  status: AssetStatus;
  error: string | null;
  snapshot_at: string | null;
  created_at: string;
};

export const ASSET_TYPES: readonly AssetType[] = ['web', 'pdf', 'youtube'];
export const DEFAULT_THRESHOLD: Record<AssetType, number> = { web: 30, pdf: 60, youtube: 30 };
const BUCKET = 'assets';
const COLUMNS =
  'id, workspace_id, type, source_url, title, description, thumbnail_url, slug, render_mode, file_path, video_id, threshold_seconds, status, error, snapshot_at, created_at';
const UNIQUE_VIOLATION = '23505';
const INGEST_ERRORS = new Set([
  'url_invalid', 'url_blocked', 'fetch_failed', 'too_large', 'too_many_redirects',
  'page_unavailable', 'video_unavailable', 'unsupported_type', 'storage_failed',
]);

function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    sourceUrl: row.source_url,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    slug: row.slug,
    renderMode: row.render_mode,
    filePath: row.file_path,
    videoId: row.video_id,
    thresholdSeconds: row.threshold_seconds,
    status: row.status,
    error: row.error,
    snapshotAt: row.snapshot_at,
    createdAt: row.created_at,
  };
}

const codeOf = (error: unknown) =>
  error instanceof Error && INGEST_ERRORS.has(error.message) ? error.message : 'fetch_failed';

export function isAssetType(value: unknown): value is AssetType {
  return typeof value === 'string' && (ASSET_TYPES as readonly string[]).includes(value);
}

/** Best guess at a type from the URL alone, used to label an asset whose ingest failed. */
export function guessType(url: string): AssetType {
  if (parseYouTubeId(url)) return 'youtube';
  return /\.pdf(\?|#|$)/i.test(url) ? 'pdf' : 'web';
}

export async function listAssets(
  workspaceId: string,
  filter: { q?: string; type?: AssetType } = {},
): Promise<Asset[]> {
  const supabase = await createServerSupabase();
  let query = supabase.from('assets').select(COLUMNS).eq('workspace_id', workspaceId);
  if (filter.type) query = query.eq('type', filter.type);
  const q = filter.q?.trim().replace(/[%_,()]/g, ' ');
  if (q) query = query.ilike('title', `%${q}%`);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AssetRow[]).map(toAsset);
}

export async function getAsset(workspaceId: string, id: string): Promise<Asset | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('assets')
    .select(COLUMNS)
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .maybeSingle();
  return data ? toAsset(data as AssetRow) : null;
}

async function uniqueSlug(workspaceId: string, title: string, exceptId?: string): Promise<string> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from('assets').select('id, slug').eq('workspace_id', workspaceId);
  const taken = new Set(
    ((data ?? []) as { id: string; slug: string }[]).filter((r) => r.id !== exceptId).map((r) => r.slug),
  );
  return nextAvailableSlug(slugifyTitle(title), taken, TITLE_SLUG_MAX);
}

async function insertAsset(workspaceId: string, values: Record<string, unknown>): Promise<Asset> {
  const supabase = await createServerSupabase();
  const title = String(values.title);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await uniqueSlug(workspaceId, title);
    const { data, error } = await supabase
      .from('assets')
      .insert({ ...values, workspace_id: workspaceId, slug })
      .select(COLUMNS)
      .single();
    if (!error) return toAsset(data as AssetRow);
    // Another request took the slug between the check and the insert: pick again.
    if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
  }
  throw new Error('slug_taken');
}

async function storeFile(path: string, body: Uint8Array | string, contentType: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: true });
  if (error) throw new Error('storage_failed');
}

function valuesFor(inspection: Inspection, id: string, workspaceId: string): Record<string, unknown> {
  const common = { id, source_url: inspection.sourceUrl, title: inspection.title };
  switch (inspection.kind) {
    case 'youtube':
      return {
        ...common,
        type: 'youtube',
        description: inspection.description,
        thumbnail_url: inspection.thumbnailUrl,
        render_mode: 'embed',
        video_id: inspection.videoId,
        threshold_seconds: DEFAULT_THRESHOLD.youtube,
      };
    case 'pdf':
      return {
        ...common,
        type: 'pdf',
        render_mode: 'file',
        file_path: `${workspaceId}/${id}.pdf`,
        threshold_seconds: DEFAULT_THRESHOLD.pdf,
      };
    case 'web':
      return {
        ...common,
        type: 'web',
        description: inspection.description,
        thumbnail_url: inspection.thumbnailUrl,
        extracted_text: inspection.text,
        threshold_seconds: DEFAULT_THRESHOLD.web,
        // A page that forbids framing waits for the editor to agree to a snapshot.
        render_mode: inspection.framingAllowed ? 'iframe' : 'snapshot',
        status: inspection.framingAllowed ? 'ready' : 'needs_confirmation',
      };
  }
}

/**
 * Adds a link to the library. Ingest problems do not throw: the asset is stored
 * as failed with the reason, so the editor can see what went wrong.
 */
export async function addAssetFromUrl(workspaceId: string, rawUrl: string, origin: string): Promise<Asset> {
  const url = rawUrl.trim();
  const id = crypto.randomUUID();
  try {
    const inspection = await inspectUrl(url, origin);
    if (inspection.kind === 'pdf') {
      await storeFile(`${workspaceId}/${id}.pdf`, inspection.bytes, 'application/pdf');
    }
    return await insertAsset(workspaceId, valuesFor(inspection, id, workspaceId));
  } catch (error) {
    const type = guessType(url);
    return insertAsset(workspaceId, {
      id,
      type,
      source_url: url.slice(0, 2000),
      title: url.slice(0, 300) || 'Untitled',
      render_mode: type === 'youtube' ? 'embed' : type === 'pdf' ? 'file' : 'iframe',
      threshold_seconds: DEFAULT_THRESHOLD[type],
      status: 'failed',
      error: codeOf(error),
    });
  }
}

/** Registers a PDF the browser has already uploaded to `<workspaceId>/<id>.pdf`. */
export async function registerUploadedPdf(workspaceId: string, id: string, fileName: string): Promise<Asset> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('not_found');
  const title = fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 300) || 'Untitled PDF';
  return insertAsset(workspaceId, {
    id,
    type: 'pdf',
    title,
    render_mode: 'file',
    file_path: `${workspaceId}/${id}.pdf`,
    threshold_seconds: DEFAULT_THRESHOLD.pdf,
  });
}

export type AssetPatch = { title: string; description: string; slug: string; thresholdSeconds: number };

export async function updateAsset(workspaceId: string, id: string, patch: AssetPatch): Promise<void> {
  const title = patch.title.trim();
  if (title === '') throw new Error('title_required');
  if (!isValidTitleSlug(patch.slug)) throw new Error('slug_invalid');
  if (!Number.isInteger(patch.thresholdSeconds) || patch.thresholdSeconds < 1 || patch.thresholdSeconds > 3600) {
    throw new Error('threshold_invalid');
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('assets')
    .update({
      title: title.slice(0, 300),
      description: patch.description.trim().slice(0, 1000),
      slug: patch.slug,
      threshold_seconds: patch.thresholdSeconds,
    })
    .eq('workspace_id', workspaceId)
    .eq('id', id);
  if (error) throw new Error(error.code === UNIQUE_VIOLATION ? 'slug_taken' : error.message);
}

export async function deleteAsset(workspaceId: string, id: string): Promise<void> {
  const asset = await getAsset(workspaceId, id);
  if (!asset) return;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('assets')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  // Row-level security filters silently: no row back means the caller may not delete.
  if (!data || data.length === 0) throw new Error('not_allowed');
  if (asset.filePath) await supabase.storage.from(BUCKET).remove([asset.filePath]);
}

/** Fetches the page again and stores a static copy; the asset then renders from that copy. */
export async function saveSnapshot(workspaceId: string, id: string, origin: string): Promise<void> {
  const asset = await getAsset(workspaceId, id);
  if (!asset || asset.type !== 'web' || !asset.sourceUrl) throw new Error('not_found');
  const inspection = await inspectUrl(asset.sourceUrl, origin);
  if (inspection.kind !== 'web') throw new Error('unsupported_type');
  const path = `${workspaceId}/${id}.html`;
  await storeFile(path, buildSnapshot(inspection.html, inspection.sourceUrl), 'text/html');
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('assets')
    .update({
      render_mode: 'snapshot',
      file_path: path,
      status: 'ready',
      error: null,
      rights_confirmed: true,
      snapshot_at: new Date().toISOString(),
      extracted_text: inspection.text,
    })
    .eq('workspace_id', workspaceId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Switches a snapshot asset back to the live page, if the page allows framing. */
export async function switchToLivePage(workspaceId: string, id: string, origin: string): Promise<void> {
  const asset = await getAsset(workspaceId, id);
  if (!asset || asset.type !== 'web' || !asset.sourceUrl) throw new Error('not_found');
  const inspection = await inspectUrl(asset.sourceUrl, origin);
  if (inspection.kind !== 'web' || !inspection.framingAllowed) throw new Error('framing_blocked');
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('assets')
    .update({ render_mode: 'iframe', status: 'ready', error: null })
    .eq('workspace_id', workspaceId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** The stored snapshot HTML for an asset the caller can read, or null. */
export async function readSnapshot(id: string): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data: row } = await supabase
    .from('assets')
    .select('file_path, render_mode')
    .eq('id', id)
    .maybeSingle();
  if (!row || row.render_mode !== 'snapshot' || !row.file_path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(row.file_path as string);
  if (error || !data) return null;
  return data.text();
}

/** A short-lived link to a stored PDF. */
export async function signedFileUrl(asset: Asset): Promise<string | null> {
  if (!asset.filePath) return null;
  const supabase = await createServerSupabase();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(asset.filePath, 3600);
  return data?.signedUrl ?? null;
}
