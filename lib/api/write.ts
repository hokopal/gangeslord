import { DEFAULT_THRESHOLD, guessType } from '../assets';
import { normalizeCta } from '../cta';
import { inspectUrl } from '../ingest/inspect';
import { moveId, positionAt } from '../ordering';
import { isValidTitleSlug, nextAvailableSlug, slugifyTitle, TITLE_SLUG_MAX } from '../slug';
import { createAdminSupabase } from '../supabase/admin';
import { ApiError } from './service';

// Admin-scoped write operations for the MCP server. Every query carries the workspace id
// explicitly because the service-role client bypasses row-level security.

const BUCKET = 'assets';
const UNIQUE_VIOLATION = '23505';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const INGEST_ERRORS = new Set([
  'url_invalid', 'url_blocked', 'fetch_failed', 'too_large', 'too_many_redirects',
  'page_unavailable', 'video_unavailable', 'unsupported_type', 'storage_failed',
]);

const codeOf = (error: unknown) =>
  error instanceof Error && INGEST_ERRORS.has(error.message) ? error.message : 'fetch_failed';

type AssetSummary = { id: string; title: string; type: string; status: string; source_url: string | null };
type AssetRow = { id: string; title: string; description: string; slug: string; threshold_seconds: number; type: string; source_url: string | null; file_path: string | null; status: string };
type TrackRow = { id: string; name: string; slug: string; status: string; header_title: string; show_next_button: boolean };

async function storeFile(path: string, body: Uint8Array | string, contentType: string): Promise<void> {
  const { error } = await createAdminSupabase().storage.from(BUCKET).upload(path, body, { contentType, upsert: true });
  if (error) throw new Error('storage_failed');
}

async function uniqueSlug(workspaceId: string, title: string, exceptId?: string): Promise<string> {
  const { data } = await createAdminSupabase().from('assets').select('id, slug').eq('workspace_id', workspaceId);
  const taken = new Set(((data ?? []) as { id: string; slug: string }[]).filter((r) => r.id !== exceptId).map((r) => r.slug));
  return nextAvailableSlug(slugifyTitle(title), taken, TITLE_SLUG_MAX);
}

async function insertAsset(workspaceId: string, values: Record<string, unknown>): Promise<AssetSummary> {
  const title = String(values.title);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await uniqueSlug(workspaceId, title);
    const { data, error } = await createAdminSupabase()
      .from('assets')
      .insert({ ...values, workspace_id: workspaceId, slug })
      .select('id, title, type, status, source_url')
      .single();
    if (!error) return data as AssetSummary;
    if (error.code !== UNIQUE_VIOLATION) throw new ApiError(500, 'server_error', error.message);
  }
  throw new ApiError(409, 'slug_taken', 'Could not create a unique slug.');
}

async function requireTrack(workspaceId: string, trackId: string): Promise<TrackRow> {
  if (!UUID.test(trackId)) throw new ApiError(404, 'not_found', 'Track not found.');
  const { data } = await createAdminSupabase()
    .from('tracks')
    .select('id, name, slug, status, header_title, show_next_button')
    .eq('workspace_id', workspaceId)
    .eq('id', trackId)
    .maybeSingle();
  if (!data) throw new ApiError(404, 'not_found', 'Track not found.');
  return data as TrackRow;
}

async function getAssetRow(workspaceId: string, assetId: string): Promise<AssetRow | null> {
  if (!UUID.test(assetId)) return null;
  const { data } = await createAdminSupabase()
    .from('assets')
    .select('id, title, description, slug, threshold_seconds, type, source_url, file_path, status')
    .eq('workspace_id', workspaceId)
    .eq('id', assetId)
    .maybeSingle();
  return (data as AssetRow | null) ?? null;
}

type Inspection = Awaited<ReturnType<typeof inspectUrl>>;

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
        render_mode: inspection.framingAllowed ? 'iframe' : 'snapshot',
        status: inspection.framingAllowed ? 'ready' : 'needs_confirmation',
      };
  }
}

export async function apiAddAssetFromUrl(workspaceId: string, rawUrl: string, origin: string): Promise<AssetSummary> {
  const url = rawUrl.trim();
  if (url === '') throw new ApiError(400, 'invalid_request', 'url is required.');
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

export async function apiAddPdf(workspaceId: string, filename: string, base64: string): Promise<AssetSummary> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  } catch {
    throw new ApiError(400, 'invalid_request', 'base64 is not valid.');
  }
  if (bytes.length === 0 || bytes.length > 50 * 1024 * 1024) throw new ApiError(400, 'invalid_request', 'file is empty or too large.');
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new ApiError(400, 'invalid_request', 'file is not a PDF.');
  const id = crypto.randomUUID();
  await storeFile(`${workspaceId}/${id}.pdf`, bytes, 'application/pdf');
  const title = filename.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 300) || 'Untitled PDF';
  return insertAsset(workspaceId, {
    id,
    type: 'pdf',
    title,
    render_mode: 'file',
    file_path: `${workspaceId}/${id}.pdf`,
    threshold_seconds: DEFAULT_THRESHOLD.pdf,
  });
}

export async function apiUpdateAsset(
  workspaceId: string,
  assetId: string,
  patch: { title?: string; description?: string; slug?: string; thresholdSeconds?: number },
): Promise<void> {
  const existing = await getAssetRow(workspaceId, assetId);
  if (!existing) throw new ApiError(404, 'not_found', 'Library item not found.');
  const title = (patch.title ?? existing.title).trim();
  if (title === '') throw new ApiError(400, 'invalid_request', 'title is required.');
  const slug = patch.slug ?? existing.slug;
  if (!isValidTitleSlug(slug)) throw new ApiError(400, 'invalid_request', 'slug is invalid.');
  const thresholdSeconds = patch.thresholdSeconds ?? existing.threshold_seconds;
  if (!Number.isInteger(thresholdSeconds) || thresholdSeconds < 1 || thresholdSeconds > 3600) {
    throw new ApiError(400, 'invalid_request', 'threshold_seconds must be a whole number between 1 and 3600.');
  }
  const { error } = await createAdminSupabase()
    .from('assets')
    .update({
      title: title.slice(0, 300),
      description: (patch.description ?? existing.description).trim().slice(0, 1000),
      slug,
      threshold_seconds: thresholdSeconds,
    })
    .eq('workspace_id', workspaceId)
    .eq('id', assetId);
  if (error) throw new ApiError(error.code === UNIQUE_VIOLATION ? 409 : 500, error.code === UNIQUE_VIOLATION ? 'slug_taken' : 'server_error', error.message);
}

export async function apiDeleteAsset(workspaceId: string, assetId: string): Promise<void> {
  const asset = await getAssetRow(workspaceId, assetId);
  if (!asset) return;
  const { data, error } = await createAdminSupabase()
    .from('assets')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', assetId)
    .select('id');
  if (error) throw new ApiError(500, 'server_error', error.message);
  if (!data || data.length === 0) throw new ApiError(403, 'not_allowed', 'You cannot delete this item.');
  if (asset.file_path) await createAdminSupabase().storage.from(BUCKET).remove([asset.file_path]);
}

export async function apiCreateTrack(workspaceId: string, name: string): Promise<{ id: string; name: string; slug: string; status: string }> {
  const trimmed = name.trim();
  if (trimmed === '') throw new ApiError(400, 'invalid_request', 'name is required.');
  const admin = createAdminSupabase();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: existing } = await admin.from('tracks').select('slug').eq('workspace_id', workspaceId);
    const taken = new Set(((existing ?? []) as { slug: string }[]).map((r) => r.slug));
    const slug = nextAvailableSlug(slugifyTitle(trimmed, 'room'), taken, TITLE_SLUG_MAX);
    const { data, error } = await admin
      .from('tracks')
      .insert({ workspace_id: workspaceId, name: trimmed.slice(0, 120), slug })
      .select('id, name, slug, status')
      .single();
    if (!error) return data as { id: string; name: string; slug: string; status: string };
    if (error.code !== UNIQUE_VIOLATION) throw new ApiError(500, 'server_error', error.message);
  }
  throw new ApiError(409, 'slug_taken', 'Could not create a unique slug.');
}

export async function apiUpdateTrack(
  workspaceId: string,
  trackId: string,
  patch: { name?: string; slug?: string; headerTitle?: string; showNextButton?: boolean },
): Promise<void> {
  const track = await requireTrack(workspaceId, trackId);
  const name = (patch.name ?? track.name).trim();
  if (name === '') throw new ApiError(400, 'invalid_request', 'name is required.');
  const slug = patch.slug ?? track.slug;
  if (!isValidTitleSlug(slug)) throw new ApiError(400, 'invalid_request', 'slug is invalid.');
  const { error } = await createAdminSupabase()
    .from('tracks')
    .update({
      name: name.slice(0, 120),
      slug,
      header_title: (patch.headerTitle ?? track.header_title).trim().slice(0, 120),
      show_next_button: patch.showNextButton ?? track.show_next_button,
    })
    .eq('workspace_id', workspaceId)
    .eq('id', trackId);
  if (error) throw new ApiError(error.code === UNIQUE_VIOLATION ? 409 : 500, error.code === UNIQUE_VIOLATION ? 'slug_taken' : 'server_error', error.message);
}

export async function apiSetPublished(workspaceId: string, trackId: string, published: boolean): Promise<void> {
  await requireTrack(workspaceId, trackId);
  const admin = createAdminSupabase();
  if (published) {
    const { count } = await admin
      .from('track_items')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('track_id', trackId);
    if (!count) throw new ApiError(400, 'invalid_request', 'A track must have at least one item before it can be published.');
  }
  const { error } = await admin
    .from('tracks')
    .update(published ? { status: 'published', published_at: new Date().toISOString() } : { status: 'draft' })
    .eq('workspace_id', workspaceId)
    .eq('id', trackId);
  if (error) throw new ApiError(500, 'server_error', error.message);
}

export async function apiDeleteTrack(workspaceId: string, trackId: string): Promise<void> {
  await requireTrack(workspaceId, trackId);
  const { data, error } = await createAdminSupabase()
    .from('tracks')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', trackId)
    .select('id');
  if (error) throw new ApiError(500, 'server_error', error.message);
  if (!data || data.length === 0) throw new ApiError(403, 'not_allowed', 'You cannot delete this track.');
}

export async function apiAddItem(workspaceId: string, trackId: string, assetId: string): Promise<void> {
  await requireTrack(workspaceId, trackId);
  const admin = createAdminSupabase();
  const [{ data: asset }, { data: existing }] = await Promise.all([
    admin.from('assets').select('slug, status').eq('workspace_id', workspaceId).eq('id', assetId).maybeSingle(),
    admin.from('track_items').select('slug, position').eq('workspace_id', workspaceId).eq('track_id', trackId).order('position'),
  ]);
  if (!asset) throw new ApiError(404, 'not_found', 'Library item not found.');
  if (asset.status !== 'ready') throw new ApiError(400, 'invalid_request', 'Library item is not ready.');
  const rows = (existing ?? []) as { slug: string; position: number }[];
  const slug = nextAvailableSlug(asset.slug as string, new Set(rows.map((r) => r.slug)), TITLE_SLUG_MAX);
  const position = positionAt(rows.map((r) => r.position), rows.length) ?? rows.length + 1;
  const { error } = await admin
    .from('track_items')
    .insert({ workspace_id: workspaceId, track_id: trackId, asset_id: assetId, position, slug });
  if (error) throw new ApiError(error.code === UNIQUE_VIOLATION ? 409 : 500, error.code === UNIQUE_VIOLATION ? 'already_in_track' : 'server_error', error.message);
}

export async function apiRemoveItem(workspaceId: string, trackId: string, itemId: string): Promise<void> {
  await requireTrack(workspaceId, trackId);
  const { error } = await createAdminSupabase()
    .from('track_items')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .eq('id', itemId);
  if (error) throw new ApiError(500, 'server_error', error.message);
}

export async function apiUpdateItem(
  workspaceId: string,
  trackId: string,
  itemId: string,
  patch: { titleOverride?: string; descriptionOverride?: string; slug?: string },
): Promise<void> {
  await requireTrack(workspaceId, trackId);
  const { data: item } = await createAdminSupabase()
    .from('track_items')
    .select('slug, title_override, description_override')
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .eq('id', itemId)
    .maybeSingle();
  if (!item) throw new ApiError(404, 'not_found', 'Track item not found.');
  const slug = patch.slug ?? (item.slug as string);
  if (!isValidTitleSlug(slug)) throw new ApiError(400, 'invalid_request', 'slug is invalid.');
  const { error } = await createAdminSupabase()
    .from('track_items')
    .update({
      title_override: (patch.titleOverride ?? (item.title_override as string | null) ?? '').trim().slice(0, 300),
      description_override: (patch.descriptionOverride ?? (item.description_override as string | null) ?? '').trim().slice(0, 1000),
      slug,
    })
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .eq('id', itemId);
  if (error) throw new ApiError(error.code === UNIQUE_VIOLATION ? 409 : 500, error.code === UNIQUE_VIOLATION ? 'slug_taken' : 'server_error', error.message);
}

export async function apiMoveItem(workspaceId: string, trackId: string, itemId: string, toIndex: number): Promise<void> {
  await requireTrack(workspaceId, trackId);
  if (!Number.isInteger(toIndex) || toIndex < 0) throw new ApiError(400, 'invalid_request', 'to_index must be a whole number of 0 or more.');
  const admin = createAdminSupabase();
  const { data } = await admin
    .from('track_items')
    .select('id, position')
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .order('position');
  const rows = (data ?? []) as { id: string; position: number }[];
  if (!rows.some((r) => r.id === itemId)) throw new ApiError(404, 'not_found', 'Track item not found.');
  const others = rows.filter((r) => r.id !== itemId);
  const position = positionAt(others.map((r) => r.position), toIndex);
  if (position !== null) {
    const { error } = await admin.from('track_items').update({ position }).eq('workspace_id', workspaceId).eq('track_id', trackId).eq('id', itemId);
    if (error) throw new ApiError(500, 'server_error', error.message);
    return;
  }
  const order = moveId(rows.map((r) => r.id), itemId, toIndex);
  for (const [index, id] of order.entries()) {
    const { error } = await admin.from('track_items').update({ position: index + 1 }).eq('workspace_id', workspaceId).eq('track_id', trackId).eq('id', id);
    if (error) throw new ApiError(500, 'server_error', error.message);
  }
}

export async function apiSetCta(
  workspaceId: string,
  trackId: string,
  placement: 'header' | 'sidebar' | 'item',
  itemId: string | null,
  rawLabel: string,
  rawUrl: string,
): Promise<void> {
  await requireTrack(workspaceId, trackId);
  let cta: ReturnType<typeof normalizeCta>;
  try {
    cta = normalizeCta(rawLabel, rawUrl);
  } catch (error) {
    throw new ApiError(400, 'invalid_request', error instanceof Error ? error.message : 'invalid cta');
  }
  const admin = createAdminSupabase();
  let existing = admin.from('track_ctas').delete().eq('workspace_id', workspaceId).eq('track_id', trackId).eq('placement', placement);
  if (placement === 'item') {
    if (!itemId) throw new ApiError(400, 'invalid_request', 'item_id is required for item CTAs.');
    existing = existing.eq('track_item_id', itemId);
  }
  const removed = await existing;
  if (removed.error) throw new ApiError(500, 'server_error', removed.error.message);
  if (!cta) return;
  const { error } = await admin.from('track_ctas').insert({
    workspace_id: workspaceId,
    track_id: trackId,
    placement,
    track_item_id: placement === 'item' ? itemId : null,
    label: cta.label,
    url: cta.url,
  });
  if (error) throw new ApiError(500, 'server_error', error.message);
}
