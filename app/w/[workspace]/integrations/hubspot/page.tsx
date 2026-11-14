import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { LINK_PROPERTY } from '@/lib/audience-core';
import { getHubspotStatus } from '@/lib/audiences';
import { getHubspotActivity } from '@/lib/hubspot-activity';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { connectHubspotAction, removeHubspotAction, setHubspotActivityAction } from './actions';

export const maxDuration = 30;

const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

const SCOPES = [
  ['crm.objects.contacts.read', 'read contacts and their properties'],
  ['crm.lists.read', 'read segments and who is in them'],
  ['crm.objects.contacts.write', `write each contact’s room link to the “${LINK_PROPERTY.label}” property, and log visits on the contact’s timeline`],
  ['crm.schemas.contacts.write', 'create that property the first time'],
];

export default async function HubspotPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string; saved?: string; removed?: string; activity?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error, saved, removed, activity: activitySaved } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.write')) notFound();
  const { workspace } = context;
  const [status, activity] = await Promise.all([getHubspotStatus(workspace.id), getHubspotActivity(workspace.id)]);
  const hidden = <input type="hidden" name="workspace" value={workspace.slug} />;

  return (
    <div className="page">
      <Link href={`/w/${workspace.slug}/integrations`} className="back">
        <ArrowLeft aria-hidden="true" /> Integrations
      </Link>
      <h1 className="page-title">HubSpot</h1>
      <p className="page-subtitle">
        Import contact segments as audiences, create a unique room link for each contact, and personalise rooms with contact details.
      </p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {saved ? (
        <p className="notice" role="status">
          HubSpot connected.{' '}
          <Link className="link" href={`/w/${workspace.slug}/audiences`}>
            Import a segment
          </Link>
        </p>
      ) : null}
      {removed ? (
        <p className="notice" role="status">
          HubSpot disconnected. Audiences already imported stay until you delete them.
        </p>
      ) : null}

      <h2 className="section-title">Connection</h2>
      <p style={{ marginBottom: 12 }}>
        {status.connected ? (
          <>
            <span className="badge">Connected</span> {status.portalId ? `Account ${status.portalId}, token` : 'Token'} ending <code>{status.hint}</code>
          </>
        ) : (
          <>
            <span className="badge badge-warn">Not connected</span> Paste a private app access token to connect.
          </>
        )}
      </p>
      <form action={connectHubspotAction} style={{ maxWidth: 520 }}>
        {hidden}
        <div className="field">
          <label className="label" htmlFor="token">
            {status.connected ? 'New access token' : 'Private app access token'}
          </label>
          <input id="token" name="token" type="password" className="input" required autoComplete="off" spellCheck={false} placeholder="pat-…" />
          <span className="hint">
            The token is checked with HubSpot, then stored encrypted. Nobody can read it back, including admins: it can only be
            replaced or removed.
          </span>
        </div>
        <SubmitButton className="btn btn-primary" pendingLabel="Checking token…">
          {status.connected ? 'Replace token' : 'Connect HubSpot'}
        </SubmitButton>
      </form>

      {status.connected ? (
        <>
          <h2 className="section-title" id="activity">
            Activity
          </h2>
          {activitySaved ? (
            <p className="notice" role="status">
              {activity.enabled ? 'Visits will now be logged in HubSpot.' : 'Visits are no longer logged in HubSpot.'}
            </p>
          ) : null}
          <form action={setHubspotActivityAction}>
            {hidden}
            <label className="check-row">
              <input type="checkbox" name="activity" defaultChecked={activity.enabled} />
              <span>
                <span style={{ fontWeight: 500 }}>Log room visits on the contact’s timeline in HubSpot</span>
                <span className="hint" style={{ display: 'block' }}>
                  When an imported contact opens a room from their personal link, Pipemouse adds one note to their HubSpot record and
                  keeps it up to date during the visit: which items they opened, time on each, which they engaged with, and any
                  buttons they clicked. Visitors on the plain room link are not logged, because Pipemouse can’t tell who they are.
                </span>
              </span>
            </label>
            <SubmitButton className="btn" pendingLabel="Saving…">
              Save
            </SubmitButton>
          </form>
          {activity.lastSentAt && activity.lastStatus ? (
            <p className="hint" style={{ marginTop: 8 }}>
              Last update sent {formatWhen(activity.lastSentAt)}: {activity.lastStatus}.
            </p>
          ) : null}
        </>
      ) : null}

      <h2 className="section-title">How to create the token</h2>
      <ol className="hint" style={{ margin: '0 0 0 18px', lineHeight: 1.7 }}>
        <li>In HubSpot, open Settings, then Integrations, then Private Apps (HubSpot may label these “legacy apps”).</li>
        <li>Create a private app and give it these scopes:</li>
      </ol>
      <ul className="hint" style={{ margin: '4px 0 0 36px', lineHeight: 1.7 }}>
        {SCOPES.map(([scope, why]) => (
          <li key={scope}>
            <code>{scope}</code> to {why}
          </li>
        ))}
      </ul>
      <p className="hint" style={{ marginTop: 8 }}>
        Then copy the access token and paste it above. The two write scopes are only needed if you want links or visit activity written back to HubSpot.
      </p>

      {status.connected ? (
        <>
          <h2 className="section-title">Disconnect</h2>
          <form action={removeHubspotAction}>
            {hidden}
            <SubmitButton className="btn btn-danger" pendingLabel="Removing…">
              Disconnect HubSpot
            </SubmitButton>
          </form>
        </>
      ) : null}
    </div>
  );
}
