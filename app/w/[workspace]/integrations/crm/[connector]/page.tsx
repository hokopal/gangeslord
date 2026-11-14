import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { getCrmStatus } from '@/lib/crm-connectors';
import { CRM_INFO, isCrmKind } from '@/lib/crm-core';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { connectCrmAction, disconnectCrmAction, testCrmAction } from './actions';

const ERRORS: Record<string, string> = {
  crm_settings_invalid: 'One of those values doesn’t look right. Copy each one again, with no spaces before or after.',
  salesforce_domain_invalid: 'That isn’t a Salesforce My Domain address. It ends in .my.salesforce.com, for example yourcompany.my.salesforce.com.',
  not_allowed: 'Only workspace admins can change this.',
};
const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

export default async function CrmConnectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; connector: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { workspace: slug, connector } = await params;
  const { error, notice } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.write') || !isCrmKind(connector)) notFound();
  const { workspace } = context;
  const info = CRM_INFO[connector];
  const status = await getCrmStatus(workspace.id, connector);
  const hidden = (
    <>
      <input type="hidden" name="workspace" value={workspace.slug} />
      <input type="hidden" name="connector" value={connector} />
    </>
  );

  return (
    <div className="page">
      <Link href={`/w/${workspace.slug}/integrations`} className="back">
        <ArrowLeft aria-hidden="true" /> Integrations
      </Link>
      <h1 className="page-title">{info.name}</h1>
      <p className="page-subtitle">{info.summary}</p>
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

      <h2 className="section-title">{status.connected ? `Connected (${status.hint})` : 'Connect with your own credentials'}</h2>
      <form action={connectCrmAction} style={{ maxWidth: 480 }}>
        {hidden}
        {info.fields.map((field) => (
          <div className="field" key={field.key}>
            <label className="label" htmlFor={field.key}>
              {field.label}
            </label>
            <input id={field.key} name={field.key} type={field.secret ? 'password' : 'text'} className="input" required placeholder={field.placeholder} spellCheck={false} autoComplete="off" />
            <span className="hint">{field.help}</span>
          </div>
        ))}
        <p className="hint">These are stored encrypted and never shown again. Pipemouse checks them as soon as you save.</p>
        <SubmitButton className="btn btn-primary" pendingLabel="Saving and checking…">
          {status.connected ? 'Replace' : 'Connect'}
        </SubmitButton>
      </form>

      {status.connected ? (
        <div className="row-form" style={{ marginTop: 12 }}>
          <form action={testCrmAction}>
            {hidden}
            <SubmitButton className="btn" pendingLabel="Checking…">
              Check the connection
            </SubmitButton>
          </form>
          <form action={disconnectCrmAction}>
            {hidden}
            <SubmitButton className="btn btn-danger" pendingLabel="Disconnecting…">
              Disconnect
            </SubmitButton>
          </form>
        </div>
      ) : null}

      <h2 className="section-title">What it does</h2>
      <ul className="hint" style={{ paddingLeft: 18, listStyle: 'disc', display: 'grid', gap: 4 }}>
        {info.does.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="hint" style={{ marginTop: 8 }}>
        It applies to every room in this workspace that has a lead form. Answers to your own questions are not sent.
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
                      <span className={entry.ok ? 'badge' : 'badge badge-warn'}>{entry.ok ? 'Done' : 'Failed'}</span> <span className="hint">{entry.detail}</span>
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
