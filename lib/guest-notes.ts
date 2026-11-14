import { createServerSupabase } from './supabase/server';

// Runs as the signed-in member. The database decides who may see guest content:
// the room's creator, and whoever they have shared the room with.

export type GuestNote = {
  id: string; itemId: string | null; visitorId: string; kind: 'note' | 'comment' | 'question' | 'pen' | 'marker'; body: string; page: number | null; replyBody: string | null;
  authorName: string | null; authorEmail: string | null; createdAt: string; resolvedAt: string | null;
};
export type SharedWith = { userId: string; email: string; isOwner: boolean };

export async function guestAccess(trackId: string): Promise<{ sees: boolean; manages: boolean }> {
  const supabase = await createServerSupabase();
  const [sees, manages] = await Promise.all([supabase.rpc('sees_guest_content', { p_track: trackId }), supabase.rpc('manages_track_sharing', { p_track: trackId })]);
  return { sees: Boolean(sees.data), manages: Boolean(manages.data) };
}

export async function listGuestNotes(trackId: string): Promise<GuestNote[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('guest_notes')
    .select('id, track_item_id, visitor_id, kind, body, page, reply_body, author_name, author_email, created_at, resolved_at')
    .eq('track_id', trackId)
    .order('created_at', { ascending: false })
    .limit(500);
  return ((data ?? []) as { id: string; track_item_id: string | null; visitor_id: string; kind: GuestNote['kind']; body: string; page: number | null; reply_body: string | null; author_name: string | null; author_email: string | null; created_at: string; resolved_at: string | null }[]).map((n) => ({
    id: n.id, itemId: n.track_item_id, visitorId: n.visitor_id, kind: n.kind, body: n.body, page: n.page, replyBody: n.reply_body, authorName: n.author_name, authorEmail: n.author_email, createdAt: n.created_at, resolvedAt: n.resolved_at,
  }));
}

export type GuestMark = { id: string; kind: 'pen' | 'marker' | 'note'; page: number; mark: { p?: number[]; x?: number; y?: number }; body: string };

/** Everything one guest drew or pinned on one item's pages. Only the room's owner and people it is shared with get any rows. */
export async function listGuestMarks(trackId: string, itemId: string, visitorId: string): Promise<GuestMark[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('guest_notes')
    .select('id, kind, page, mark, body')
    .eq('track_id', trackId)
    .eq('track_item_id', itemId)
    .eq('visitor_id', visitorId)
    .not('page', 'is', null)
    .not('mark', 'is', null)
    .order('created_at')
    .limit(600);
  return (data ?? []) as GuestMark[];
}

export async function listSharing(trackId: string): Promise<SharedWith[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc('track_sharing', { p_track: trackId });
  return ((data ?? []) as { user_id: string; email: string; is_owner: boolean }[]).map((row) => ({ userId: row.user_id, email: row.email, isOwner: row.is_owner }));
}

async function call(fn: string, args: Record<string, unknown>): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc(fn, args);
  if (error) throw new Error('not_allowed');
}

export const resolveGuestNote = (noteId: string, resolved: boolean) => call('resolve_guest_note', { p_note: noteId, p_resolved: resolved });
export const replyGuestNote = (noteId: string, body: string) => call('reply_guest_note', { p_note: noteId, p_body: body });
export const shareTrack = (trackId: string, userId: string) => call('share_track', { p_track: trackId, p_user: userId });
export const unshareTrack = (trackId: string, userId: string) => call('unshare_track', { p_track: trackId, p_user: userId });
