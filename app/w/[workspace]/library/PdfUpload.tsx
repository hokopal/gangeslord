'use client';

import { Check, FileText, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { supabaseEnv } from '@/lib/supabase/env';
import { registerPdfAction } from './actions';

const MAX_BYTES = 50 * 1024 * 1024;

type Stage = 'idle' | 'uploading' | 'saving' | 'done';

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

/** Uploads straight to storage with a request that reports progress as it goes. */
function uploadWithProgress(path: string, file: File, token: string, onProgress: (ratio: number) => void): Promise<void> {
  const { url, anonKey } = supabaseEnv();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${url}/storage/v1/object/assets/${path}`);
    xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('content-type', 'application/pdf');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`status ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(file);
  });
}

/**
 * Uploads a PDF from the browser straight to storage (so large files never pass through
 * the app server), showing progress, then asks the server to register it in the library.
 */
export function PdfUpload({ workspaceId, workspaceSlug }: { workspaceId: string; workspaceSlug: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState('');

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    if (chosen.type !== 'application/pdf' && !chosen.name.toLowerCase().endsWith('.pdf')) {
      setProblem('Choose a PDF file.');
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setProblem('That PDF is over 50 MB.');
      return;
    }
    setProblem('');
    setFile({ name: chosen.name, size: chosen.size });
    setProgress(0);
    setStage('uploading');

    const id = crypto.randomUUID();
    const path = `${workspaceId}/${id}.pdf`;
    const supabase = createBrowserSupabase();
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('signed out');
      await uploadWithProgress(path, chosen, token, setProgress);
    } catch {
      // Fall back to the library's own upload, which works but cannot report progress.
      setProgress(null);
      const { error } = await supabase.storage.from('assets').upload(path, chosen, { contentType: 'application/pdf', upsert: true });
      if (error) {
        setStage('idle');
        setFile(null);
        setProblem('The upload didn’t finish. Please try again.');
        return;
      }
    }
    setProgress(1);
    setStage('saving');
    await registerPdfAction(workspaceSlug, id, chosen.name);
    setStage('done');
  }

  const busy = stage === 'uploading' || stage === 'saving';
  const percent = progress === null ? null : Math.round(progress * 100);

  return (
    <>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={onFile} />
      <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <span className="spinner" aria-hidden="true" /> : <Upload width={14} height={14} aria-hidden="true" />}
        {stage === 'uploading' ? 'Uploading…' : stage === 'saving' ? 'Adding to library…' : 'Upload PDF'}
      </button>
      {problem ? (
        <span className="hint" role="alert" style={{ color: 'var(--danger)' }}>
          {problem}
        </span>
      ) : null}
      {file && stage !== 'idle' ? (
        <div className="work-panel" role="status" style={{ flexBasis: '100%' }}>
          <div className="work-row" data-state={stage === 'uploading' ? 'working' : 'done'}>
            {stage === 'uploading' ? <FileText aria-hidden="true" /> : <Check className="pop success-mark" aria-hidden="true" />}
            <span className="truncate" style={{ flex: 1 }}>
              {file.name}
            </span>
            <span className="hint">
              {megabytes(file.size)}
              {stage === 'uploading' && percent !== null ? ` · ${percent}%` : ''}
            </span>
          </div>
          <div className="progress" style={{ marginTop: 6 }}>
            <div
              className="progress-fill"
              data-indeterminate={stage === 'saving' || percent === null}
              style={stage === 'uploading' && percent !== null ? { width: `${percent}%` } : undefined}
            />
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            {stage === 'uploading' ? 'Uploading…' : 'Uploaded. Adding it to your library…'}
          </div>
        </div>
      ) : null}
    </>
  );
}
