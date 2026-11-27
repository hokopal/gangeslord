import { ArrowDown, ArrowLeft, ArrowUp, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { listAcceptances, listActionItems, type Acceptance } from '@/lib/action-plan';
import { listTemplates } from '@/lib/plan-templates';
import { planProgress } from '@/lib/action-plan-core';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';
import { addAction, applyTemplate, deleteAction, moveAction, saveAction, toggleAction } from './actions';

const fmtDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null);
const fmtWhen = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * The mutual action plan for one track: the shared checklist buyer and seller both see in the
 * room, plus the signatures collected when a buyer accepts the proposal.
 */
export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; track: string }>;
  searchParams: Promise<{ error?: string; saved?: string; applied?: string }>;
}) {
  const { workspace: slug, track: trackId } = await params;
  const { error, saved, applied } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const detail = /^[0-9a-f-]{36}$/i.test(trackId) ? await getTrackDetail(workspace.id, trackId) : null;
  if (!detail) notFound();
  const { track } = detail;
  const canWrite = can(role, 'content.write');
  const hidden = (
    <>
      <input type="hidden" name="workspace" value={workspace.slug} />
      <input type="hidden" name="track" value={track.id} />
    </>
  );

  const items = await listActionItems(track.id);
  const templates = canWrite ? await listTemplates(workspace.id) : [];
  // Only the track's creator (and people it is shared with) may read signatures; degrade gracefully otherwise.
  let acceptances: Acceptance[] = [];
  let acceptancesVisible = true;
  try {
    acceptances = await listAcceptances(track.id);
  } catch {
    acceptancesVisible = false;
  }
  const progress = planProgress(items);

  return (
    <div className="page">
      <Link href={`/w/${workspace.slug}/tracks/${track.id}`} className="back">
        <ArrowLeft aria-hidden="true" /> {track.name}
      </Link>
      <h1 className="page-title">Mutual action plan</h1>
      <p className="page-subtitle">
        The steps you and the buyer agree to, shown in the room beside the content. Buyers tick their own steps as they go; you
        see every change here. {progress.total > 0 ? `${progress.done} of ${progress.total} steps complete.` : ''}
      </p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {saved ? (
        <p className="notice" role="status">
          Saved.
        </p>
      ) : null}
      {applied !== undefined ? (
        <p className="notice" role="status">
          Added {applied} step{applied === '1' ? '' : 's'} from your plan. Edit them below for this deal.
        </p>
      ) : null}

      {progress.total > 0 ? (
        <div className="plan-progressbar" role="img" aria-label={`${progress.percent}% of steps complete`}>
          <span style={{ width: `${progress.percent}%` }} />
        </div>
      ) : null}

      <h2 className="section-title">Steps</h2>
      {items.length === 0 ? (
        <p className="hint">No steps yet. A good plan is short: who does what, by when. Start with the obvious three.</p>
      ) : (
        <ol className="plan-admin-list">
          {items.map((item, index) => (
            <li key={item.id} className="plan-admin-item" data-done={item.done || undefined}>
              <form action={saveAction} className="plan-admin-edit">
                {hidden}
                <input type="hidden" name="id" value={item.id} />
                <input name="label" className="input plan-admin-label" defaultValue={item.label} maxLength={300} required aria-label="Step" disabled={!canWrite} />
                <select name="owner" className="select" defaultValue={item.owner} aria-label="Who owns this step" disabled={!canWrite}>
                  <option value="seller">{workspace.name}</option>
                  <option value="buyer">Buyer</option>
                </select>
                <input name="due" type="date" className="input plan-admin-due" defaultValue={item.dueDate ?? ''} aria-label="Due date" disabled={!canWrite} />
                {canWrite ? (
                  <SubmitButton className="btn btn-sm" pendingLabel="Saving…">
                    Save
                  </SubmitButton>
                ) : null}
              </form>
              <div className="plan-admin-ops">
                {canWrite ? (
                  <>
                    <form action={toggleAction}>
                      {hidden}
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="done" value={item.done ? '0' : '1'} />
                      <SubmitButton className="btn btn-sm" pendingLabel="…">
                        {item.done ? 'Reopen' : 'Done'}
                      </SubmitButton>
                    </form>
                    <form action={moveAction}>
                      {hidden}
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="to" value={index - 1} />
                      <button type="submit" className="icon-button" aria-label="Move up" disabled={index === 0}>
                        <ArrowUp width={15} height={15} aria-hidden="true" />
                      </button>
                    </form>
                    <form action={moveAction}>
                      {hidden}
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="to" value={index + 1} />
                      <button type="submit" className="icon-button" aria-label="Move down" disabled={index === items.length - 1}>
                        <ArrowDown width={15} height={15} aria-hidden="true" />
                      </button>
                    </form>
                    <form action={deleteAction}>
                      {hidden}
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="icon-button" aria-label="Delete step">
                        <Trash2 width={15} height={15} aria-hidden="true" />
                      </button>
                    </form>
                  </>
                ) : null}
              </div>
              {item.done && item.doneAt ? (
                <p className="hint plan-admin-stamp">
                  Ticked by {item.doneBy === 'buyer' ? 'the buyer' : workspace.name} · {fmtWhen(item.doneAt)}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {canWrite ? (
        <form action={addAction} className="plan-admin-add">
          {hidden}
          <input name="label" className="input" placeholder="e.g. Buyer: run security review" maxLength={300} required aria-label="New step" />
          <select name="owner" className="select" defaultValue="buyer" aria-label="Who owns this step">
            <option value="buyer">Buyer</option>
            <option value="seller">{workspace.name}</option>
          </select>
          <input name="due" type="date" className="input plan-admin-due" aria-label="Due date (optional)" />
          <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
            Add step
          </SubmitButton>
        </form>
      ) : null}

      {canWrite && templates.length > 0 ? (
        <form action={applyTemplate} className="plan-admin-add" style={{ marginTop: 8 }}>
          {hidden}
          <select name="template" className="select" defaultValue="" required aria-label="Start from a plan template">
            <option value="" disabled>
              Start from a plan…
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <SubmitButton className="btn" pendingLabel="Adding…">
            Add to this track
          </SubmitButton>
        </form>
      ) : null}

      <h2 className="section-title" style={{ marginTop: 32 }}>Accept &amp; sign</h2>
      <p className="hint">
        Buyers can accept the proposal from the room. Each signature is stored with the exact statement shown, their IP and their
        browser, so there is a clear audit trail. Re-signing replaces the earlier row.
      </p>
      {!acceptancesVisible ? (
        <p className="notice">Signatures are visible to the track’s creator and the people the room is shared with.</p>
      ) : acceptances.length === 0 ? (
        <p className="hint">No signatures yet. When someone accepts in the room, it appears here and you get an alert.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Signature</th>
                <th>Accepted at</th>
              </tr>
            </thead>
            <tbody>
              {acceptances.map((acceptance) => (
                <tr key={acceptance.id}>
                  <td>{acceptance.signerName}</td>
                  <td>{acceptance.signerEmail}</td>
                  <td style={{ fontFamily: 'cursive', fontSize: 16 }}>{acceptance.typedSignature}</td>
                  <td>{fmtWhen(acceptance.acceptedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
