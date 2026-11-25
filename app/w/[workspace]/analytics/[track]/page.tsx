import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CopyButton } from '@/components/ui/CopyButton';
import { siteOrigin } from '@/lib/origin';
import { RatioBar, Stat, formatWhen } from '@/components/ui/Stat';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { formatDuration, formatPercent, itemStats, sessionTotals, summarize, visitorLabel } from '@/lib/analytics';
import { loadAnalytics } from '@/lib/analytics-server';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { listShareLinks } from '@/lib/share-links';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';
import { createShareLinkAction, deleteShareLinkAction } from './actions';

export default async function TrackAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; track: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspace: slug, track: trackId } = await params;
  const { error } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const detail = /^[0-9a-f-]{36}$/.test(trackId) ? await getTrackDetail(workspace.id, trackId) : null;
  if (!detail) notFound();
  const { track, items } = detail;
  const [data, links] = await Promise.all([loadAnalytics(workspace.id, track.id), listShareLinks(track.id)]);

  const summary = summarize(data.sessions, data.engagement, data.clickSessions);
  const totals = sessionTotals(data.engagement);
  const stats = itemStats(
    items.map((i) => ({ id: i.id, title: i.titleOverride || i.asset.title })),
    data.sessions.length,
    data.engagement,
  );
  const base = `/w/${workspace.slug}/analytics`;
  const roomPath = `/r/${workspace.slug}/${track.slug}`;
  const roomOrigin = await siteOrigin(workspace.slug);
  const canWrite = can(role, 'links.write');
  const published = track.status === 'published';
  const hidden = (
    <>
      <input type="hidden" name="workspace" value={workspace.slug} />
      <input type="hidden" name="track" value={track.id} />
    </>
  );

  return (
    <div className="page page-wide">
      <Link href={base} className="back">
        <ArrowLeft aria-hidden="true" /> Analytics
      </Link>
      <div className="header-row">
        <div>
          <h1 className="page-title">{track.name}</h1>
          <p className="page-subtitle">
            <span className={published ? 'badge' : 'badge badge-warn'}>{published ? 'Published' : 'Draft'}</span>{' '}
            {published ? 'Visits to this room are being counted.' : 'Draft rooms are not counted. Publish the track to start collecting visits.'}
          </p>
        </div>
        <div className="header-actions">
          {can(role, 'content.write') ? (
            <Link className="btn" href={`/w/${workspace.slug}/tracks/${track.id}`}>
              Edit track
            </Link>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}

      <div className="stats">
        <Stat label="Sessions" value={summary.sessions} />
        <Stat label="Unique visitors" value={summary.visitors} />
        <Stat label="Average active time" value={formatDuration(summary.avgSeconds)} note="per session" />
        <Stat label="Items per session" value={summary.itemsPerSession} />
        <Stat label="Binge sessions" value={summary.bingeSessions} note="engaged with 2+ items" />
        <Stat label="Button clicks" value={summary.ctaClicks} note={`${formatPercent(summary.ctaRate)} of sessions`} />
      </div>

      <h2 className="section-title">Items</h2>
      {stats.length === 0 ? (
        <p className="hint">This track has no items.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Sessions that reached it</th>
                <th className="num">Viewers</th>
                <th className="num">Average active time</th>
                <th>Met engagement threshold</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td style={{ maxWidth: 320 }}>
                    <span className="truncate" style={{ display: 'block' }}>
                      {item.title}
                    </span>
                  </td>
                  <td className="bar-cell">
                    <RatioBar ratio={item.reach} />
                  </td>
                  <td className="num">{item.viewers}</td>
                  <td className="num">{formatDuration(item.avgSeconds)}</td>
                  <td className="bar-cell">
                    <RatioBar ratio={item.thresholdRate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section-title" id="personal-links">
        Personal links
      </h2>
      <p className="hint" style={{ marginBottom: 12 }}>
        A personal link opens the same room, but tells you who opened it. Create one for each person you send the room to.
      </p>
      {canWrite ? (
        <form action={createShareLinkAction} className="row-form" style={{ marginBottom: 16 }}>
          {hidden}
          <div className="field" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
            <label className="label" htmlFor="link-name">
              Recipient name
            </label>
            <input id="link-name" name="name" className="input" required maxLength={120} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
            <label className="label" htmlFor="link-email">
              Email (optional)
            </label>
            <input id="link-email" name="email" type="email" className="input" />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
            <label className="label" htmlFor="link-account">
              Company (optional)
            </label>
            <input id="link-account" name="account" className="input" maxLength={120} />
          </div>
          <SubmitButton className="btn btn-primary" pendingLabel="Creating…">
            Create link
          </SubmitButton>
        </form>
      ) : null}
      {links.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Opened</th>
                <th>Last visit</th>
                <th className="num">Sessions</th>
                <th className="num">Active time</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {links.map((link) => {
                const visits = data.sessions.filter((s) => s.shareLinkId === link.id);
                const seconds = visits.reduce((sum, s) => sum + (totals.get(s.id)?.seconds ?? 0), 0);
                const last = visits[0];
                return (
                  <tr key={link.id}>
                    <td>
                      {link.recipientName}
                      {link.accountName ? <span className="hint"> · {link.accountName}</span> : null}
                    </td>
                    <td>
                      <span className={visits.length ? 'badge' : 'badge badge-warn'}>{visits.length ? 'Opened' : 'Not opened'}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{last ? formatWhen(last.lastSeenAt) : ''}</td>
                    <td className="num">{visits.length}</td>
                    <td className="num">{formatDuration(seconds)}</td>
                    <td className="actions">
                      <form action={deleteShareLinkAction} style={{ display: 'inline-flex', gap: 6 }}>
                        {hidden}
                        <input type="hidden" name="link" value={link.id} />
                        <CopyButton origin={roomOrigin} path={`${roomPath}?r=${link.token}`} label="Copy link" />
                        {canWrite ? <SubmitButton className="btn btn-sm btn-danger">Delete</SubmitButton> : null}
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <h2 className="section-title">Sessions</h2>
      {data.sessions.length === 0 ? (
        <p className="hint">No visits yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Started</th>
                <th>Country</th>
                <th className="num">Active time</th>
                <th className="num">Items</th>
                <th className="num">Thresholds met</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.slice(0, 100).map((session) => {
                const t = totals.get(session.id);
                return (
                  <tr key={session.id}>
                    <td>
                      <Link className="link" href={`${base}/${track.id}/sessions/${session.id}`}>
                        {visitorLabel(data.visitors.get(session.visitorId))}
                      </Link>{' '}
                      {t?.binge ? <span className="badge">Binge</span> : null}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatWhen(session.startedAt)}</td>
                    <td>{session.country ?? ''}</td>
                    <td className="num">{formatDuration(t?.seconds ?? 0)}</td>
                    <td className="num">{t?.items ?? 0}</td>
                    <td className="num">{t?.met ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
