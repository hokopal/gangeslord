import type { EngagementRow, SessionRow, VisitorRow } from './analytics';
import { createServerSupabase } from './supabase/server';

const PAGE = 1000;
const MAX_PAGES = 10;

type Page<T> = { data: T[] | null; error: { message: string } | null };

/** Reads every row of a query, a page at a time (the API returns at most 1,000 rows per request). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < MAX_PAGES; i += 1) {
    const { data, error } = await page(i * PAGE, (i + 1) * PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

type RawSession = {
  id: string; track_id: string; visitor_id: string; share_link_id: string | null;
  started_at: string; last_seen_at: string; referrer: string | null; country: string | null;
};
type RawEngagement = { session_id: string; track_item_id: string; track_id: string; seconds: number; views: number; threshold_met: boolean };
type RawVisitor = { id: string; name: string | null; email: string | null; account_name: string | null };

const SESSION_COLUMNS = 'id, track_id, visitor_id, share_link_id, started_at, last_seen_at, referrer, country';
const ENGAGEMENT_COLUMNS = 'session_id, track_item_id, track_id, seconds, views, threshold_met';

const toSession = (r: RawSession): SessionRow => ({
  id: r.id, trackId: r.track_id, visitorId: r.visitor_id, shareLinkId: r.share_link_id,
  startedAt: r.started_at, lastSeenAt: r.last_seen_at, referrer: r.referrer, country: r.country,
});
const toEngagement = (r: RawEngagement): EngagementRow => ({
  sessionId: r.session_id, trackItemId: r.track_item_id, trackId: r.track_id,
  seconds: r.seconds, views: r.views, thresholdMet: r.threshold_met,
});
const toVisitor = (r: RawVisitor): VisitorRow => ({ id: r.id, name: r.name, email: r.email, accountName: r.account_name });

export type AnalyticsData = {
  sessions: SessionRow[];
  engagement: EngagementRow[];
  /** One session id per button click. */
  clickSessions: string[];
  visitors: Map<string, VisitorRow>;
};

/** Sessions, engagement, clicks and visitors for a workspace, or for one track of it. */
export async function loadAnalytics(workspaceId: string, trackId?: string): Promise<AnalyticsData> {
  const supabase = await createServerSupabase();
  // Either one track, or the whole workspace.
  const column = trackId ? 'track_id' : 'workspace_id';
  const value = trackId ?? workspaceId;

  const [sessions, engagement, clicks, visitors] = await Promise.all([
    fetchAll<RawSession>((from, to) =>
      supabase.from('sessions').select(SESSION_COLUMNS).eq(column, value).order('started_at', { ascending: false }).range(from, to)),
    fetchAll<RawEngagement>((from, to) =>
      supabase.from('item_engagement').select(ENGAGEMENT_COLUMNS).eq(column, value).order('first_at').range(from, to)),
    fetchAll<{ session_id: string }>((from, to) =>
      supabase.from('events').select('session_id').eq(column, value).eq('type', 'cta_click').order('id').range(from, to)),
    fetchAll<RawVisitor>((from, to) =>
      supabase.from('visitors').select('id, name, email, account_name').eq('workspace_id', workspaceId).order('first_seen_at').range(from, to)),
  ]);
  return {
    sessions: sessions.map(toSession),
    engagement: engagement.map(toEngagement),
    clickSessions: clicks.map((c) => c.session_id),
    visitors: new Map(visitors.map((v) => [v.id, toVisitor(v)])),
  };
}

export type SessionEvent = { type: string; trackItemId: string | null; value: number | null; meta: string | null; occurredAt: string };
export type SessionDetail = {
  session: SessionRow & { utmSource: string | null; utmCampaign: string | null };
  visitor: VisitorRow | undefined;
  engagement: EngagementRow[];
  events: SessionEvent[];
};

export async function loadSession(workspaceId: string, sessionId: string): Promise<SessionDetail | null> {
  const supabase = await createServerSupabase();
  const { data: row } = await supabase
    .from('sessions')
    .select(`${SESSION_COLUMNS}, utm_source, utm_campaign`)
    .eq('workspace_id', workspaceId)
    .eq('id', sessionId)
    .maybeSingle();
  if (!row) return null;
  const raw = row as RawSession & { utm_source: string | null; utm_campaign: string | null };
  const [visitor, engagement, events] = await Promise.all([
    supabase.from('visitors').select('id, name, email, account_name').eq('id', raw.visitor_id).maybeSingle(),
    supabase.from('item_engagement').select(ENGAGEMENT_COLUMNS).eq('session_id', sessionId).order('first_at'),
    supabase.from('events').select('type, track_item_id, value, meta, occurred_at').eq('session_id', sessionId).order('id').limit(500),
  ]);
  return {
    session: { ...toSession(raw), utmSource: raw.utm_source, utmCampaign: raw.utm_campaign },
    visitor: visitor.data ? toVisitor(visitor.data as RawVisitor) : undefined,
    engagement: ((engagement.data ?? []) as RawEngagement[]).map(toEngagement),
    events: ((events.data ?? []) as { type: string; track_item_id: string | null; value: number | null; meta: string | null; occurred_at: string }[]).map(
      (e) => ({ type: e.type, trackItemId: e.track_item_id, value: e.value, meta: e.meta, occurredAt: e.occurred_at }),
    ),
  };
}
