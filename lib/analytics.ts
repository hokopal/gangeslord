export type SessionRow = {
  id: string;
  trackId: string;
  visitorId: string;
  shareLinkId: string | null;
  startedAt: string;
  lastSeenAt: string;
  referrer: string | null;
  country: string | null;
};

export type EngagementRow = {
  sessionId: string;
  trackItemId: string;
  trackId: string;
  seconds: number;
  views: number;
  thresholdMet: boolean;
};

export type VisitorRow = { id: string; name: string | null; email: string | null; accountName: string | null };

export type SessionTotals = { seconds: number; items: number; met: number; binge: boolean };

/** A session counts as a binge when the visitor met the engagement threshold on two or more items. */
export const BINGE_ITEMS = 2;

/** Active seconds, items opened and thresholds met for each session. */
export function sessionTotals(engagement: readonly EngagementRow[]): Map<string, SessionTotals> {
  const totals = new Map<string, SessionTotals>();
  for (const row of engagement) {
    const t = totals.get(row.sessionId) ?? { seconds: 0, items: 0, met: 0, binge: false };
    t.seconds += row.seconds;
    t.items += 1;
    if (row.thresholdMet) t.met += 1;
    t.binge = t.met >= BINGE_ITEMS;
    totals.set(row.sessionId, t);
  }
  return totals;
}

export type Summary = {
  sessions: number;
  visitors: number;
  avgSeconds: number;
  itemsPerSession: number;
  bingeSessions: number;
  ctaClicks: number;
  /** Share of sessions with at least one button click, 0 to 1. */
  ctaRate: number;
};

export function summarize(
  sessions: readonly SessionRow[],
  engagement: readonly EngagementRow[],
  ctaClickSessions: readonly string[],
): Summary {
  const totals = sessionTotals(engagement);
  const count = sessions.length;
  let seconds = 0;
  let items = 0;
  let binge = 0;
  for (const s of sessions) {
    const t = totals.get(s.id);
    if (!t) continue;
    seconds += t.seconds;
    items += t.items;
    if (t.binge) binge += 1;
  }
  const ids = new Set(sessions.map((s) => s.id));
  const clicks = ctaClickSessions.filter((id) => ids.has(id));
  return {
    sessions: count,
    visitors: new Set(sessions.map((s) => s.visitorId)).size,
    avgSeconds: count ? Math.round(seconds / count) : 0,
    itemsPerSession: count ? Math.round((items / count) * 10) / 10 : 0,
    bingeSessions: binge,
    ctaClicks: clicks.length,
    ctaRate: count ? new Set(clicks).size / count : 0,
  };
}

export type ItemStat = {
  id: string;
  title: string;
  /** Sessions that opened this item. */
  viewers: number;
  /** Share of all sessions that reached this item, 0 to 1. */
  reach: number;
  avgSeconds: number;
  /** Share of this item's viewers who met its engagement threshold, 0 to 1. */
  thresholdRate: number;
};

/** Per-item figures in track order: the completion funnel. */
export function itemStats(
  items: readonly { id: string; title: string }[],
  sessionCount: number,
  engagement: readonly EngagementRow[],
): ItemStat[] {
  return items.map((item) => {
    const rows = engagement.filter((e) => e.trackItemId === item.id);
    const viewers = rows.length;
    const seconds = rows.reduce((sum, r) => sum + r.seconds, 0);
    const met = rows.filter((r) => r.thresholdMet).length;
    return {
      id: item.id,
      title: item.title,
      viewers,
      reach: sessionCount ? viewers / sessionCount : 0,
      avgSeconds: viewers ? Math.round(seconds / viewers) : 0,
      thresholdRate: viewers ? met / viewers : 0,
    };
  });
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

export const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;

/** How a visitor is shown in the builder: their name and company when known. */
export function visitorLabel(visitor: VisitorRow | undefined): string {
  if (!visitor) return 'Unknown visitor';
  const who = visitor.name || visitor.email;
  if (!who) return `Anonymous visitor ${visitor.id.slice(0, 4)}`;
  return visitor.accountName ? `${who} (${visitor.accountName})` : who;
}
