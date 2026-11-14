import { optimizeTrack, type Optimization, type Visit } from './optimize';
import { createAdminSupabase } from './supabase/admin';
import { createServerSupabase } from './supabase/server';

/** How far back visits are counted, so the order follows current behaviour rather than last year's. */
const WINDOW_DAYS = 180;
/** The most engagement rows read for one track. */
const MAX_ROWS = 10_000;
/** A track is recalculated at most this often when visits trigger it. */
const MIN_INTERVAL_MS = 10 * 60 * 1000;

export type Ordering = 'fixed' | 'optimized';
export type OptimizationState = { ordering: Ordering; pinFirst: boolean; optimization: Optimization | null; optimizedAt: string | null };

/** The track's optimisation settings and latest result. Access rules decide who can read it. */
export async function getOptimizationState(workspaceId: string, trackId: string): Promise<OptimizationState | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('tracks')
    .select('ordering, pin_first, optimization, optimized_at')
    .eq('workspace_id', workspaceId)
    .eq('id', trackId)
    .maybeSingle();
  if (!data) return null;
  return {
    ordering: data.ordering as Ordering,
    pinFirst: Boolean(data.pin_first),
    optimization: (data.optimization as Optimization | null) ?? null,
    optimizedAt: (data.optimized_at as string | null) ?? null,
  };
}

/** Switches a track between fixed and self-optimising. Only editors and admins pass the database's access rules. */
export async function saveOrdering(workspaceId: string, trackId: string, ordering: Ordering, pinFirst: boolean): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('tracks')
    .update({ ordering: ordering === 'optimized' ? 'optimized' : 'fixed', pin_first: pinFirst })
    .eq('workspace_id', workspaceId)
    .eq('id', trackId)
    .select('id');
  if (error) throw new Error('optimize_failed');
  if (!data || data.length === 0) throw new Error('not_allowed');
}

/**
 * Recalculates one track from its visits and stores the result. Uses the service role, because
 * it also runs after a buyer's visit, when nobody is signed in. `force` skips the interval check.
 * Returns the result, or null if the track is missing or was calculated too recently.
 */
export async function recomputeTrack(trackId: string, force: boolean): Promise<Optimization | null> {
  const admin = createAdminSupabase();
  const { data: track } = await admin.from('tracks').select('id, pin_first, optimized_at').eq('id', trackId).maybeSingle();
  if (!track) return null;
  if (!force && track.optimized_at && Date.now() - new Date(track.optimized_at as string).getTime() < MIN_INTERVAL_MS) return null;

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const { data: items } = await admin.from('track_items').select('id').eq('track_id', trackId).order('position');
  const visits: Visit[] = [];
  for (let from = 0; from < MAX_ROWS; from += 1000) {
    const { data, error } = await admin
      .from('item_engagement')
      .select('session_id, track_item_id, threshold_met, first_at')
      .eq('track_id', trackId)
      .gte('first_at', since)
      .order('first_at', { ascending: false })
      .range(from, from + 999);
    if (error || !data) break;
    for (const row of data as { session_id: string; track_item_id: string; threshold_met: boolean; first_at: string }[]) {
      visits.push({ sessionId: row.session_id, itemId: row.track_item_id, engaged: row.threshold_met, firstAt: row.first_at });
    }
    if (data.length < 1000) break;
  }
  const { data: clicks } = await admin.from('events').select('session_id').eq('track_id', trackId).eq('type', 'cta_click').gte('occurred_at', since).limit(5000);

  const result = optimizeTrack({
    itemIds: ((items ?? []) as { id: string }[]).map((item) => item.id),
    visits,
    convertedSessions: [...new Set(((clicks ?? []) as { session_id: string }[]).map((click) => click.session_id))],
    pinFirst: Boolean(track.pin_first),
  });
  await admin.from('tracks').update({ optimization: result, optimized_at: new Date().toISOString() }).eq('id', trackId);
  return result;
}

/** After a visit produces new engagement: refresh that track if it is self-optimising and due. Never throws. */
export async function recomputeForSession(sessionId: string): Promise<void> {
  try {
    const admin = createAdminSupabase();
    const { data: session } = await admin.from('sessions').select('track_id').eq('id', sessionId).maybeSingle();
    if (!session) return;
    const { data: track } = await admin.from('tracks').select('ordering').eq('id', session.track_id).maybeSingle();
    if (track?.ordering !== 'optimized') return;
    await recomputeTrack(session.track_id as string, false);
  } catch {
    // Optimisation is a background improvement and must never disturb a visit.
  }
}
