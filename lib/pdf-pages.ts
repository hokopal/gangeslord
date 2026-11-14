import { createServerSupabase } from './supabase/server';

export type PageStat = { page: number; viewers: number; seconds: number };
export type ItemPages = { itemId: string; viewers: number; pages: PageStat[] };

/** Rolls raw page views up per item and page. Pure, so it can be tested without a database. */
export function summarizePages(rows: readonly { track_item_id: string; session_id: string; page: number; seconds: number }[]): ItemPages[] {
  const items = new Map<string, { sessions: Set<string>; pages: Map<number, { sessions: Set<string>; seconds: number }> }>();
  for (const row of rows) {
    const item = items.get(row.track_item_id) ?? { sessions: new Set<string>(), pages: new Map() };
    items.set(row.track_item_id, item);
    item.sessions.add(row.session_id);
    const page = item.pages.get(row.page) ?? { sessions: new Set<string>(), seconds: 0 };
    item.pages.set(row.page, page);
    page.sessions.add(row.session_id);
    page.seconds += row.seconds;
  }
  return [...items].map(([itemId, item]) => ({
    itemId,
    viewers: item.sessions.size,
    pages: [...item.pages].map(([page, stat]) => ({ page, viewers: stat.sessions.size, seconds: stat.seconds })).sort((a, b) => a.page - b.page),
  }));
}

export type VideoStat = { itemId: string; viewers: number; averagePercent: number; finished: number };

/** Rolls video views up per item: who watched, how much on average, and how many watched nearly all of it. */
export function summarizeVideos(rows: readonly { track_item_id: string; percent: number }[]): VideoStat[] {
  const items = new Map<string, number[]>();
  for (const row of rows) items.set(row.track_item_id, [...(items.get(row.track_item_id) ?? []), row.percent]);
  return [...items].map(([itemId, percents]) => ({
    itemId,
    viewers: percents.length,
    averagePercent: Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length),
    finished: percents.filter((value) => value >= 90).length,
  }));
}

/** How much of each video in a track buyers watched. Access rules limit it to the workspace's members. */
export async function listVideoStats(workspaceId: string, trackId: string): Promise<VideoStat[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from('video_views').select('track_item_id, percent').eq('workspace_id', workspaceId).eq('track_id', trackId).limit(20000);
  return summarizeVideos((data ?? []) as { track_item_id: string; percent: number }[]);
}

/** Page-by-page reading for every PDF in a track. Access rules limit it to the workspace's members. */
export async function listPageStats(workspaceId: string, trackId: string): Promise<ItemPages[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('pdf_page_views')
    .select('track_item_id, session_id, page, seconds')
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .limit(20000);
  return summarizePages((data ?? []) as { track_item_id: string; session_id: string; page: number; seconds: number }[]);
}
