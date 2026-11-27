'use client';

import { CheckCircle2, ClipboardCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ACCEPTANCE_STATEMENT } from '@/lib/acceptance-core';
import { planProgress } from '@/lib/action-plan-core';

type Item = { id: string; label: string; owner: 'seller' | 'buyer'; due_date: string | null; done: boolean };
type PlanResponse = { ok?: boolean; error?: string; identified?: boolean; name?: string | null; email?: string | null; items?: Item[]; accepted_at?: string };

const ERRORS: Record<string, string> = {
  identity_invalid: 'Enter your name and a valid work email.',
  not_accepted: 'That couldn’t be saved. Try again.',
  not_available: 'This isn’t available for the room right now.',
  too_many_requests: 'Too many attempts. Please wait a minute and try again.',
};

const fmtDue = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null);

/**
 * The mutual action plan: the steps both sides agreed to, tickable by the buyer, plus the
 * accept & sign step that closes the room. One panel, bottom-left of the screen.
 */
export function RoomPlan({ workspace, track, owner }: { workspace: string; track: string; owner: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signedAt, setSignedAt] = useState<string | null>(null);

  const progress = planProgress(items);

  async function send(method: 'GET' | 'POST', url: string, payload: Record<string, unknown> = {}): Promise<PlanResponse | null> {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/r/api/${url}${method === 'GET' ? `?workspace=${workspace}&track=${track}` : ''}`, method === 'GET' ? {} : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workspace, track, ...payload }) });
      const result = (await response.json().catch(() => ({}))) as PlanResponse;
      if (!result.ok) {
        setError(ERRORS[result.error ?? ''] ?? 'Something went wrong. Please try again.');
        return null;
      }
      return result;
    } catch {
      setError('We couldn’t reach the server. Check your connection and try again.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  // Load the plan on mount so the tab can show progress; re-loaded whenever the panel opens.
  useEffect(() => {
    void (async () => {
      const result = await send('GET', 'plan');
      if (!result) return;
      setItems(result.items ?? []);
      setName(result.name ?? '');
      setEmail(result.email ?? '');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle() {
    setOpen((value) => !value);
    const result = await send('GET', 'plan');
    if (!result) return;
    setItems(result.items ?? []);
    if (result.name) setName(result.name);
    if (result.email) setEmail(result.email);
  }

  async function flip(item: Item) {
    const result = await send('POST', 'plan', { id: item.id, done: !item.done });
    if (result) setItems(result.items ?? []);
  }

  async function sign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const signature = String(form.get('name') ?? '').trim();
    const result = await send('POST', 'accept', {
      name: signature,
      email: form.get('email') ?? '',
      signature,
      statement: ACCEPTANCE_STATEMENT,
    });
    if (result?.accepted_at) setSignedAt(result.accepted_at);
  }

  return (
    <>
      <button type="button" className="plan-tab" onClick={() => void toggle()} aria-expanded={open} aria-controls="room-plan">
        <ClipboardCheck aria-hidden="true" />
        {items.length > 0 ? `Plan ${progress.done}/${progress.total}` : 'Next steps'}
      </button>
      {open ? (
        <aside id="room-plan" className="plan" role="dialog" aria-label="Next steps">
          <header className="plan-head">
            <strong>Next steps</strong>
            <button type="button" className="icon-button" aria-label="Close panel" onClick={() => setOpen(false)}>
              <X width={16} height={16} aria-hidden="true" />
            </button>
          </header>

          {items.length > 0 ? (
            <div className="plan-progress" aria-hidden="true">
              <span style={{ width: `${progress.percent}%` }} />
            </div>
          ) : null}

          <div className="plan-scroll">
            {items.length > 0 ? (
              <ol className="plan-list">
                {items.map((item) => (
                  <li key={item.id} className="plan-item" data-done={item.done || undefined}>
                    <label>
                      <input type="checkbox" checked={item.done} disabled={busy} onChange={() => void flip(item)} />
                      <span className="plan-item-body">
                        <span className="plan-item-label">{item.label}</span>
                        <span className="plan-item-meta">
                          <span className="plan-owner" data-owner={item.owner}>{item.owner === 'buyer' ? 'You' : owner}</span>
                          {fmtDue(item.due_date) ? <span className="plan-due">by {fmtDue(item.due_date)}</span> : null}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="plan-empty">No steps agreed yet. Anything {owner} adds here will appear for both of you.</p>
            )}
            {error ? <p className="plan-error" role="alert">{error}</p> : null}
          </div>

          <section className="plan-sign" aria-label="Accept and sign">
            {signedAt ? (
              <div className="plan-signed" role="status">
                <CheckCircle2 size={22} aria-hidden="true" />
                <div>
                  <strong>Proposal accepted</strong>
                  <p>Signed {new Date(signedAt).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. {owner} has been notified and will countersign or follow up.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={(event) => void sign(event)} className="plan-sign-form">
                <p className="plan-sign-title"><strong>Accept &amp; sign this proposal</strong></p>
                <p className="plan-sign-statement">{ACCEPTANCE_STATEMENT}</p>
                <input name="name" className="input" required maxLength={120} autoComplete="name" placeholder="Your full name" aria-label="Your full name (this acts as your signature)" defaultValue={name} />
                <input name="email" type="email" className="input" required maxLength={254} autoComplete="email" placeholder="Work email" aria-label="Work email" defaultValue={email} />
                <label className="plan-consent">
                  <input type="checkbox" required />
                  <span>I agree to the statement above and understand my typed name is my signature.</span>
                </label>
                <button type="submit" className="btn btn-primary plan-sign-button" disabled={busy}>
                  {busy ? 'Signing…' : 'Sign'}
                </button>
              </form>
            )}
          </section>
        </aside>
      ) : null}
    </>
  );
}
