import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { DEFAULT_PROPERTIES } from '@/lib/audience-core';
import { listAudiences, previewLinks } from '@/lib/audiences';
import { renderMerge } from '@/lib/merge';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { createServerSupabase } from '@/lib/supabase/server';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';
import { saveWelcomeAction } from './actions';

const SAMPLE = { firstname: 'Dana', lastname: 'Lee', email: 'dana@example.com', company: 'Buyer Inc', jobtitle: 'VP of Support' };

export default async function PersonalizePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; track: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { workspace: slug, track: trackId } = await params;
  const { error, saved } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const detail = /^[0-9a-f-]{36}$/.test(trackId) ? await getTrackDetail(workspace.id, trackId) : null;
  if (!detail) notFound();
  const { track } = detail;
  const supabase = await createServerSupabase();
  const [{ data: row }, audiences, previews] = await Promise.all([
    supabase.from('tracks').select('welcome_message').eq('id', track.id).maybeSingle(),
    listAudiences(workspace.id),
    previewLinks(track.id),
  ]);
  const welcome = (row?.welcome_message as string | undefined) ?? '';
  const fields = [...new Set([...DEFAULT_PROPERTIES, ...audiences.flatMap((a) => a.properties)])];
  const canWrite = can(role, 'content.write');
  const room = `/r/${workspace.slug}/${track.slug}`;

  return (
    <div className="page">
      <Link href={`/w/${workspace.slug}/tracks/${track.id}`} className="back">
        <ArrowLeft aria-hidden="true" /> {track.name}
      </Link>
      <h1 className="page-title">Personalise</h1>
      <p className="page-subtitle">
        Use merge fields so each contact sees their own details when they open their personal link. Anyone using the plain room
        link sees the fallback instead.
      </p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {saved ? (
        <p className="notice" role="status">
          Saved.
        </p>
      ) : null}

      <h2 className="section-title">Merge fields</h2>
      <p className="hint">
        Write a field in double braces. Add a fallback after a bar for visitors you don’t know: <code>{'{{firstname|there}}'}</code>.
      </p>
      <ul className="field-list">
        {fields.map((name) => (
          <li key={name}>
            <code>{`{{${name}}}`}</code>
          </li>
        ))}
      </ul>
      <p className="hint" style={{ marginTop: 10 }}>
        They work in the welcome message below, and in the room title, item titles, item descriptions, button labels and button
        links, which you edit in the{' '}
        <Link className="link" href={`/w/${workspace.slug}/tracks/${track.id}`}>
          track editor
        </Link>
        . To get more fields, import extra properties with the audience.
      </p>

      <h2 className="section-title">Welcome message</h2>
      <form action={saveWelcomeAction} style={{ maxWidth: 560 }}>
        <input type="hidden" name="workspace" value={workspace.slug} />
        <input type="hidden" name="track" value={track.id} />
        <div className="field">
          <label className="label" htmlFor="welcome">
            Shown as a small note when the room opens. Leave empty for none.
          </label>
          <textarea
            id="welcome"
            name="welcome"
            className="textarea"
            maxLength={500}
            defaultValue={welcome}
            disabled={!canWrite}
            placeholder="Hi {{firstname|there}}, I put this together for {{company|your team}}. Start with the first item."
          />
        </div>
        {canWrite ? (
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            Save message
          </SubmitButton>
        ) : null}
      </form>
      {welcome ? (
        <dl className="meta-list" style={{ marginTop: 16 }}>
          <dt>A known contact sees</dt>
          <dd>{renderMerge(welcome, SAMPLE) || '(nothing)'}</dd>
          <dt>Anyone else sees</dt>
          <dd>{renderMerge(welcome, null) || '(nothing)'}</dd>
        </dl>
      ) : null}

      <h2 className="section-title">Preview as a contact</h2>
      {previews.length === 0 ? (
        <p className="hint">
          Once contacts have links to this track, you can open the room exactly as each of them will see it. Generate links from an{' '}
          <Link className="link" href={`/w/${workspace.slug}/audiences`}>
            audience
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="header-actions" style={{ flexWrap: 'wrap' }}>
            {previews.map((preview) => (
              <a key={preview.token} className="btn btn-sm" href={`${room}?r=${preview.token}&preview=1`} target="_blank" rel="noopener noreferrer">
                {preview.name}
              </a>
            ))}
            <a className="btn btn-sm" href={`${room}?preview=1`} target="_blank" rel="noopener noreferrer">
              Unknown visitor
            </a>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            Previews open in a new tab and are not counted as visits.
          </p>
        </>
      )}
    </div>
  );
}
