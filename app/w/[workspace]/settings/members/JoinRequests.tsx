import { RoleSelect } from '@/components/ui/RoleSelect';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { listJoinRequests } from '@/lib/join-requests';
import { decideJoinRequestAction } from './request-actions';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** People from the company's email domain who have asked to join this workspace. Shows nothing when there are none, or when the read fails — this section must never take the whole page down. */
export async function JoinRequests({ workspaceId, workspaceSlug }: { workspaceId: string; workspaceSlug: string }) {
  let requests;
  try {
    requests = await listJoinRequests(workspaceId);
  } catch (err) {
    console.error('[settings/members] failed to load join requests', err);
    return null;
  }
  if (requests.length === 0) return null;
  return (
    <>
      <h2 className="section-title">Requests to join</h2>
      <p className="hint" style={{ marginBottom: 8 }}>
        These people signed up with your company’s email domain and asked to join. Choose a role and approve, or decline.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Asked</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.email}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(request.createdAt)}</td>
                <td className="actions">
                  <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <form action={decideJoinRequestAction} style={{ display: 'inline-flex', gap: 6 }}>
                      <input type="hidden" name="workspace" value={workspaceSlug} />
                      <input type="hidden" name="request" value={request.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <RoleSelect defaultValue="editor" label={`Role for ${request.email}`} />
                      <SubmitButton className="btn btn-sm btn-primary" pendingLabel="Approving…">
                        Approve
                      </SubmitButton>
                    </form>
                    <form action={decideJoinRequestAction}>
                      <input type="hidden" name="workspace" value={workspaceSlug} />
                      <input type="hidden" name="request" value={request.id} />
                      <input type="hidden" name="decision" value="decline" />
                      <SubmitButton className="btn btn-sm btn-danger" pendingLabel="Declining…">
                        Decline
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
