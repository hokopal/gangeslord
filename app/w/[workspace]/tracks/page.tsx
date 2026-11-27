import { BookOpen, Gauge, ListChecks, ListVideo, MessageSquare, SlidersHorizontal, Sparkles, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/shell/EmptyState';
import { RowMenu } from '@/components/shell/RowMenu';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { listTracks } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';
import { createTrackAction } from './actions';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function TracksPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const tracks = await listTracks(workspace.id);
  const base = `/w/${workspace.slug}/tracks`;

  return (
    <div className="page page-wide">
      <h1 className="page-title">Tracks</h1>
      <p className="page-subtitle">A track is an ordered set of content you share with a buyer as one room.</p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}

      {can(role, 'content.write') ? (
        <form action={createTrackAction} className="row-form">
          <input type="hidden" name="workspace" value={workspace.slug} />
          <div className="field" style={{ flex: 1, minWidth: 220, maxWidth: 420, marginBottom: 0 }}>
            <label className="label" htmlFor="track-name">
              New track
            </label>
            <input id="track-name" name="name" className="input" required maxLength={120} placeholder="For example: Acme evaluation room" />
          </div>
          <SubmitButton className="btn btn-primary" pendingLabel="Creating…">
            Create track
          </SubmitButton>
          <Link className="btn" href={`${base}/ai`}>
            <Sparkles width={14} height={14} aria-hidden="true" />
            Draft with AI
          </Link>
        </form>
      ) : null}

      {tracks.length === 0 ? (
        <EmptyState
          icon={<ListVideo aria-hidden="true" />}
          title="No tracks yet"
          body="Create a track, add items from your library, then publish it to get a link you can share."
        />
      ) : (
        <div className="table-wrap" style={{ marginTop: 24 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Items</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={track.id}>
                  <td>
                    <Link href={`${base}/${track.id}`} className="asset-row">
                      <span className="asset-title truncate">{track.name}</span>
                    </Link>
                  </td>
                  <td>{track.itemCount}</td>
                  <td>
                    <span className={track.status === 'published' ? 'badge' : 'badge badge-warn'}>
                      {track.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(track.createdAt)}</td>
                  <td className="actions">
                    <RowMenu
                      label={`Actions for ${track.name}`}
                      items={[
                        { href: `${base}/${track.id}/pages`, label: 'Reading and watching', icon: <BookOpen aria-hidden="true" /> },
                        { href: `${base}/${track.id}/notes`, label: 'Guest notes', icon: <MessageSquare aria-hidden="true" /> },
                        { href: `${base}/${track.id}/plan`, label: 'Mutual plan', icon: <ListChecks aria-hidden="true" /> },
                        { href: `${base}/${track.id}/options`, label: 'Room options', icon: <SlidersHorizontal aria-hidden="true" /> },
                        { href: `${base}/${track.id}/optimize`, label: 'Optimise', icon: <Gauge aria-hidden="true" /> },
                        { href: `${base}/${track.id}/personalize`, label: 'Personalise', icon: <Wand2 aria-hidden="true" /> },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
