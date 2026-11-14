import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { listIntegrations } from '@/lib/integrations';
import { ALERT_EVENTS, EVENT_LABEL, INTEGRATION_INFO, isIntegrationKind } from '@/lib/integrations-core';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { removeIntegrationAction, saveIntegrationAction, testIntegrationAction } from './actions';

export const maxDuration = 30;

const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

export default async function IntegrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; kind: string }>;
  searchParams: Promise<{ error?: string; saved?: string; removed?: string; test?: string }>;
}) {
  const { workspace: slug, kind } = await params;
  const { error, saved, removed, test } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.write') || !isIntegrationKind(kind)) notFound();
  const { workspace } = context;
  const status = (await listIntegrations(workspace.id)).find((item) => item.kind === kind);
  if (!status) notFound();
  const info = INTEGRATION_INFO[kind];
  const testResult = (test ?? '').slice(0, 120);
  const testFailed = testResult.startsWith('Failed');
  const hidden = (
    <>
      <input type="hidden" name="workspace" value={workspace.slug} />
      <input type="hidden" name="kind" value={kind} />
    </>
  );
  // A new connection starts with every alert switched on.
  const checked = (event: (typeof ALERT_EVENTS)[number]) => (status.configured ? status.events.includes(event) : true);

  return (
    <div className="page">
      <Link href={`/w/${workspace.slug}/integrations`} className="back">
        <ArrowLeft aria-hidden="true" /> Integrations
      </Link>
      <h1 className="page-title">{info.name}</h1>
      <p className="page-subtitle">{info.summary}</p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {saved ? (
        <p className="notice" role="status">
          Saved. Send a test to check it arrives.
        </p>
      ) : null}
      {removed ? (
        <p className="notice" role="status">
          Connection removed.
        </p>
      ) : null}
      {testResult ? (
        <p className={testFailed ? 'notice notice-error' : 'notice'} role={testFailed ? 'alert' : 'status'}>
          Test message: {testResult}.
        </p>
      ) : null}

      <h2 className="section-title">Connection</h2>
      <p style={{ marginBottom: 12 }}>
        {status.configured ? (
          <>
            <span className="badge">Connected</span> <code>{status.hint}</code>
          </>
        ) : (
          <>
            <span className="badge badge-warn">Not connected</span> Add the address below to connect.
          </>
        )}
      </p>
      <form action={saveIntegrationAction} style={{ maxWidth: 520 }}>
        {hidden}
        <div className="field">
          <label className="label" htmlFor="url">
            {status.configured ? `New ${info.urlLabel.toLowerCase()} (leave blank to keep the current one)` : info.urlLabel}
          </label>
          <input
            id="url"
            name="url"
            type="password"
            className="input"
            required={!status.configured}
            autoComplete="off"
            spellCheck={false}
            placeholder={info.placeholder}
          />
          <span className="hint">{info.urlHelp} The address is stored encrypted and can’t be read back, only replaced or removed.</span>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
          <legend className="label" style={{ marginBottom: 4 }}>
            Send an alert when
          </legend>
          {ALERT_EVENTS.map((event) => (
            <label key={event} className="check-row">
              <input type="checkbox" name="events" value={event} defaultChecked={checked(event)} />
              <span>
                <span style={{ fontWeight: 500 }}>{EVENT_LABEL[event].title}</span>
                <span className="hint" style={{ display: 'block' }}>
                  {EVENT_LABEL[event].detail}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
          {status.configured ? 'Save changes' : 'Connect'}
        </SubmitButton>
      </form>

      {status.configured ? (
        <>
          <h2 className="section-title">Test and status</h2>
          <p className="hint" style={{ marginBottom: 12 }}>
            {status.lastSentAt
              ? `Last delivery ${formatWhen(status.lastSentAt)}: ${status.lastStatus ?? 'unknown'}.`
              : 'Nothing has been sent through this connection yet.'}
          </p>
          <div className="header-actions">
            <form action={testIntegrationAction}>
              {hidden}
              <SubmitButton className="btn" pendingLabel="Sending…">
                Send a test message
              </SubmitButton>
            </form>
            <form action={removeIntegrationAction}>
              {hidden}
              <SubmitButton className="btn btn-danger" pendingLabel="Removing…">
                Remove connection
              </SubmitButton>
            </form>
          </div>
          {kind === 'webhook' ? (
            <p className="hint" style={{ marginTop: 16 }}>
              Each alert is a JSON object with <code>event</code> (link_opened, binge, cta_click or test), <code>occurred_at</code>,{' '}
              <code>workspace</code>, <code>track</code>, <code>visitor</code>, <code>account</code>, <code>button</code> and{' '}
              <code>session_url</code>.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
