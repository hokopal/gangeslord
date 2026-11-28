import type { VisitSummary } from './activity-note';
import { decryptKey } from './ai/crypto';
import { syncOsVisit, type OsConfig } from './os';
import { createAdminSupabase, serverSecret } from './supabase/admin';

// Uses the service role to read genuine room activity. Sync is best-effort and never blocks a visit.

type OsMilestone = 'form_submitted' | 'comment' | 'accepted';
const MILESTONE_LABEL: Record<OsMilestone, string> = { form_submitted: 'Form submitted', comment: 'Comment or question left', accepted: 'Proposal accepted' };

/** Keeps one OS note per identified visit, rewritten as items, engagement and button clicks arrive. */
export async function syncOsActivity(sessionId: string, origin: string, milestone?: OsMilestone): Promise<void> {
  const admin = createAdminSupabase();
  let workspaceId: string | null = null;
  try {
    const { data: session } = await admin
      .from('sessions')
      .select('id, workspace_id, track_id, visitor_id, share_link_id, started_at')
      .eq('id', sessionId)
      .maybeSingle();
    if (!session) return;
    workspaceId = session.workspace_id as string;

    const { data: integration } = await admin
      .from('workspace_integrations')
      .select('secret_ciphertext')
      .eq('workspace_id', workspaceId)
      .eq('kind', 'pipemouse_os')
      .maybeSingle();
    if (!integration) return;

    const { data: visitor } = await admin.from('visitors').select('name, email, account_name').eq('id', session.visitor_id).maybeSingle();
    let link: { recipient_name: string; recipient_email: string | null; account_name: string | null } | null = null;
    if (session.share_link_id) {
      const { data } = await admin.from('share_links').select('recipient_name, recipient_email, account_name').eq('id', session.share_link_id).maybeSingle();
      link = data;
    }
    const email = (visitor?.email as string | null) ?? link?.recipient_email ?? null;
    if (!email) return;
    if (milestone) await admin.from('session_alerts').insert({ session_id: sessionId, kind: `os:${milestone}` });

    const [workspace, track, items, engagement, clicks, milestones] = await Promise.all([
      admin.from('workspaces').select('slug').eq('id', workspaceId).maybeSingle(),
      admin.from('tracks').select('name').eq('id', session.track_id).maybeSingle(),
      admin.from('track_items').select('id, title_override, assets(title)').eq('track_id', session.track_id),
      admin.from('item_engagement').select('track_item_id, seconds, threshold_met').eq('session_id', sessionId).order('first_at'),
      admin.from('events').select('meta').eq('session_id', sessionId).eq('type', 'cta_click').order('id').limit(50),
      admin.from('session_alerts').select('kind').eq('session_id', sessionId).in('kind', ['os:form_submitted', 'os:comment', 'os:accepted']),
    ]);
    if (!workspace.data || !track.data) return;

    const titles = new Map(
      ((items.data ?? []) as unknown as { id: string; title_override: string; assets: { title: string } | { title: string }[] | null }[]).map((item) => {
        const asset = Array.isArray(item.assets) ? item.assets[0] : item.assets;
        return [item.id, item.title_override || asset?.title || 'Untitled'];
      }),
    );
    const visitorName = ((visitor?.name as string | null) || link?.recipient_name || email) as string;
    const visit: VisitSummary = {
      trackName: track.data.name as string,
      visitor: visitorName,
      startedAt: session.started_at as string,
      items: ((engagement.data ?? []) as { track_item_id: string; seconds: number; threshold_met: boolean }[]).map((item) => ({
        title: titles.get(item.track_item_id) ?? 'Removed item',
        seconds: item.seconds,
        engaged: item.threshold_met,
      })),
      totalItems: titles.size,
      buttons: ((clicks.data ?? []) as { meta: string | null }[]).map((click) => click.meta ?? ''),
      milestones: ((milestones.data ?? []) as { kind: string }[]).map((row) => MILESTONE_LABEL[row.kind.slice(3) as OsMilestone]).filter(Boolean),
      sessionUrl: `${origin}/w/${workspace.data.slug}/analytics/${session.track_id}/sessions/${sessionId}`,
    };
    const config = JSON.parse(decryptKey(integration.secret_ciphertext as string, serverSecret())) as OsConfig;
    await syncOsVisit(config, {
      email,
      name: visitorName,
      company: ((visitor?.account_name as string | null) || link?.account_name || '') as string,
    }, visit, sessionId);
    await admin.from('workspace_integrations').update({ last_status: 'Activity synced', last_sent_at: new Date().toISOString() }).eq('workspace_id', workspaceId).eq('kind', 'pipemouse_os');
  } catch (error) {
    if (workspaceId) {
      const detail = error instanceof Error ? error.message : 'Could not reach Pipemouse OS';
      try {
        await admin
          .from('workspace_integrations')
          .update({ last_status: `Activity failed: ${detail}`.slice(0, 300), last_sent_at: new Date().toISOString() })
          .eq('workspace_id', workspaceId)
          .eq('kind', 'pipemouse_os');
      } catch {
        // The original sync failure is already contained; status recording is best-effort too.
      }
    }
  }
}
