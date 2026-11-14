import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { guestAccess, listGuestNotes, listSharing } from '@/lib/guest-notes';
import { listMembers } from '@/lib/members';
import { errorMessage } from '@/lib/messages';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';
import { replyNoteAction, resolveNoteAction, shareTrackAction, unshareTrackAction } from './actions';

const KIND_LABEL = { question: 'Question', comment: 'Comment', note: 'Sticky note', pen: 'Pen drawing', marker: 'Marker highlight' } as const;
const isDrawing = (kind: string) => kind === 'pen' || kind === 'marker';
const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

export default async function GuestNotesPage({
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
  const { workspace } = context;
  const detail = /^[0-9a-f-]{36}$/.test(trackId) ? await getTrackDetail(workspace.id, trackId) : null;
  if (!detail) notFound();
  const { track, items } = detail;
  const access = await guestAccess(track.id);
  const [notes, sharing, members] = await Promise.all([
    access.sees ? listGuestNotes(track.id) : Promise.resolve([]),
    access.sees || access.manages ? listSharing(track.id) : Promise.resolve([]),
    access.manages ? listMembers(workspace.id) : Promise.resolve([]),
  ]);
  const title = new Map(items.map((item) => [item.id, item.titleOverride || item.asset.title]));
  const shared = new Set(sharing.map((person) => person.userId));
  const candidates = members.filter((member) => !shared.has(member.userId));
  const hidden = (
    <>
      <input type="hidden" name="workspace" value={workspace.slug} />
      <input type="hidden" name="track" value={track.id} />
    </>
  );
  const open = notes.filter((note) => (note.kind === 'question' || note.kind === 'comment') && !note.resolvedAt).length;

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/tracks/${track.id}`} className="back">
        <ArrowLeft aria-hidden="true" /> {track.name}
      </Link>
      <h1 className="page-title">Guest notes</h1>
      <p className="page-subtitle">
        Questions, comments, sticky notes and drawings that buyers leave in this room. Only the person who created the room, and
        people they share it with, can see them.
      </p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}

      {!access.sees ? (
        <p className="notice" role="status">
          You don’t have access to what guests leave in this room. Ask the person who created it to share it with you.
        </p>
      ) : notes.length === 0 ? (
        <p className="hint">No guest has left anything in this room yet.</p>
      ) : (
        <>
          <p className="hint" style={{ marginBottom: 8 }}>
            {open === 0 ? 'Nothing is waiting for a reply.' : `${open} ${open === 1 ? 'question or comment is' : 'questions and comments are'} waiting.`} Replies you write here appear in the guest’s comments panel in the room.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>What they wrote</th>
                  <th>From</th>
                  <th>About</th>
                  <th>When</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id} style={note.resolvedAt ? { opacity: 0.55 } : undefined}>
                    <td>
                      <span className="badge note-kind" data-kind={note.kind}>
                        {KIND_LABEL[note.kind]}
                      </span>
                    </td>
                    <td style={{ maxWidth: 440 }}>
                      {isDrawing(note.kind) ? <span className="hint">Drew on the page.</span> : <span style={{ whiteSpace: 'pre-wrap' }}>{note.body}</span>}
                      {note.page && note.itemId ? (
                        <>
                          {' '}
                          <Link className="link" href={`/w/${workspace.slug}/tracks/${track.id}/notes/markup?item=${note.itemId}&visitor=${note.visitorId}`}>
                            View on the document
                          </Link>
                        </>
                      ) : null}
                      {isDrawing(note.kind) ? null : (
                        <form action={replyNoteAction} className="row-form" style={{ marginTop: 8 }}>
                          {hidden}
                          <input type="hidden" name="note" value={note.id} />
                          <input name="reply" className="input" maxLength={2000} defaultValue={note.replyBody ?? ''} placeholder="Write a reply…" aria-label={`Reply to ${note.authorName ?? 'this guest'}`} style={{ flex: 1, minWidth: 160 }} />
                          <SubmitButton className="btn btn-sm" pendingLabel="Sending…">
                            {note.replyBody ? 'Update reply' : 'Reply'}
                          </SubmitButton>
                        </form>
                      )}
                    </td>
                    <td>
                      {note.authorName ?? ''}
                      {note.authorEmail ? (
                        <>
                          <br />
                          <a className="link" href={`mailto:${note.authorEmail}`}>
                            {note.authorEmail}
                          </a>
                        </>
                      ) : null}
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      {note.itemId ? (title.get(note.itemId) ?? 'A removed item') : 'The whole room'}
                      {note.page ? `, page ${note.page}` : ''}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatWhen(note.createdAt)}</td>
                    <td className="actions">
                      {note.kind === 'note' || isDrawing(note.kind) ? null : (
                        <form action={resolveNoteAction}>
                          {hidden}
                          <input type="hidden" name="note" value={note.id} />
                          <input type="hidden" name="resolved" value={note.resolvedAt ? 'false' : 'true'} />
                          <SubmitButton className="btn btn-sm" pendingLabel="Saving…">
                            {note.resolvedAt ? 'Reopen' : 'Mark as done'}
                          </SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {access.sees || access.manages ? (
        <>
          <h2 className="section-title">Who can edit this room and see guest notes</h2>
          <p className="hint" style={{ marginBottom: 8 }}>
            Sharing a room lets a colleague edit it and see everything guests leave in it. Workspace admins can always edit, but see
            guest notes only when the room is shared with them.
          </p>
          <div className="table-wrap" style={{ maxWidth: 560 }}>
            <table className="table">
              <tbody>
                {sharing.map((person) => (
                  <tr key={person.userId}>
                    <td>{person.email}</td>
                    <td>{person.isOwner ? 'Created the room' : 'Shared with'}</td>
                    <td className="actions">
                      {access.manages && !person.isOwner ? (
                        <form action={unshareTrackAction}>
                          {hidden}
                          <input type="hidden" name="user" value={person.userId} />
                          <SubmitButton className="btn btn-sm btn-danger" pendingLabel="Removing…">
                            Remove
                          </SubmitButton>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {access.manages && candidates.length > 0 ? (
            <form action={shareTrackAction} className="row-form" style={{ marginTop: 12 }}>
              {hidden}
              <div className="field" style={{ marginBottom: 0, minWidth: 240 }}>
                <label className="label" htmlFor="share-user">
                  Share with someone in this workspace
                </label>
                <select id="share-user" name="user" className="select" required defaultValue="">
                  <option value="" disabled>
                    Choose a person
                  </option>
                  {candidates.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.email}
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton className="btn" pendingLabel="Sharing…">
                Share
              </SubmitButton>
            </form>
          ) : null}
          {access.manages ? null : <p className="hint">Only the person who created the room can change this.</p>}
        </>
      ) : null}
    </div>
  );
}
