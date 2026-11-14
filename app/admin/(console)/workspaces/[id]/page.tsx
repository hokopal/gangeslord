import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RoleSelect } from '@/components/ui/RoleSelect';
import { Stat } from '@/components/ui/Stat';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { errorMessage } from '@/lib/messages';
import { getPlatformAdmin, platformWorkspace } from '@/lib/platform';
import { addMemberAction, deleteWorkspaceAction, memberRoleAction, removeMemberAction, restoreAction, suspendAction } from '../../actions';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const DONE: Record<string, string> = {
  suspended: 'Workspace suspended. Its members are locked out and its rooms are offline.',
  restored: 'Workspace restored.',
  role: 'Role updated.',
  removed: 'Member removed.',
  added: 'Member added.',
};

export default async function AdminWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/admin/login');
  const { id } = await params;
  const { error, done } = await searchParams;
  const found = /^[0-9a-f-]{36}$/.test(id) ? await platformWorkspace(admin, id) : null;
  if (!found) notFound();
  const { workspace, members } = found;
  const hidden = <input type="hidden" name="workspace" value={workspace.id} />;

  return (
    <div className="page page-wide">
      <Link href="/admin" className="back">
        <ArrowLeft aria-hidden="true" /> Workspaces
      </Link>
      <div className="header-row">
        <div>
          <h1 className="page-title">{workspace.name}</h1>
          <p className="page-subtitle">
            <span className={workspace.suspendedAt ? 'badge badge-warn' : 'badge'}>{workspace.suspendedAt ? 'Suspended' : 'Active'}</span>{' '}
            Address <code>{workspace.slug}</code>, created {formatDate(workspace.createdAt)}
            {workspace.suspendedAt ? `, suspended ${formatDate(workspace.suspendedAt)}` : ''}.
          </p>
        </div>
        <div className="header-actions">
          <form action={workspace.suspendedAt ? restoreAction : suspendAction}>
            {hidden}
            <SubmitButton className={workspace.suspendedAt ? 'btn btn-primary' : 'btn btn-danger'} pendingLabel="Working…">
              {workspace.suspendedAt ? 'Restore workspace' : 'Suspend workspace'}
            </SubmitButton>
          </form>
        </div>
      </div>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {done && DONE[done] ? (
        <p className="notice" role="status">
          {DONE[done]}
        </p>
      ) : null}

      <div className="stats">
        <Stat label="Members" value={workspace.members} />
        <Stat label="Tracks" value={workspace.tracks} note={`${workspace.publishedTracks} published`} />
        <Stat label="Library items" value={workspace.assets} />
        <Stat label="Room visits" value={workspace.visits30d} note="last 30 days" />
        <Stat label="Connected" value={workspace.integrations.length} note={workspace.integrations.join(', ') || 'nothing'} />
      </div>

      <h2 className="section-title">Members</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId}>
                <td>{member.email}</td>
                <td>
                  <form action={memberRoleAction}>
                    {hidden}
                    <input type="hidden" name="user" value={member.userId} />
                    <RoleSelect defaultValue={member.role} autoSubmit label={`Role for ${member.email}`} />
                  </form>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(member.joinedAt)}</td>
                <td className="actions">
                  <form action={removeMemberAction}>
                    {hidden}
                    <input type="hidden" name="user" value={member.userId} />
                    <SubmitButton className="btn btn-sm btn-danger" pendingLabel="Removing…">
                      Remove
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={addMemberAction} className="row-form" style={{ marginTop: 16 }}>
        {hidden}
        <div className="field" style={{ flex: 1, minWidth: 220, maxWidth: 360, marginBottom: 0 }}>
          <label className="label" htmlFor="member-email">
            Add a member by email
          </label>
          <input id="member-email" name="email" type="email" className="input" required placeholder="person@company.com" />
        </div>
        <RoleSelect defaultValue="admin" label="Role for the new member" />
        <SubmitButton className="btn" pendingLabel="Adding…">
          Add member
        </SubmitButton>
      </form>
      <p className="hint" style={{ marginTop: 6 }}>
        The person must have signed in to Pipemouse at least once. A workspace always keeps at least one admin.
      </p>

      <h2 className="section-title">Delete workspace</h2>
      <p className="hint" style={{ marginBottom: 8 }}>
        This permanently deletes the workspace with its library, tracks, audiences, analytics and connections. It cannot be undone.
        To confirm, type the workspace’s address: <code>{workspace.slug}</code>
      </p>
      <form action={deleteWorkspaceAction} className="row-form">
        {hidden}
        <input name="confirm" className="input" style={{ maxWidth: 260 }} required autoComplete="off" aria-label="Type the workspace address to confirm" />
        <SubmitButton className="btn btn-danger" pendingLabel="Deleting…">
          Delete permanently
        </SubmitButton>
      </form>
    </div>
  );
}
