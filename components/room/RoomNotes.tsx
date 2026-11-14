'use client';

import { ArrowUp, MessageSquare, Trash2, X } from 'lucide-react';
import { useState } from 'react';

type Kind = 'comment' | 'question' | 'note';
type Note = { id: string; item: string | null; kind: Kind; body: string; page: number | null; reply: string | null; replied_at: string | null; created_at: string };
type Item = { id: string; slug: string; title: string };

const KINDS: { value: Kind; label: string; placeholder: string }[] = [
  { value: 'comment', label: 'Comment', placeholder: 'Add a comment…' },
  { value: 'question', label: 'Question', placeholder: 'Ask a question…' },
  { value: 'note', label: 'Note', placeholder: 'Add a sticky note…' },
];
const ERRORS: Record<string, string> = {
  identity_invalid: 'Enter your name and a valid email address.',
  not_accepted: 'That couldn’t be saved. Check it isn’t empty and try again.',
  not_available: 'Comments aren’t available for this room right now.',
};

/** "Just now", "5m", "3h", "2d", then a date: the compact timestamps people expect beside a comment. */
function ago(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * A guest's comments, questions and sticky notes for a room, in a side panel.
 * What a guest writes is shown only to them and to the room's owner, never to other guests.
 */
export function RoomNotes({ workspace, track, items, basePath, owner }: { workspace: string; track: string; items: Item[]; basePath: string; owner: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [itemId, setItemId] = useState('');
  const [kind, setKind] = useState<Kind>('comment');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const titleOf = (id: string | null) => items.find((item) => item.id === id)?.title ?? 'The whole room';
  const initial = (name.trim()[0] ?? 'Y').toUpperCase();

  async function send(method: 'GET' | 'POST' | 'DELETE', payload: Record<string, unknown> = {}) {
    setBusy(true);
    setError('');
    try {
      const query = method === 'GET' ? `?workspace=${workspace}&track=${track}` : '';
      const response = await fetch(`/r/api/notes${query}`, method === 'GET' ? {} : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workspace, track, ...payload }) });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; identified?: boolean; name?: string | null; notes?: Note[] };
      if (!result.ok) {
        setError(ERRORS[result.error ?? ''] ?? 'Something went wrong. Please try again.');
        return false;
      }
      setIdentified(Boolean(result.identified));
      setName(result.name ?? '');
      setNotes(result.notes ?? []);
      setLoaded(true);
      return true;
    } catch {
      setError('We couldn’t reach the server. Check your connection and try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    if (!open) {
      // New comments attach to whichever item is on screen as the panel opens.
      const slug = window.location.pathname.slice(basePath.length).split('/').filter(Boolean)[0];
      setItemId((items.find((item) => item.slug === slug) ?? items[0])?.id ?? '');
      // Fetched each time the panel opens, so replies and notes pinned on a page show up.
      void send('GET');
    }
    setOpen(!open);
  }

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const saved = await send('POST', { item: itemId || null, kind, body: draft, name: data.get('name') ?? '', email: data.get('email') ?? '' });
    if (saved) setDraft('');
  }

  return (
    <>
      <button type="button" className="comments-tab" onClick={toggle} aria-expanded={open} aria-controls="room-comments">
        <MessageSquare aria-hidden="true" />
        {notes.length > 0 ? notes.length : 'Comment'}
      </button>
      {open ? (
        <aside id="room-comments" className="comments" aria-label="Comments">
          <header className="comments-head">
            <strong>Comments</strong>
            <button type="button" className="icon-button" aria-label="Close comments" onClick={() => setOpen(false)}>
              <X width={16} height={16} aria-hidden="true" />
            </button>
          </header>

          <ol className="comments-list">
            {loaded && notes.length === 0 ? <li className="comments-empty">No comments yet. Yours will be the first.</li> : null}
            {[...notes].reverse().map((note) => (
              <li key={note.id} className="comment" data-kind={note.kind}>
                <span className="comment-avatar" aria-hidden="true">
                  {initial}
                </span>
                <div className="comment-main">
                  <div className="comment-meta">
                    <strong>{name || 'You'}</strong>
                    <time dateTime={note.created_at}>{ago(note.created_at)}</time>
                    {note.kind === 'comment' ? null : <span className="comment-kind">{KINDS.find((k) => k.value === note.kind)?.label}</span>}
                  </div>
                  <div className="comment-context">
                    {note.page ? `Page ${note.page} · ` : ''}
                    {titleOf(note.item)}
                  </div>
                  <p className="comment-body">{note.body}</p>
                  {note.reply ? (
                    <div className="comment-reply">
                      <div className="comment-meta">
                        <strong>{owner}</strong>
                        {note.replied_at ? <time dateTime={note.replied_at}>{ago(note.replied_at)}</time> : null}
                      </div>
                      <p className="comment-body">{note.reply}</p>
                    </div>
                  ) : null}
                </div>
                <button type="button" className="icon-button comment-delete" aria-label="Delete comment" disabled={busy} onClick={() => void send('DELETE', { note: note.id })}>
                  <Trash2 width={14} height={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>

          <form onSubmit={add} className="comments-composer">
            {loaded && !identified ? (
              <div className="comments-identity">
                <input name="name" className="input" required maxLength={120} autoComplete="name" placeholder="Your name" aria-label="Your name" />
                <input name="email" type="email" className="input" required maxLength={254} autoComplete="email" placeholder="Work email" aria-label="Work email" />
              </div>
            ) : null}
            <div className="comments-input">
              <span className="comment-avatar" aria-hidden="true">
                {initial}
              </span>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Enter sends, Shift+Enter starts a new line.
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                required
                maxLength={2000}
                rows={1}
                placeholder={KINDS.find((k) => k.value === kind)?.placeholder}
                aria-label="Your comment"
              />
              <button type="submit" className="comments-send" disabled={busy || !loaded || draft.trim() === ''} aria-label="Send">
                <ArrowUp width={14} height={14} aria-hidden="true" />
              </button>
            </div>
            <div className="comments-options">
              <div role="radiogroup" aria-label="Type">
                {KINDS.map((option) => (
                  <button key={option.value} type="button" role="radio" aria-checked={kind === option.value} onClick={() => setKind(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
              <select value={itemId} onChange={(event) => setItemId(event.target.value)} aria-label="About">
                <option value="">The whole room</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            {error ? (
              <p className="notice notice-error" role="alert">
                {error}
              </p>
            ) : null}
            <p className="comments-privacy">Only you and this room’s owner at {owner} can see your comments.</p>
          </form>
        </aside>
      ) : null}
    </>
  );
}
