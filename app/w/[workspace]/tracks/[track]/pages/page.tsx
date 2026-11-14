import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPageStats, listVideoStats } from '@/lib/pdf-pages';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';

const duration = (seconds: number) => (seconds < 60 ? `${Math.round(seconds)}s` : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`);

export default async function PdfPagesPage({ params }: { params: Promise<{ workspace: string; track: string }> }) {
  const { workspace: slug, track: trackId } = await params;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace } = context;
  const detail = /^[0-9a-f-]{36}$/.test(trackId) ? await getTrackDetail(workspace.id, trackId) : null;
  if (!detail) notFound();
  const { track, items } = detail;
  const [stats, videos] = await Promise.all([listPageStats(workspace.id, track.id), listVideoStats(workspace.id, track.id)]);
  const title = new Map(items.map((item) => [item.id, item.titleOverride || item.asset.title]));

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/tracks/${track.id}`} className="back">
        <ArrowLeft aria-hidden="true" /> {track.name}
      </Link>
      <h1 className="page-title">Reading and watching</h1>
      <p className="page-subtitle">Which pages of each PDF buyers read, and how much of each video they watched.</p>

      <h2 className="section-title">Videos</h2>
      {videos.length === 0 ? (
        <p className="hint">No video watching has been recorded yet. It appears once a buyer plays a video in the published room.</p>
      ) : (
        <div className="table-wrap" style={{ maxWidth: 720 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Video</th>
                <th>Visits that played it</th>
                <th>Average watched</th>
                <th>Watched 90% or more</th>
                <th style={{ width: '25%' }} />
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.itemId}>
                  <td>{title.get(video.itemId) ?? 'A removed item'}</td>
                  <td>{video.viewers}</td>
                  <td>{video.averagePercent}%</td>
                  <td>{video.finished}</td>
                  <td>
                    <span className="page-bar" style={{ width: `${video.averagePercent}%` }} aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section-title">PDFs</h2>

      {stats.length === 0 ? (
        <p className="hint">No page reading has been recorded yet. It appears once a buyer opens a PDF in the published room.</p>
      ) : (
        stats.map((item) => {
          const longest = Math.max(...item.pages.map((page) => page.seconds / page.viewers), 1);
          return (
            <section key={item.itemId}>
              <h3 style={{ fontSize: 14, margin: '16px 0 4px' }}>{title.get(item.itemId) ?? 'A removed item'}</h3>
              <p className="hint" style={{ marginBottom: 8 }}>
                {item.viewers} {item.viewers === 1 ? 'visit' : 'visits'} opened it.
              </p>
              <div className="table-wrap" style={{ maxWidth: 720 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Visits that saw it</th>
                      <th>Average time</th>
                      <th style={{ width: '40%' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {item.pages.map((page) => (
                      <tr key={page.page}>
                        <td>{page.page}</td>
                        <td>{page.viewers}</td>
                        <td>{duration(page.seconds / page.viewers)}</td>
                        <td>
                          <span className="page-bar" style={{ width: `${Math.round((page.seconds / page.viewers / longest) * 100)}%` }} aria-hidden="true" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
