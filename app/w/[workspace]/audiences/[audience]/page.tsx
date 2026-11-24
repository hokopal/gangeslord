import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { DEFAULT_PROPERTIES, LINK_PROPERTY } from '@/lib/audience-core';
import { getAudience, getHubspotStatus, linkCounts } from '@/lib/audiences';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { listTracks } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';
import { deleteAudienceAction, generateLinksAction, importSegmentAction, writeLinksAction } from '../actions';

export const maxDuration = 60;

const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

export default async function AudiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; audience: string }>;
  searchParams: Promise<{ error?: string; synced?: string; links?: string; written?: string }>;
}) {
  const { workspace: slug, audience: audienceId } = await params;
  const { error, synced, links, written } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const found = /^[0-9a-f-]{36}$/.test(audienceId) ? await getAudience(workspace.id, audienceId) : null;
  if (!found) notFound();
  const { audience, contacts } = found;
  const canWrite = can(role, 'content.write');
  const canDelete = can(role, 'content.delete');
  const [tracks, hubspot] = await Promise.all([listTracks(workspace.id), getHubspotStatus(workspace.id)]);
  const counts = await linkCounts(workspace.id, audience.id, tracks.map((t) => t.id));
  const linked = tracks.filter((t) => (counts[t.id] ?? 0) > 0);
  const extra = audience.properties.filter((p) => !(DEFAULT_PROPERTIES as readonly string[]).includes(p));
  const hidden = (
    <>
      <input type="hidden" name="workspace" value={workspace.slug} />
      <input type="hidden" name="audience" value={audience.id} />
    </>
  );

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/audiences`} className="back">
        <ArrowLeft aria-hidden="true" /> Audiences
      </Link>
      <div className="header-row">
        <div>
          <h1 className="page-title">{audience.name}</h1>
          <p className="page-subtitle">
            {audience.contactCount} contact{audience.contactCount === 1 ? '' : 's'} from HubSpot
            {audience.syncedAt ? `, last synced ${formatWhen(audience.syncedAt)}` : ''}.
          </p>
        </div>
        {canWrite ? (
          <div className="header-actions">
            <form action={importSegmentAction}>
              <input type="hidden" name="workspace" value={workspace.slug} />
              <input type="hidden" name="segment" value={audience.externalId} />
              <input type="hidden" name="name" value={audience.name} />
              <input type="hidden" name="properties" value={extra.join(',')} />
              <SubmitButton className="btn" pendingLabel="Syncing…">
                Sync again
              </SubmitButton>
            </form>
            {canDelete ? (
              <form action={deleteAudienceAction}>
                {hidden}
                <SubmitButton className="btn btn-danger" pendingLabel="Deleting…">
                  Delete audience
                </SubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {synced ? (
        <p className="notice" role="status">
          Synced with HubSpot. Next, generate links for a track.
        </p>
      ) : null}
      {links ? (
        <p className="notice" role="status">
          Every contact in this audience now has a link to that track ({Number(links) || 0} contacts).
        </p>
      ) : null}
      {written ? (
        <p className="notice" role="status">
          Wrote {Number(written) || 0} links to the “{LINK_PROPERTY.label}” contact property in HubSpot. Use it as a personalisation
          token in your HubSpot emails.
        </p>
      ) : null}

      <h2 className="section-title" id="links">
        Links
      </h2>
      {canWrite ? (
        tracks.length === 0 ? (
          <p className="hint">Create a track first, then come back to generate links for it.</p>
        ) : (
          <form action={generateLinksAction} className="row-form">
            {hidden}
            <div className="field" style={{ marginBottom: 0, minWidth: 240 }}>
              <label className="label" htmlFor="track">
                Create a unique link for every contact, to this track
              </label>
              <select id="track" name="track" className="select" required>
                {tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                    {track.status === 'published' ? '' : ' (draft)'}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton className="btn btn-primary" pendingLabel="Generating…">
              Generate links
            </SubmitButton>
          </form>
        )
      ) : null}
      {linked.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Track</th>
                <th className="num">Contacts with a link</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {linked.map((track) => (
                <tr key={track.id}>
                  <td>
                    {track.name}{' '}
                    {track.status === 'published' ? null : <span className="badge badge-warn">Draft: links won’t open until published</span>}
                  </td>
                  <td className="num">{counts[track.id]}</td>
                  <td className="actions">
                    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <a className="btn btn-sm" href={`/w/${workspace.slug}/audiences/${audience.id}/links?track=${track.id}`}>
                        Download CSV
                      </a>
                      {canWrite && hubspot.connected ? (
                        <form action={writeLinksAction}>
                          {hidden}
                          <input type="hidden" name="track" value={track.id} />
                          <SubmitButton className="btn btn-sm" pendingLabel="Writing…">
                            Write to HubSpot
                          </SubmitButton>
                        </form>
                      ) : null}
                      <Link className="btn btn-sm" href={`/w/${workspace.slug}/tracks/${track.id}/personalize`}>
                        Personalise
                      </Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="hint" style={{ marginTop: 8 }}>
        “Write to HubSpot” saves each contact’s link in the “{LINK_PROPERTY.label}” contact property. That property holds one link, so
        writing links for another track replaces it.
      </p>

      <h2 className="section-title">Contacts</h2>
      {contacts.length === 0 ? (
        <p className="hint">This segment has no contacts.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>{contact.name}</td>
                    <td>{contact.email ?? ''}</td>
                    <td>{contact.company ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {audience.contactCount > contacts.length ? (
            <p className="hint" style={{ marginTop: 8 }}>
              Showing the first {contacts.length} of {audience.contactCount}.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
