import { Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/shell/EmptyState';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { findSegments, getHubspotStatus, listAudiences } from '@/lib/audiences';
import type { Segment } from '@/lib/hubspot';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { importSegmentAction } from './actions';

// Importing a segment reads every contact from HubSpot, which can take a while.
export const maxDuration = 60;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function AudiencesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ q?: string; error?: string; deleted?: string }>;
}) {
  const { workspace: slug } = await params;
  const { q, error, deleted } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const canWrite = can(role, 'content.write');
  const [audiences, hubspot] = await Promise.all([listAudiences(workspace.id), getHubspotStatus(workspace.id)]);
  const base = `/w/${workspace.slug}/audiences`;

  let segments: Segment[] | null = null;
  let searchError = '';
  if (canWrite && hubspot.connected && q !== undefined) {
    try {
      segments = await findSegments(workspace.id, q);
    } catch (e) {
      searchError = e instanceof Error ? e.message : 'hubspot_failed';
    }
  }

  return (
    <div className="page page-wide">
      <h1 className="page-title">Audiences</h1>
      <p className="page-subtitle">Groups of contacts imported from HubSpot. Give each contact their own link to a room.</p>
      {error || searchError ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error || searchError)}
        </p>
      ) : null}
      {deleted ? (
        <p className="notice" role="status">
          Audience deleted, along with its contacts and their links.
        </p>
      ) : null}

      {canWrite ? (
        hubspot.connected ? (
          <>
            <form method="get" action={base} className="row-form">
              <div className="field" style={{ flex: 1, minWidth: 220, maxWidth: 420, marginBottom: 0 }}>
                <label className="label" htmlFor="segment-search">
                  Import a HubSpot segment
                </label>
                <input id="segment-search" name="q" className="input" defaultValue={q ?? ''} placeholder="Search segments by name" />
              </div>
              <button type="submit" className="btn">
                Search HubSpot
              </button>
            </form>
            {segments ? (
              segments.length === 0 ? (
                <p className="hint" style={{ marginTop: 12 }}>
                  No contact segments match. Try a different name, or leave the box empty to list the first 25.
                </p>
              ) : (
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Segment</th>
                        <th className="num">Contacts</th>
                        <th>Extra properties to import</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {segments.map((segment) => (
                        <tr key={segment.id}>
                          <td>{segment.name}</td>
                          <td className="num">{segment.size ?? ''}</td>
                          <td colSpan={2}>
                            <form action={importSegmentAction} style={{ display: 'flex', gap: 8 }}>
                              <input type="hidden" name="workspace" value={workspace.slug} />
                              <input type="hidden" name="segment" value={segment.id} />
                              <input type="hidden" name="name" value={segment.name} />
                              <input type="hidden" name="q" value={q ?? ''} />
                              <input name="properties" className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Optional, e.g. industry, city" aria-label={`Extra properties for ${segment.name}`} />
                              <SubmitButton className="btn btn-primary" pendingLabel="Importing…">
                                Import
                              </SubmitButton>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
            <p className="hint" style={{ marginTop: 8 }}>
              First name, last name, email, company and job title are always imported. Add other HubSpot properties by their internal
              name to use them as merge fields. Up to 5,000 contacts per segment.
            </p>
          </>
        ) : (
          <div className="notice">
            HubSpot isn’t connected yet.{' '}
            {can(role, 'settings.write') ? (
              <Link className="link" href={`/w/${workspace.slug}/integrations/hubspot`}>
                Connect HubSpot
              </Link>
            ) : (
              'Ask a workspace admin to connect it under Integrations.'
            )}
          </div>
        )
      ) : null}

      {audiences.length === 0 ? (
        <EmptyState icon={<Users aria-hidden="true" />} title="No audiences yet" body="Import a HubSpot segment to create one." />
      ) : (
        <div className="table-wrap" style={{ marginTop: 24 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Audience</th>
                <th className="num">Contacts</th>
                <th>Last synced</th>
              </tr>
            </thead>
            <tbody>
              {audiences.map((audience) => (
                <tr key={audience.id}>
                  <td>
                    <Link href={`${base}/${audience.id}`} className="asset-row">
                      <span className="asset-title truncate">{audience.name}</span>
                    </Link>
                  </td>
                  <td className="num">{audience.contactCount}</td>
                  <td>{audience.syncedAt ? formatDate(audience.syncedAt) : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
