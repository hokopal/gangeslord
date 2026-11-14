import { sendGa4 } from './ga4';
import type { Ga4Event } from './ga4-core';
import { connectionsFor, notify } from './integrations';
import type { AlertEvent } from './integrations-core';
import { createAdminSupabase } from './supabase/admin';

const GA4_EVENT: Partial<Record<AlertEvent, Ga4Event>> = { link_opened: 'room_visit', cta_click: 'button_click', comment: 'comment' };

/**
 * Forwards a room event to Google Analytics, once per visit and kind, when the workspace has
 * connected it. Only an anonymous visitor id and the room's name are sent.
 */
async function analyticsFor(session: { id: string; workspace_id: string; track_id: string; visitor_id: string; share_link_id: string | null }, event: AlertEvent, button?: string): Promise<void> {
  const name = GA4_EVENT[event];
  if (!name) return;
  const admin = createAdminSupabase();
  const claim = await admin.from('session_alerts').insert({ session_id: session.id, kind: `ga4:${name}` });
  if (claim.error) return;
  const [workspace, track, visitor] = await Promise.all([
    admin.from('workspaces').select('name').eq('id', session.workspace_id).maybeSingle(),
    admin.from('tracks').select('name').eq('id', session.track_id).maybeSingle(),
    admin.from('visitors').select('cookie_id').eq('id', session.visitor_id).maybeSingle(),
  ]);
  if (!workspace.data || !track.data || !visitor.data) return;
  await sendGa4(session.workspace_id, name, {
    visitorId: visitor.data.cookie_id as string, room: track.data.name as string, workspace: workspace.data.name as string,
    personalLink: Boolean(session.share_link_id), button,
  });
}

/**
 * Sends an alert for a session if one is due: a connection wants it, the conditions hold,
 * and it has not been sent for this session before. Runs after the response to the visitor,
 * and never throws.
 */
export async function alertFor(sessionId: string, event: AlertEvent, origin: string, extra: { button?: string } = {}): Promise<void> {
  try {
    const admin = createAdminSupabase();
    const { data: session } = await admin
      .from('sessions')
      .select('id, workspace_id, track_id, visitor_id, share_link_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (!session) return;
    await analyticsFor(session as { id: string; workspace_id: string; track_id: string; visitor_id: string; share_link_id: string | null }, event, extra.button).catch(() => undefined);
    if (event === 'link_opened' && !session.share_link_id) return;

    const kinds = await connectionsFor(session.workspace_id as string, event);
    if (kinds.length === 0) return;

    if (event === 'binge') {
      const { count } = await admin
        .from('item_engagement')
        .select('track_item_id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('threshold_met', true);
      if ((count ?? 0) < 2) return;
    }

    // Claim the alert. The primary key makes a second claim fail, so it is sent at most once per visit.
    const claim = await admin.from('session_alerts').insert({ session_id: sessionId, kind: event });
    if (claim.error) return;

    const [workspace, track, visitor] = await Promise.all([
      admin.from('workspaces').select('name, slug').eq('id', session.workspace_id).maybeSingle(),
      admin.from('tracks').select('name').eq('id', session.track_id).maybeSingle(),
      admin.from('visitors').select('name, email, account_name').eq('id', session.visitor_id).maybeSingle(),
    ]);
    if (!workspace.data || !track.data) return;

    await notify(session.workspace_id as string, kinds, event, {
      workspaceName: workspace.data.name as string,
      trackName: track.data.name as string,
      visitor: ((visitor.data?.name as string | null) || (visitor.data?.email as string | null)) ?? null,
      account: (visitor.data?.account_name as string | null) ?? null,
      sessionUrl: `${origin}/w/${workspace.data.slug}/analytics/${session.track_id}/sessions/${sessionId}`,
      button: extra.button?.slice(0, 120),
    });
  } catch {
    // Alerts are best-effort.
  }
}
