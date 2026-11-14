'use client';

import { useActionState } from 'react';
import { createApiKeyAction, type CreateKeyState } from './actions';

export function ApiKeyForm({ workspaceSlug }: { workspaceSlug: string }) {
  const [state, action, pending] = useActionState<CreateKeyState, FormData>(createApiKeyAction, {});
  return (
    <>
      <form action={action} className="row-form">
        <input type="hidden" name="workspace" value={workspaceSlug} />
        <div className="field" style={{ flex: 1, minWidth: 200, maxWidth: 320, marginBottom: 0 }}>
          <label className="label" htmlFor="key-name">
            Name
          </label>
          <input id="key-name" name="name" className="input" required maxLength={80} placeholder="For example: Reporting script" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="label" htmlFor="key-scope">
            Access
          </label>
          <select id="key-scope" name="scope" className="select" defaultValue="read">
            <option value="read">Read only</option>
            <option value="write">Read and write</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
          {pending ? <span className="spinner" aria-hidden="true" /> : null}
          {pending ? 'Creating…' : 'Create key'}
        </button>
      </form>
      {state.error ? (
        <p className="notice notice-error" role="alert" style={{ marginTop: 12 }}>
          {state.error}
        </p>
      ) : null}
      {state.key ? (
        <div className="notice" role="status" style={{ marginTop: 12 }}>
          <p style={{ marginBottom: 8 }}>
            <strong>Copy this key now.</strong> “{state.name}” was created, and this is the only time the key is shown.
          </p>
          <code className="key-reveal">{state.key}</code>
        </div>
      ) : null}
    </>
  );
}
