'use client';

import { useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Problem = '' | 'limit' | 'other';
type Status = 'idle' | 'sending' | 'sent' | 'error';

export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [problem, setProblem] = useState<Problem>('');

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');
    const { error } = await createBrowserSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    // The email service allows only so many sign-in emails an hour. Say so, rather than blaming the address.
    setProblem(error ? (error.status === 429 || /rate limit/i.test(error.message) ? 'limit' : 'other') : '');
    setStatus(error ? 'error' : 'sent');
  }

  async function withGoogle() {
    await createBrowserSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo() },
    });
  }

  if (status === 'sent') {
    return (
      <p className="notice" role="status">
        Check your inbox for a sign-in link.
      </p>
    );
  }

  return (
    <>
      <form onSubmit={sendLink}>
        <div className="field">
          <label className="label" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {status === 'error' ? (
          <p className="notice notice-error" role="alert">
            {problem === 'limit'
              ? 'Too many sign-in emails have been sent in the last hour, so this one was held back. Please try again in a little while.'
              : 'We couldn’t send the link. Check the address and try again in a minute.'}
          </p>
        ) : null}
        <button className="btn btn-primary btn-block" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send magic link'}
        </button>
      </form>
      {googleEnabled ? (
        <>
          <div className="divider">or</div>
          <button className="btn btn-block" type="button" onClick={withGoogle}>
            Continue with Google
          </button>
        </>
      ) : null}
    </>
  );
}
