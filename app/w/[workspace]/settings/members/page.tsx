import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CopyButton } from '@/components/ui/CopyButton';
import { RoleSelect, roleLabel } from '@/components/ui/RoleSelect';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { listMembers, listPendingInvitations, type Invitation, type Member } from '@/lib/members';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getUser } from '@/lib/supabase/server';
import { getWorkspaceContext } from '@/lib/workspaces';
import type { User } from '@supabase/supabase-js';
import {
  changeRoleAction,
  inviteMemberAction,
  removeMemberAction,
  revokeInvitationAction,
} from '../actions';
import { JoinRequests } from './JoinRequests';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'members.manage')) notFound();
  const { workspace } = context;

  let members: Member[] | null = null;
  let invitations: Invitation[] = [];
  let me: User | null = null;
  let loadError: string | null = null;
  try {
    [members, invitations, me] = await Promise.all([
      listMembers(workspace.id),
      listPendingInvitations(workspace.id),
      getUser(),
    ]);
  } catch (err) {
    // The page must not fall over into the site-wide error screen when any one of
    // these fails (e.g. the database refusing the read). Log the real reason so it
    // shows up in the function logs, and say plainly that it could not load.
    console.error('[settings/members] failed to load', err);
    loadError = err instanceof Error && err.message ? err.message : 'unknown_error';
  }

  return (
    <div className="page">
      <Link href={`/w/${workspace.slug}/settings`} className="back">
        <ArrowLeft aria-hidden="true" /> Settings
      </Link>
      <h1 className="page-title">Members</h1>
      <p className="page-subtitle">Invite people to {workspace.name} and set what they can do.</p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}

      {loadError ? (
        <p className="notice notice-error" role="alert">
          We couldn’t load the people and invites for this workspace right now. Please try again
          in a moment; if it keeps happening, contact Pipemouse support and mention the reference
          shown below. (Reference: {loadError})
        </p>
      ) : (
        <>
          <JoinRequests workspaceId={workspace.id} workspaceSlug={workspace.slug} />

          <h2 className="section-title">Invite someone</h2>
          <form action={inviteMemberAction} className="row-form">
            <input type="hidden" name="workspace" value={workspace.slug} />
            <div className="field" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
              <label className="label" htmlFor="invite-email">
                Email
              </label>
              <input id="invite-email" name="email" type="email" className="input" required />
            </div>
            <RoleSelect defaultValue="editor" label="Role for the new member" />
            <SubmitButton className="btn btn-primary" pendingLabel="Creating…">
              Create invite link
            </SubmitButton>
          </form>
          <p className="hint" style={{ marginTop: 6 }}>
            Invites aren’t emailed yet. Copy the link and send it yourself. It works for 7 days and only for
            that email address.
          </p>

          {invitations.length > 0 ? (
            <>
              <h2 className="section-title">Pending invitations</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Expires</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.email}</td>
                        <td>{roleLabel(inv.role)}</td>
                        <td>{formatDate(inv.expiresAt)}</td>
                        <td className="actions">
                          <form action={revokeInvitationAction} style={{ display: 'inline-flex', gap: 6 }}>
                            <input type="hidden" name="workspace" value={workspace.slug} />
                            <input type="hidden" name="invitation" value={inv.id} />
                            <CopyButton path={`/invite/${inv.token}`} label="Copy invite link" />
                            <SubmitButton className="btn btn-sm btn-danger">Revoke</SubmitButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

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
                {members?.map((member) => (
                  <tr key={member.userId}>
                    <td>
                      {member.email}
                      {member.userId === me?.id ? <span className="hint"> (you)</span> : null}
                    </td>
                    <td>
                      <form action={changeRoleAction}>
                        <input type="hidden" name="workspace" value={workspace.slug} />
                        <input type="hidden" name="user" value={member.userId} />
                        <RoleSelect
                          defaultValue={member.role}
                          autoSubmit
                          label={`Role for ${member.email}`}
                        />
                      </form>
                    </td>
                    <td>{formatDate(member.joinedAt)}</td>
                    <td className="actions">
                      <form action={removeMemberAction}>
                        <input type="hidden" name="workspace" value={workspace.slug} />
                        <input type="hidden" name="user" value={member.userId} />
                        <SubmitButton className="btn btn-sm btn-danger">
                          {member.userId === me?.id ? 'Leave' : 'Remove'}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
