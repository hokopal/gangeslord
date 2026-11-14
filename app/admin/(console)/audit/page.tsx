import { redirect } from 'next/navigation';
import { getPlatformAdmin, listAudit } from '@/lib/platform';

const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

const ACTION: Record<string, string> = {
  'workspace.suspend': 'Suspended workspace',
  'workspace.restore': 'Restored workspace',
  'workspace.delete': 'Deleted workspace',
  'member.add': 'Added member',
  'member.remove': 'Removed member',
  'member.role': 'Changed member role',
};

export default async function AdminAuditPage() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/admin/login');
  const entries = await listAudit(admin);

  return (
    <div className="page page-wide">
      <h1 className="page-title">Audit log</h1>
      <p className="page-subtitle">Every change made from this console, newest first.</p>
      {entries.length === 0 ? (
        <p className="hint">Nothing has been changed from the admin console yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Workspace</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatWhen(entry.createdAt)}</td>
                  <td>{entry.adminEmail}</td>
                  <td>{ACTION[entry.action] ?? entry.action}</td>
                  <td>{entry.workspaceName ?? ''}</td>
                  <td>
                    {Object.entries(entry.detail)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
