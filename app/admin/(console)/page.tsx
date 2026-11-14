import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Stat } from '@/components/ui/Stat';
import { getPlatformAdmin, platformOverview } from '@/lib/platform';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const INTEGRATION_LABEL: Record<string, string> = { ai: 'AI', slack: 'Slack', webhook: 'Webhook', hubspot: 'HubSpot' };

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ q?: string; done?: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/admin/login');
  const { q, done } = await searchParams;
  const { workspaces, users } = await platformOverview(admin);
  const needle = (q ?? '').trim().toLowerCase();
  const shown = needle
    ? workspaces.filter((w) => [w.name, w.slug, ...w.adminEmails].some((value) => value.toLowerCase().includes(needle)))
    : workspaces;
  const sum = (pick: (w: (typeof workspaces)[number]) => number) => workspaces.reduce((total, w) => total + pick(w), 0);

  return (
    <div className="page page-wide">
      <h1 className="page-title">Workspaces</h1>
      <p className="page-subtitle">Every workspace on Pipemouse. Open one to manage its members, suspend it or delete it.</p>
      {done === 'deleted' ? (
        <p className="notice" role="status">
          Workspace deleted.
        </p>
      ) : null}

      <div className="stats">
        <Stat label="Workspaces" value={workspaces.length} note={`${workspaces.filter((w) => w.suspendedAt).length} suspended`} />
        <Stat label="People" value={users} note="who have signed in" />
        <Stat label="Tracks" value={sum((w) => w.tracks)} note={`${sum((w) => w.publishedTracks)} published`} />
        <Stat label="Library items" value={sum((w) => w.assets)} />
        <Stat label="Room visits" value={sum((w) => w.visits30d)} note="last 30 days" />
      </div>

      <form method="get" action="/admin" className="toolbar">
        <input name="q" className="input" style={{ maxWidth: 320 }} placeholder="Search by name, address or admin email" aria-label="Search workspaces" defaultValue={q ?? ''} />
        <button type="submit" className="btn">
          Search
        </button>
        {needle ? (
          <Link href="/admin" className="btn btn-ghost">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Admins</th>
              <th className="num">Members</th>
              <th className="num">Tracks</th>
              <th className="num">Visits, 30 days</th>
              <th>Connected</th>
              <th>Last visit</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((w) => (
              <tr key={w.id}>
                <td>
                  <Link href={`/admin/workspaces/${w.id}`} className="asset-row">
                    <span className="asset-title truncate">{w.name}</span>
                  </Link>
                  <span className="hint">{w.slug}</span>
                </td>
                <td style={{ maxWidth: 220 }}>
                  <span className="truncate" style={{ display: 'block' }}>
                    {w.adminEmails.join(', ') || 'None'}
                  </span>
                </td>
                <td className="num">{w.members}</td>
                <td className="num">
                  {w.publishedTracks} / {w.tracks}
                </td>
                <td className="num">{w.visits30d}</td>
                <td>{w.integrations.map((k) => INTEGRATION_LABEL[k] ?? k).join(', ')}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{w.lastVisitAt ? formatDate(w.lastVisitAt) : ''}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(w.createdAt)}</td>
                <td>
                  <span className={w.suspendedAt ? 'badge badge-warn' : 'badge'}>{w.suspendedAt ? 'Suspended' : 'Active'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 ? <p className="hint">No workspaces match.</p> : null}
    </div>
  );
}
