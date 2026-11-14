import { itemStats, sessionTotals, summarize, visitorLabel, type EngagementRow, type SessionRow, type VisitorRow } from '../analytics';
import { normalizeRecipient } from '../share-links';
import { createAdminSupabase } from '../supabase/admin';

// The data behind the REST API and the MCP server. These use the service role, so every
// query here is filtered by the workspace id that the caller's API key belongs to.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const notFound = (what: string) => new ApiError(404, 'not_found', `${what} not found.`);

export async function apiListTracks(workspaceId: string) {
  const { data } = await createAdminSupabase()
    .from('tracks')
    .select('id, name, slug, status, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []).map((t) => ({ id: t.id, name: t.name, slug: t.slug, status: t.status, created_at: t.created_at }));
}

export async function apiListLibrary(workspaceId: string, query?: string) {
  let request = createAdminSupabase()
    .from('assets')
    .select('id, title, type, status, source_url, description, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(200);
  const q = (query ?? '').replace(/[%_,()]/g, ' ').trim();
  if (q) request = request.ilike('title', `%${q}%`);
  const { data } = await request;
  return data ?? [];
}

async function requireTrack(workspaceId: string, trackId: string) {
  if (!UUID.test(trackId)) throw notFound('Track');
  const { data } = await createAdminSupabase().from('tracks').select('id, name, slug, status').eq('workspace_id', workspaceId).eq('id', trackId).maybeSingle();
  if (!data) throw notFound('Track');
  return data as { id: string; name: string; slug: string; status: string };
}

type RawSession = { id: string; track_id: string; visitor_id: string; share_link_id: string | null; started_at: string; last_seen_at: string; referrer: string | null; country: string | null };
type RawEngagement = { session_id: string; track_item_id: string; track_id: string; seconds: number; views: number; threshold_met: boolean };

const toSession = (r: RawSession): SessionRow => ({
  id: r.id, trackId: r.track_id, visitorId: r.visitor_id, shareLinkId: r.share_link_id, startedAt: r.started_at, lastSeenAt: r.last_seen_at, referrer: r.referrer, country: r.country,
});
const toEngagement = (r: RawEngagement): EngagementRow => ({
  sessionId: r.session_id, trackItemId: r.track_item_id, trackId: r.track_id, seconds: r.seconds, views: r.views, thresholdMet: r.threshold_met,
});

export async function apiTrackAnalytics(workspaceId: string, trackId: string) {
  const track = await requireTrack(workspaceId, trackId);
  const admin = createAdminSupabase();
  const [sessions, engagement, clicks, items] = await Promise.all([
    admin.from('sessions').select('id, track_id, visitor_id, share_link_id, started_at, last_seen_at, referrer, country').eq('workspace_id', workspaceId).eq('track_id', track.id).order('started_at', { ascending: false }).limit(1000),
    admin.from('item_engagement').select('session_id, track_item_id, track_id, seconds, views, threshold_met').eq('workspace_id', workspaceId).eq('track_id', track.id).limit(1000),
    admin.from('events').select('session_id').eq('workspace_id', workspaceId).eq('track_id', track.id).eq('type', 'cta_click').limit(1000),
    admin.from('track_items').select('id, title_override, position, assets(title)').eq('workspace_id', workspaceId).eq('track_id', track.id).order('position'),
  ]);
  const sessionRows = ((sessions.data ?? []) as RawSession[]).map(toSession);
  const engagementRows = ((engagement.data ?? []) as RawEngagement[]).map(toEngagement);
  const itemList = ((items.data ?? []) as unknown as { id: string; title_override: string; assets: { title: string } | { title: string }[] | null }[]).map((i) => {
    const asset = Array.isArray(i.assets) ? i.assets[0] : i.assets;
    return { id: i.id, title: i.title_override || asset?.title || 'Untitled' };
  });
  const summary = summarize(sessionRows, engagementRows, ((clicks.data ?? []) as { session_id: string }[]).map((c) => c.session_id));
  return {
    track: { id: track.id, name: track.name, status: track.status },
    summary: {
      sessions: summary.sessions, unique_visitors: summary.visitors, average_active_seconds: summary.avgSeconds,
      items_per_session: summary.itemsPerSession, binge_sessions: summary.bingeSessions, button_clicks: summary.ctaClicks,
    },
    items: itemStats(itemList, sessionRows.length, engagementRows).map((i) => ({
      id: i.id, title: i.title, viewers: i.viewers, reach: Number(i.reach.toFixed(3)),
      average_active_seconds: i.avgSeconds, threshold_rate: Number(i.thresholdRate.toFixed(3)),
    })),
  };
}

export async function apiRecentSessions(workspaceId: string, options: { trackId?: string; limit?: number }) {
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 25) || 25, 1), 100);
  const admin = createAdminSupabase();
  let request = admin
    .from('sessions')
    .select('id, track_id, visitor_id, share_link_id, started_at, last_seen_at, referrer, country')
    .eq('workspace_id', workspaceId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (options.trackId) request = request.eq('track_id', (await requireTrack(workspaceId, options.trackId)).id);
  const { data } = await request;
  const sessions = ((data ?? []) as RawSession[]).map(toSession);
  if (sessions.length === 0) return [];
  const [engagement, visitors, tracks] = await Promise.all([
    admin.from('item_engagement').select('session_id, track_item_id, track_id, seconds, views, threshold_met').eq('workspace_id', workspaceId).in('session_id', sessions.map((s) => s.id)),
    admin.from('visitors').select('id, name, email, account_name').eq('workspace_id', workspaceId).in('id', [...new Set(sessions.map((s) => s.visitorId))]),
    admin.from('tracks').select('id, name').eq('workspace_id', workspaceId),
  ]);
  const totals = sessionTotals(((engagement.data ?? []) as RawEngagement[]).map(toEngagement));
  const people = new Map(((visitors.data ?? []) as { id: string; name: string | null; email: string | null; account_name: string | null }[]).map((v) => [v.id, { id: v.id, name: v.name, email: v.email, accountName: v.account_name } as VisitorRow]));
  const trackNames = new Map(((tracks.data ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]));
  return sessions.map((s) => {
    const person = people.get(s.visitorId);
    const t = totals.get(s.id);
    return {
      id: s.id, track_id: s.trackId, track: trackNames.get(s.trackId) ?? null, visitor: visitorLabel(person), email: person?.email ?? null,
      started_at: s.startedAt, country: s.country, active_seconds: t?.seconds ?? 0, items_opened: t?.items ?? 0, binge: t?.binge ?? false,
    };
  });
}

export async function apiCreateLink(workspaceId: string, workspaceSlug: string, trackId: string, input: { name?: unknown; email?: unknown; company?: unknown }, origin: string) {
  const track = await requireTrack(workspaceId, trackId);
  let values: ReturnType<typeof normalizeRecipient>;
  try {
    values = normalizeRecipient({ name: String(input.name ?? ''), email: String(input.email ?? ''), account: String(input.company ?? '') });
  } catch (error) {
    throw new ApiError(400, 'invalid_request', error instanceof Error && error.message === 'email_invalid' ? 'email is not a valid email address.' : 'name is required.');
  }
  const { data, error } = await createAdminSupabase()
    .from('share_links')
    .insert({ workspace_id: workspaceId, track_id: track.id, ...values })
    .select('id, token')
    .single();
  if (error || !data) throw new ApiError(500, 'server_error', 'The link could not be created.');
  return {
    id: data.id as string, track_id: track.id, recipient_name: values.recipient_name, recipient_email: values.recipient_email, company: values.account_name,
    url: `${origin}/r/${workspaceSlug}/${track.slug}?r=${data.token}`, published: track.status === 'published',
  };
}
