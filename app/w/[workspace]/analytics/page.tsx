import { BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/shell/EmptyState';
import { Stat, formatWhen } from '@/components/ui/Stat';
import { formatDuration, formatPercent, sessionTotals, summarize, visitorLabel } from '@/lib/analytics';
import { loadAnalytics } from '@/lib/analytics-server';
import { listTracks } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';

export default async function AnalyticsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: slug } = await params;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace } = context;
  const [tracks, data] = await Promise.all([listTracks(workspace.id), loadAnalytics(workspace.id)]);
  const base = `/w/${workspace.slug}/analytics`;

  if (data.sessions.length === 0) {
    return (
      <div className="page page-wide">
        <h1 className="page-title">Analytics</h1>
        <EmptyState
          icon={<BarChart3 aria-hidden="true" />}
          title="No activity yet"
          body="Engagement appears here once a published room has visitors. Previews of draft rooms are not counted."
        />
        {tracks.length > 0 ? (
          <p className="hint" style={{ textAlign: 'center', marginTop: 16 }}>
            To create personal links for a room, open it here:{' '}
            {tracks.map((t, i) => (
              <span key={t.id}>
                {i > 0 ? ', ' : ''}
                <Link className="link" href={`${base}/${t.id}`}>
                  {t.name}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    );
  }

  const overall = summarize(data.sessions, data.engagement, data.clickSessions);
  const totals = sessionTotals(data.engagement);
  const trackName = new Map(tracks.map((t) => [t.id, t.name]));

  return (
    <div className="page page-wide">
      <h1 className="page-title">Analytics</h1>
      <p className="page-subtitle">How buyers are engaging with your published rooms.</p>

      <div className="stats">
        <Stat label="Sessions" value={overall.sessions} />
        <Stat label="Unique visitors" value={overall.visitors} />
        <Stat label="Average active time" value={formatDuration(overall.avgSeconds)} note="per session" />
        <Stat label="Binge sessions" value={overall.bingeSessions} note="engaged with 2+ items" />
        <Stat label="Button clicks" value={overall.ctaClicks} note={`${formatPercent(overall.ctaRate)} of sessions`} />
      </div>

      <h2 className="section-title">By track</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Track</th>
              <th className="num">Sessions</th>
              <th className="num">Visitors</th>
              <th className="num">Average active time</th>
              <th className="num">Binge sessions</th>
              <th className="num">Button clicks</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) => {
              const s = summarize(
                data.sessions.filter((x) => x.trackId === track.id),
                data.engagement.filter((x) => x.trackId === track.id),
                data.clickSessions,
              );
              return (
                <tr key={track.id}>
                  <td>
                    <Link href={`${base}/${track.id}`} className="asset-row">
                      <span className="asset-title truncate">{track.name}</span>
                    </Link>
                  </td>
                  <td className="num">{s.sessions}</td>
                  <td className="num">{s.visitors}</td>
                  <td className="num">{formatDuration(s.avgSeconds)}</td>
                  <td className="num">{s.bingeSessions}</td>
                  <td className="num">{s.ctaClicks}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Recent sessions</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Visitor</th>
              <th>Track</th>
              <th>Started</th>
              <th className="num">Active time</th>
              <th className="num">Items</th>
            </tr>
          </thead>
          <tbody>
            {data.sessions.slice(0, 15).map((session) => {
              const t = totals.get(session.id);
              return (
                <tr key={session.id}>
                  <td>
                    <Link className="link" href={`${base}/${session.trackId}/sessions/${session.id}`}>
                      {visitorLabel(data.visitors.get(session.visitorId))}
                    </Link>{' '}
                    {t?.binge ? <span className="badge">Binge</span> : null}
                  </td>
                  <td>{trackName.get(session.trackId) ?? 'Deleted track'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatWhen(session.startedAt)}</td>
                  <td className="num">{formatDuration(t?.seconds ?? 0)}</td>
                  <td className="num">{t?.items ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
