import { toRoom, type RawRoom, type Room } from './room';
import { createAdminSupabase } from './supabase/admin';
import { createServerSupabase } from './supabase/server';

const BUCKET = 'assets';
// A file link is made for one request and expires almost at once, so access can be withdrawn immediately.
const LINK_SECONDS = 60;

/**
 * Loads a room for whoever is asking. The database function returns it only when the
 * track is published and its workspace is active, or when the caller is a member previewing a draft.
 * It never says where files are stored: PDFs are addressed through this app (/r/file/…).
 */
export async function loadRoom(workspaceSlug: string, trackSlug: string): Promise<Room | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('public_room', { p_workspace: workspaceSlug, p_track: trackSlug });
  if (error || !data) return null;
  return toRoom(data as RawRoom);
}

/**
 * Where a room item's file is stored, if this visitor may have it right now. The database checks,
 * as the visitor, that the room is published, its workspace is not suspended, and any on-arrival
 * form is filled in.
 */
async function roomItemPath(itemId: string, visitor: string, mode: 'file' | 'snapshot'): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data: path } = await supabase.rpc('room_item_path', { p_item: itemId, p_visitor: visitor, p_mode: mode });
  return (path as string | null) ?? null;
}

// Visitors have no access to storage at all. Once the check above has passed, the server reads the
// file on their behalf.

/** Snapshot HTML for a room item, under the same rules as the room. */
export async function readRoomSnapshot(itemId: string, visitor: string): Promise<string | null> {
  const path = await roomItemPath(itemId, visitor, 'snapshot');
  if (!path) return null;
  const { data, error } = await createAdminSupabase().storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return data.text();
}

/** A one-minute link to a room item's PDF, under the same rules as the room. */
export async function roomFileLink(itemId: string, visitor: string): Promise<string | null> {
  const path = await roomItemPath(itemId, visitor, 'file');
  if (!path) return null;
  const { data } = await createAdminSupabase().storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS);
  return data?.signedUrl ?? null;
}
