import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Stat, formatWhen } from '@/components/ui/Stat';
import { formatDuration, visitorLabel } from '@/lib/analytics';
import { loadSession } from '@/lib/analytics-server';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';

const EVENT_LABEL: Record<string, string> = {
  session_start: 'Opened the room',
  item_view: 'Opened an item',
  threshold_met: 'Met the engagement threshold',
  cta_click: 'Clicked a button',
};

export default async function SessionPage({
  params,
}: {
  params: Promise<{ workspace: string; track: string; session: string }>;
}) {
  const { workspace: slug, track: trackId, session: sessionId } = await params;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace } = context;
  const valid = /^[0-9a-f-]{36}$/;
  if (!valid.test(trackId) || !valid.test(sessionId)) notFound();
  const [detail, track] = await Promise.all([loadSession(workspace.id, sessionId), getTrackDetail(workspace.id, trackId)]);
  if (!detail || !track || detail.session.trackId !== track.track.id) notFound();

  const title = new Map(track.items.map((i) => [i.id, i.titleOverride || i.asset.title]));
  const seconds = detail.engagement.reduce((sum, e) => sum + e.seconds, 0);
  const met = detail.engagement.filter((e) => e.thresholdMet).length;
  const { session } = detail;

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/analytics/${track.track.id}`} className="back">
        <ArrowLeft aria-hidden="true" /> {track.track.name}
      </Link>
      <h1 className="page-title">{visitorLabel(detail.visitor)}</h1>
      <p className="page-subtitle">
        Visit started {formatWhen(session.startedAt)}
        {detail.visitor?.email && detail.visitor.name ? ` · ${detail.visitor.email}` : ''}
      </p>

      <div className="stats">
        <Stat label="Active time" value={formatDuration(seconds)} />
        <Stat label="Items opened" value={detail.engagement.length} note={`of ${track.items.length}`} />
        <Stat label="Thresholds met" value={met} />
        <Stat label="Country" value={session.country ?? 'Unknown'} />
      </div>
      <dl className="meta-list" style={{ marginTop: 12 }}>
        {session.referrer ? (
          <>
            <dt>Came from</dt>
            <dd>{session.referrer}</dd>
          </>
        ) : null}
        {session.utmSource || session.utmCampaign ? (
          <>
            <dt>Campaign</dt>
            <dd>{[session.utmSource, session.utmCampaign].filter(Boolean).join(' / ')}</dd>
          </>
        ) : null}
      </dl>

      <h2 className="section-title">Time per item</h2>
      {detail.engagement.length === 0 ? (
        <p className="hint">The visitor opened the room but no time was recorded.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Active time</th>
                <th className="num">Times opened</th>
                <th>Engagement threshold</th>
              </tr>
            </thead>
            <tbody>
              {detail.engagement.map((e) => (
                <tr key={e.trackItemId}>
                  <td>{title.get(e.trackItemId) ?? 'Removed item'}</td>
                  <td className="num">{formatDuration(e.seconds)}</td>
                  <td className="num">{e.views}</td>
                  <td>
                    <span className={e.thresholdMet ? 'badge' : 'badge badge-warn'}>{e.thresholdMet ? 'Met' : 'Not met'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section-title">Timeline</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>What happened</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {detail.events.map((event, index) => (
              <tr key={index}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatWhen(event.occurredAt)}</td>
                <td>{EVENT_LABEL[event.type] ?? event.type}</td>
                <td>
                  {event.type === 'cta_click'
                    ? event.meta
                    : event.trackItemId
                      ? (title.get(event.trackItemId) ?? 'Removed item')
                      : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
