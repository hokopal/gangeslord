import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Brand } from '@/components/ui/Brand';
import { roleLabel } from '@/components/ui/RoleSelect';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { listMyInvitations, listSuggestedWorkspaces } from '@/lib/join-requests';
import { errorMessage } from '@/lib/messages';
import { getUser } from '@/lib/supabase/server';
import { createWorkspaceAction, requestToJoinAction } from './actions';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; requested?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?next=/onboarding');
  const { error, requested } = await searchParams;
  const [invitations, suggestions] = await Promise.all([listMyInvitations(), listSuggestedWorkspaces()]);
  const company = (user.email ?? '').split('@')[1] ?? '';
  const hasCompanyOption = invitations.length > 0 || suggestions.length > 0;

  return (
    <main className="center">
      <div className="card" style={{ maxWidth: 440 }}>
        <Brand />
        <h1>{hasCompanyOption ? 'Join your team, or start fresh' : 'Create your workspace'}</h1>
        <p className="sub">
          {hasCompanyOption
            ? 'Joining your company’s workspace keeps everyone’s content, rooms and analytics in one place.'
            : 'A workspace holds your team’s content, rooms and analytics.'}
        </p>
        {error ? (
          <p className="notice notice-error" role="alert">
            {errorMessage(error)}
          </p>
        ) : null}
        {requested ? (
          <p className="notice" role="status">
            Request sent. An admin of that workspace needs to approve it; sign in again once they have.
          </p>
        ) : null}

        {invitations.length > 0 ? (
          <>
            <h2 className="section-title" style={{ marginTop: 8 }}>
              You’ve been invited
            </h2>
            <ul className="join-list">
              {invitations.map((invitation) => (
                <li key={invitation.token}>
                  <span>
                    <strong>{invitation.workspaceName}</strong>
                    <span className="hint"> as {roleLabel(invitation.role)}</span>
                  </span>
                  <Link className="btn btn-primary btn-sm" href={`/invite/${invitation.token}`}>
                    Accept
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {suggestions.length > 0 ? (
          <>
            <h2 className="section-title" style={{ marginTop: 8 }}>
              Already on Pipemouse at {company}
            </h2>
            <ul className="join-list">
              {suggestions.map((workspace) => (
                <li key={workspace.id}>
                  <span>
                    <strong>{workspace.name}</strong>
                    <span className="hint">
                      {' '}
                      {workspace.members} {workspace.members === 1 ? 'member' : 'members'}
                    </span>
                  </span>
                  {workspace.requestStatus === 'pending' ? (
                    <span className="badge">Request sent</span>
                  ) : workspace.requestStatus === 'declined' ? (
                    <span className="badge badge-warn">Not approved</span>
                  ) : (
                    <form action={requestToJoinAction}>
                      <input type="hidden" name="workspace" value={workspace.id} />
                      <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Sending…">
                        Ask to join
                      </SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {hasCompanyOption ? <div className="divider">or create a new workspace</div> : null}
        <form action={createWorkspaceAction}>
          <div className="field">
            <label className="label" htmlFor="name">
              Workspace name
            </label>
            <input id="name" name="name" className="input" required maxLength={80} autoFocus={!hasCompanyOption} />
          </div>
          <SubmitButton className={hasCompanyOption ? 'btn btn-block' : 'btn btn-primary btn-block'} pendingLabel="Creating…">
            Create workspace
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
