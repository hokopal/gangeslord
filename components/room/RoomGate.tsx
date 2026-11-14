'use client';

import { useState } from 'react';
import { FORM_FIELDS, type PublicForm } from '@/lib/room-options';

const MESSAGES: Record<string, string> = {
  form_incomplete: 'Fill in every field marked as required.',
  email_invalid: 'Enter a valid email address.',
  consent_required: 'Tick the box to agree before continuing.',
};

/** The room's form, shown over the content until the visitor fills it in. */
export function RoomGate({ form, workspace, track, onDone }: { form: PublicForm; workspace: string; track: string; onDone: () => void }) {
  const [status, setStatus] = useState<'idle' | 'sending'>('idle');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch('/r/api/form', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workspace, track, fields }) });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (response.ok && result.ok) {
        // When the server held the content back, only a fresh page load can bring it in.
        if (form.locked) return window.location.reload();
        return onDone();
      }
      setError(MESSAGES[result.error ?? ''] ?? 'That didn’t go through. Please try again.');
    } catch {
      setError('We couldn’t reach the server. Check your connection and try again.');
    }
    setStatus('idle');
  }

  return (
    <div className="room-gate" role="dialog" aria-modal="true" aria-labelledby="room-gate-title">
      <form className="room-gate-card" onSubmit={submit}>
        <h2 id="room-gate-title">{form.heading}</h2>
        {form.intro ? <p className="room-gate-intro">{form.intro}</p> : null}
        {form.fields.map((field, index) => {
          const def = FORM_FIELDS.find((f) => f.key === field.key)!;
          return (
            <div className="field" key={field.key}>
              <label className="label" htmlFor={`gate-${field.key}`}>
                {def.label}
                {field.required ? null : <span className="hint"> (optional)</span>}
              </label>
              <input id={`gate-${field.key}`} name={field.key} type={def.type} className="input" required={field.required} maxLength={200} autoComplete={def.autoComplete} autoFocus={index === 0} />
            </div>
          );
        })}
        {form.custom.map((question) => (
          <div className="field" key={question.key}>
            <label className="label" htmlFor={`gate-${question.key}`}>
              {question.label}
              {question.required ? null : <span className="hint"> (optional)</span>}
            </label>
            <input id={`gate-${question.key}`} name={question.key} className="input" required={question.required} maxLength={200} />
          </div>
        ))}
        {form.consent ? (
          <label className="check-row">
            <input type="checkbox" name="consent" required />
            <span>{form.consent}</span>
          </label>
        ) : null}
        {error ? (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={status === 'sending'} aria-busy={status === 'sending'}>
          {status === 'sending' ? <span className="spinner" aria-hidden="true" /> : null}
          {status === 'sending' ? 'Sending…' : form.button}
        </button>
      </form>
    </div>
  );
}
