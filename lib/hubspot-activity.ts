import { activityNoteHtml } from './activity-note';
import { decryptKey } from './ai/crypto';
import { createContactNote, updateNote } from './hubspot';
import { createAdminSupabase, serverSecret } from './supabase/admin';

// Uses the service role throughout. The settings functions must only be called for admins;
// syncHubspotActivity is called for genuine room activity and decides for itself whether to act.

const ACTIVITY = 'activity';

export type HubspotActivity = { enabled: boolean; lastStatus: string | null; lastSentAt: string | null };

export async function getHubspotActivity(workspaceId: string): Promise<HubspotActivity> {
  const { data } = await createAdminSupabase()
    .from('workspace_integrations')
    .select('events, last_status, last_sent_at')
    .eq('workspace_id', workspaceId)
    .eq('kind', 'hubspot')
    .maybeSingle();
  return {
    enabled: Array.isArray(data?.events) && (data.events as string[]).includes(ACTIVITY),
    lastStatus: (data?.last_status as string | null) ?? null,
    lastSentAt: (data?.last_sent_at as string | null) ?? null,
  };
}

/** Turns timeline logging on or off. Throws hubspot_not_connected. */
export async function setHubspotActivity(workspaceId: string, enabled: boolean): Promise<void> {
  const { data, error } = await createAdminSupabase()
    .from('workspace_integrations')
    .update({ events: enabled ? [ACTIVITY] : [] })
    .eq('workspace_id', workspaceId)
    .eq('kind', 'hubspot')
    .select('kind');
  if (error) throw new Error('integration_failed');
  if (!data || data.length === 0) throw new Error('hubspot_not_connected');
}

/**
 * Records a visit on the HubSpot contact's timeline: one note per visit, created when the
 * contact first arrives and rewritten as they open items, engage and click buttons.
 * Only visits made through an imported contact's personal link are logged. Never throws.
 */
export async function syncHubspotActivity(sessionId: string, origin: string): Promise<void> {
  try {
    const admin = createAdminSupabase();
    const { data: session } = await admin
      .from('sessions')
      .select('id, workspace_id, track_id, share_link_id, started_at, hubspot_note_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (!session?.share_link_id) return;

    const { data: link } = await admin.from('share_links').select('recipient_name, contact_id').eq('id', session.share_link_id).maybeSingle();
    if (!link?.contact_id) return;
    const { data: contact } = await admin.from('contacts').select('external_id').eq('id', link.contact_id).maybeSingle();
    if (!contact) return;

    const workspaceId = session.workspace_id as string;
    const { data: integration } = await admin
      .from('workspace_integrations')
      .select('secret_ciphertext, events')
      .eq('workspace_id', workspaceId)
      .eq('kind', 'hubspot')
      .maybeSingle();
    if (!integration || !(integration.events as string[]).includes(ACTIVITY)) return;

    let noteId = session.hubspot_note_id as string | null;
    if (!noteId) {
      // Claim the note for this visit; a second request arriving at the same moment backs off.
      const claim = await admin.from('session_alerts').insert({ session_id: sessionId, kind: 'hubspot_note' });
      if (claim.error) return;
    }

    const [workspace, track, items, engagement, clicks] = await Promise.all([
      admin.from('workspaces').select('slug').eq('id', workspaceId).maybeSingle(),
      admin.from('tracks').select('name').eq('id', session.track_id).maybeSingle(),
      admin.from('track_items').select('id, title_override, assets(title)').eq('track_id', session.track_id),
      admin.from('item_engagement').select('track_item_id, seconds, threshold_met').eq('session_id', sessionId).order('first_at'),
      admin.from('events').select('meta').eq('session_id', sessionId).eq('type', 'cta_click').order('id').limit(50),
    ]);
    if (!workspace.data || !track.data) return;
    const titles = new Map(
      ((items.data ?? []) as unknown as { id: string; title_override: string; assets: { title: string } | { title: string }[] | null }[]).map((i) => {
        const asset = Array.isArray(i.assets) ? i.assets[0] : i.assets;
        return [i.id, i.title_override || asset?.title || 'Untitled'];
      }),
    );
    const html = activityNoteHtml({
      trackName: track.data.name as string,
      visitor: link.recipient_name as string,
      startedAt: session.started_at as string,
      items: ((engagement.data ?? []) as { track_item_id: string; seconds: number; threshold_met: boolean }[]).map((e) => ({
        title: titles.get(e.track_item_id) ?? 'Removed item',
        seconds: e.seconds,
        engaged: e.threshold_met,
      })),
      totalItems: titles.size,
      buttons: ((clicks.data ?? []) as { meta: string | null }[]).map((c) => c.meta ?? ''),
      sessionUrl: `${origin}/w/${workspace.data.slug}/analytics/${session.track_id}/sessions/${sessionId}`,
    });

    const token = decryptKey(integration.secret_ciphertext as string, serverSecret());
    let status = 'Activity logged';
    try {
      if (noteId) {
        await updateNote(token, noteId, html);
      } else {
        noteId = await createContactNote(token, contact.external_id as string, html, session.started_at as string);
        await admin.from('sessions').update({ hubspot_note_id: noteId }).eq('id', sessionId);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : 'hubspot_failed';
      status = `Activity failed: ${code}`;
      // Let a later signal try again to create the note.
      if (!noteId) await admin.from('session_alerts').delete().eq('session_id', sessionId).eq('kind', 'hubspot_note');
    }
    await admin
      .from('workspace_integrations')
      .update({ last_status: status, last_sent_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('kind', 'hubspot');
  } catch {
    // Logging to HubSpot is best-effort and must never disturb the visit.
  }
}
