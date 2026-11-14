'use client';

import { Globe } from 'lucide-react';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { addContentAction } from './actions';
import { PdfUpload } from './PdfUpload';

const MAX = 20;

function parse(text: string): string[] {
  return [...new Set(text.split(/\s+/).filter(Boolean))].slice(0, MAX);
}

/** While the links are being fetched, lists each one so the wait has something to watch. */
function Working({ urls }: { urls: string[] }) {
  const { pending } = useFormStatus();
  if (!pending || urls.length === 0) return null;
  return (
    <div className="work-panel" role="status">
      <div className="work-title">
        <span className="spinner" aria-hidden="true" />
        Fetching {urls.length === 1 ? 'your link' : `${urls.length} links`}. This can take a few seconds each.
      </div>
      {urls.map((url) => (
        <div key={url} className="work-row">
          <Globe aria-hidden="true" />
          <span className="truncate" style={{ flex: 1 }}>
            {url}
          </span>
          <span className="skeleton" style={{ width: 64, height: 10 }} />
        </div>
      ))}
    </div>
  );
}

export function AddLinksForm({ workspaceId, workspaceSlug }: { workspaceId: string; workspaceSlug: string }) {
  const [text, setText] = useState('');
  const urls = parse(text);

  return (
    <form action={addContentAction}>
      <input type="hidden" name="workspace" value={workspaceSlug} />
      <div className="field">
        <label className="label" htmlFor="urls">
          Add links
        </label>
        <textarea
          id="urls"
          name="urls"
          className="textarea"
          required
          placeholder="Paste one or more links, one per line"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <span className="hint">
          {urls.length > 0
            ? `${urls.length} link${urls.length === 1 ? '' : 's'} ready to add.`
            : 'Web pages, PDF links and YouTube videos. Up to 20 at a time.'}
        </span>
      </div>
      <div className="row-form">
        <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
          Add to library
        </SubmitButton>
        <PdfUpload workspaceId={workspaceId} workspaceSlug={workspaceSlug} />
      </div>
      <Working urls={urls} />
    </form>
  );
}
