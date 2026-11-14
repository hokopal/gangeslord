import type { AssetStatus, AssetType, RenderMode } from './assets';
import { normalizeCta } from './cta';
import { moveId, positionAt } from './ordering';
import { isValidTitleSlug, nextAvailableSlug, slugifyTitle, TITLE_SLUG_MAX } from './slug';
import { createServerSupabase } from './supabase/server';

export type TrackStatus = 'draft' | 'published';
export type CtaPlacement = 'header' | 'sidebar' | 'item';

export type Track = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  status: TrackStatus;
  headerTitle: string;
  showNextButton: boolean;
  createdAt: string;
};

export type TrackItem = {
  id: string;
  assetId: string;
  position: number;
  slug: string;
  titleOverride: string;
  descriptionOverride: string;
  asset: { title: string; description: string; type: AssetType; renderMode: RenderMode; status: AssetStatus; thumbnailUrl: string | null };
};

export type TrackCta = { placement: CtaPlacement; trackItemId: string | null; label: string; url: string };
export type TrackDetail = { track: Track; items: TrackItem[]; ctas: TrackCta[] };

type TrackRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  status: TrackStatus;
  header_title: string;
  show_next_button: boolean;
  created_at: string;
};

const TRACK_COLUMNS = 'id, workspace_id, name, slug, status, header_title, show_next_button, created_at';
const UNIQUE_VIOLATION = '23505';

const toTrack = (row: TrackRow): Track => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  slug: row.slug,
  status: row.status,
  headerTitle: row.header_title,
  showNextButton: row.show_next_button,
  createdAt: row.created_at,
});

export async function listTracks(workspaceId: string): Promise<(Track & { itemCount: number })[]> {
  const supabase = await createServerSupabase();
  const [tracks, items] = await Promise.all([
    supabase.from('tracks').select(TRACK_COLUMNS).eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('track_items').select('track_id').eq('workspace_id', workspaceId),
  ]);
  if (tracks.error) throw new Error(tracks.error.message);
  const counts = new Map<string, number>();
  for (const row of (items.data ?? []) as { track_id: string }[]) {
    counts.set(row.track_id, (counts.get(row.track_id) ?? 0) + 1);
  }
  return (tracks.data as TrackRow[]).map((row) => ({ ...toTrack(row), itemCount: counts.get(row.id) ?? 0 }));
}

export async function getTrackDetail(workspaceId: string, trackId: string): Promise<TrackDetail | null> {
  const supabase = await createServerSupabase();
  const { data: row } = await supabase
    .from('tracks')
    .select(TRACK_COLUMNS)
    .eq('workspace_id', workspaceId)
    .eq('id', trackId)
    .maybeSingle();
  if (!row) return null;
  const [items, ctas] = await Promise.all([
    supabase
      .from('track_items')
      .select('id, asset_id, position, slug, title_override, description_override')
      .eq('track_id', trackId)
      .order('position'),
    supabase.from('track_ctas').select('placement, track_item_id, label, url').eq('track_id', trackId),
  ]);
  if (items.error) throw new Error(items.error.message);
  const itemRows = items.data as {
    id: string; asset_id: string; position: number; slug: string; title_override: string; description_override: string;
  }[];
  const assetIds = itemRows.map((r) => r.asset_id);
  const assets = assetIds.length
    ? await supabase.from('assets').select('id, title, description, type, render_mode, status, thumbnail_url').in('id', assetIds)
    : { data: [] };
  const byId = new Map(
    ((assets.data ?? []) as {
      id: string; title: string; description: string; type: AssetType; render_mode: RenderMode; status: AssetStatus; thumbnail_url: string | null;
    }[]).map((a) => [a.id, a]),
  );
  return {
    track: toTrack(row as TrackRow),
    items: itemRows.flatMap((r) => {
      const a = byId.get(r.asset_id);
      if (!a) return [];
      return [{
        id: r.id,
        assetId: r.asset_id,
        position: r.position,
        slug: r.slug,
        titleOverride: r.title_override,
        descriptionOverride: r.description_override,
        asset: { title: a.title, description: a.description, type: a.type, renderMode: a.render_mode, status: a.status, thumbnailUrl: a.thumbnail_url },
      }];
    }),
    ctas: ((ctas.data ?? []) as { placement: CtaPlacement; track_item_id: string | null; label: string; url: string }[]).map(
      (c) => ({ placement: c.placement, trackItemId: c.track_item_id, label: c.label, url: c.url }),
    ),
  };
}

export async function createTrack(workspaceId: string, name: string): Promise<Track> {
  const trimmed = name.trim();
  if (trimmed === '') throw new Error('name_required');
  const supabase = await createServerSupabase();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: existing } = await supabase.from('tracks').select('slug').eq('workspace_id', workspaceId);
    const taken = new Set(((existing ?? []) as { slug: string }[]).map((r) => r.slug));
    const slug = nextAvailableSlug(slugifyTitle(trimmed, 'room'), taken, TITLE_SLUG_MAX);
    const { data, error } = await supabase
      .from('tracks')
      .insert({ workspace_id: workspaceId, name: trimmed.slice(0, 120), slug })
      .select(TRACK_COLUMNS)
      .single();
    if (!error) return toTrack(data as TrackRow);
    if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
  }
  throw new Error('slug_taken');
}

export type TrackPatch = { name: string; slug: string; headerTitle: string; showNextButton: boolean };

export async function updateTrack(workspaceId: string, trackId: string, patch: TrackPatch): Promise<void> {
  const name = patch.name.trim();
  if (name === '') throw new Error('name_required');
  if (!isValidTitleSlug(patch.slug)) throw new Error('slug_invalid');
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('tracks')
    .update({
      name: name.slice(0, 120),
      slug: patch.slug,
      header_title: patch.headerTitle.trim().slice(0, 120),
      show_next_button: patch.showNextButton,
    })
    .eq('workspace_id', workspaceId)
    .eq('id', trackId);
  if (error) throw new Error(error.code === UNIQUE_VIOLATION ? 'slug_taken' : error.message);
}

export async function setPublished(workspaceId: string, trackId: string, published: boolean): Promise<void> {
  const supabase = await createServerSupabase();
  if (published) {
    const { count } = await supabase
      .from('track_items')
      .select('id', { count: 'exact', head: true })
      .eq('track_id', trackId);
    if (!count) throw new Error('track_empty');
  }
  const { error } = await supabase
    .from('tracks')
    .update(published ? { status: 'published', published_at: new Date().toISOString() } : { status: 'draft' })
    .eq('workspace_id', workspaceId)
    .eq('id', trackId);
  if (error) throw new Error(error.message);
}

export async function deleteTrack(workspaceId: string, trackId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('tracks')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', trackId)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('not_allowed');
}

export async function addItem(workspaceId: string, trackId: string, assetId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const [{ data: asset }, { data: existing }] = await Promise.all([
    supabase.from('assets').select('slug, status').eq('workspace_id', workspaceId).eq('id', assetId).maybeSingle(),
    supabase.from('track_items').select('slug, position').eq('track_id', trackId).order('position'),
  ]);
  if (!asset) throw new Error('not_found');
  if (asset.status !== 'ready') throw new Error('asset_not_ready');
  const rows = (existing ?? []) as { slug: string; position: number }[];
  const slug = nextAvailableSlug(asset.slug as string, new Set(rows.map((r) => r.slug)), TITLE_SLUG_MAX);
  const position = positionAt(rows.map((r) => r.position), rows.length) ?? rows.length + 1;
  const { error } = await supabase
    .from('track_items')
    .insert({ workspace_id: workspaceId, track_id: trackId, asset_id: assetId, position, slug });
  if (error) throw new Error(error.code === UNIQUE_VIOLATION ? 'already_in_track' : error.message);
}

export async function removeItem(workspaceId: string, trackId: string, itemId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('track_items')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .eq('id', itemId);
  if (error) throw new Error(error.message);
}

export type ItemPatch = { titleOverride: string; descriptionOverride: string; slug: string };

export async function updateItem(workspaceId: string, trackId: string, itemId: string, patch: ItemPatch): Promise<void> {
  if (!isValidTitleSlug(patch.slug)) throw new Error('slug_invalid');
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('track_items')
    .update({
      title_override: patch.titleOverride.trim().slice(0, 300),
      description_override: patch.descriptionOverride.trim().slice(0, 1000),
      slug: patch.slug,
    })
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .eq('id', itemId);
  if (error) throw new Error(error.code === UNIQUE_VIOLATION ? 'slug_taken' : error.message);
}

/** Moves an item to `toIndex` (its index in the list once it has been lifted out). */
export async function moveItem(workspaceId: string, trackId: string, itemId: string, toIndex: number): Promise<void> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('track_items')
    .select('id, position')
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .order('position');
  const rows = (data ?? []) as { id: string; position: number }[];
  if (!rows.some((r) => r.id === itemId)) throw new Error('not_found');
  const others = rows.filter((r) => r.id !== itemId);
  const position = positionAt(others.map((r) => r.position), toIndex);
  if (position !== null) {
    const { error } = await supabase.from('track_items').update({ position }).eq('id', itemId).eq('track_id', trackId);
    if (error) throw new Error(error.message);
    return;
  }
  // Neighbours have run out of room between them: give every item a whole-number position.
  const order = moveId(rows.map((r) => r.id), itemId, toIndex);
  for (const [index, id] of order.entries()) {
    const { error } = await supabase.from('track_items').update({ position: index + 1 }).eq('id', id).eq('track_id', trackId);
    if (error) throw new Error(error.message);
  }
}

/** Sets, replaces or (when label and link are both empty) removes a button. */
export async function setCta(
  workspaceId: string,
  trackId: string,
  placement: CtaPlacement,
  itemId: string | null,
  rawLabel: string,
  rawUrl: string,
): Promise<void> {
  const cta = normalizeCta(rawLabel, rawUrl);
  const supabase = await createServerSupabase();
  let existing = supabase.from('track_ctas').delete().eq('workspace_id', workspaceId).eq('track_id', trackId).eq('placement', placement);
  if (placement === 'item') {
    if (!itemId) throw new Error('not_found');
    existing = existing.eq('track_item_id', itemId);
  }
  const removed = await existing;
  if (removed.error) throw new Error(removed.error.message);
  if (!cta) return;
  const { error } = await supabase.from('track_ctas').insert({
    workspace_id: workspaceId,
    track_id: trackId,
    placement,
    track_item_id: placement === 'item' ? itemId : null,
    label: cta.label,
    url: cta.url,
  });
  if (error) throw new Error(error.message);
}
