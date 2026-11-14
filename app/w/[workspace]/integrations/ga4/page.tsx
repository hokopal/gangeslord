import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { getGa4Status } from '@/lib/ga4';
import { GA4_EVENT_LABEL, GA4_EVENT_NAME } from '@/lib/ga4-core';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { connectGa4Action, disconnectGa4Action, testGa4Action } from './actions';

const ERRORS: Record<string, string> = {
  ga4_id_invalid: 'That doesn’t look like a measurement ID. It starts with G- and is shown on the data stream in Google Analytics.',
  ga4_secret_invalid: 'That doesn’t look like a Measurement Protocol API secret. Create one on the data stream and paste its value.',
  not_allowed: 'Only workspace admins can change this.',
};
const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

export default async function Ga4Page({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error, notice } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.write')) notFound();
  const { workspace } = context;
  const status = await getGa4Status(workspace.id);
  const hidden = <input type="hidden" name="workspace" value={workspace.slug} />;

  return (
    <div className="page">
      <Link href={`/w/${workspace.slug}/integrations`} className="back">
        <ArrowLeft aria-hidden="true" /> Integrations
      </Link>
      <h1 className="page-title">Google Analytics</h1>
      <p className="page-subtitle">Send room activity to a Google Analytics 4 property, so it sits beside the rest of your site’s reporting.</p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {ERRORS[error] ?? 'Something went wrong. Please try again.'}
        </p>
      ) : null}
      {notice ? (
        <p className="notice" role="status">
          {notice}
        </p>
      ) : null}

      <h2 className="section-title">{status.connected ? `Connected to ${status.measurementId}` : 'Connect'}</h2>
      <form action={connectGa4Action} style={{ maxWidth: 480 }}>
        {hidden}
        <div className="field">
          <label className="label" htmlFor="measurementId">
            Measurement ID
          </label>
          <input id="measurementId" name="measurementId" className="input" required defaultValue={status.measurementId ?? ''} placeholder="G-XXXXXXXXXX" spellCheck={false} autoComplete="off" />
        </div>
        <div className="field">
          <label className="label" htmlFor="apiSecret">
            Measurement Protocol API secret
          </label>
          <input id="apiSecret" name="apiSecret" type="password" className="input" required placeholder={status.connected ? 'Paste a secret to replace the saved one' : ''} autoComplete="off" />
          <span className="hint">
            In Google Analytics: Admin → Data streams → your web stream → Measurement Protocol API secrets → Create. It is stored
            encrypted and never shown again.
          </span>
        </div>
        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
          {status.connected ? 'Replace' : 'Connect'}
        </SubmitButton>
      </form>

      {status.connected ? (
        <div className="row-form" style={{ marginTop: 12 }}>
          <form action={testGa4Action}>
            {hidden}
            <SubmitButton className="btn" pendingLabel="Sending…">
              Send a test event
            </SubmitButton>
          </form>
          <form action={disconnectGa4Action}>
            {hidden}
            <SubmitButton className="btn btn-danger" pendingLabel="Disconnecting…">
              Disconnect
            </SubmitButton>
          </form>
        </div>
      ) : null}

      <h2 className="section-title">What is sent</h2>
      <div className="table-wrap" style={{ maxWidth: 640 }}>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Event name in Google Analytics</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(GA4_EVENT_LABEL) as (keyof typeof GA4_EVENT_LABEL)[]).map((event) => (
              <tr key={event}>
                <td>{GA4_EVENT_LABEL[event]}</td>
                <td>
                  <code>{GA4_EVENT_NAME[event]}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ marginTop: 6 }}>
        Each event carries the room and workspace names and an anonymous visitor ID. Names, email addresses and what visitors
        write are never sent, because Google Analytics does not allow personal details.
      </p>

      {status.log.length > 0 ? (
        <>
          <h2 className="section-title">Recent activity</h2>
          <div className="table-wrap" style={{ maxWidth: 640 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Result</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {status.log.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.event}</td>
                    <td>
                      <span className={entry.ok ? 'badge' : 'badge badge-warn'}>{entry.ok ? 'Sent' : 'Failed'}</span> <span className="hint">{entry.detail}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatWhen(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
