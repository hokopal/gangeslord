import { ArrowDown, ArrowUp, ListChecks, Trash2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { errorMessage } from '@/lib/messages';
import { listTemplates } from '@/lib/plan-templates';
import { listTracks } from '@/lib/tracks';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { addStep, applyPlan, createPlan, deletePlan, deleteStep, moveStep, renamePlan, saveStep } from './actions';

/**
 * Reusable mutual-action-plan templates. The workspace curates a handful of named plans;
 * each one can be applied to any track, where the copied steps are edited freely per deal.
 */
export default async function PlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error, saved } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const canWrite = can(role, 'content.write');
  const hidden = <input type="hidden" name="workspace" value={workspace.slug} />;

  const [templates, tracks] = await Promise.all([listTemplates(workspace.id), listTracks(workspace.id)]);
  const trackOptions = tracks.map((track) => ({ id: track.id, label: `${track.name}${track.status === 'published' ? ' · published' : ''}` }));

  return (
    <div className="page">
      <h1 className="page-title">Plans</h1>
      <p className="page-subtitle">
        Named, reusable mutual action plans. Apply one to a track and the steps are copied in, ready to edit for that deal.
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

      {canWrite ? (
        <form action={createPlan} className="plan-admin-add">
          {hidden}
          <input name="name" className="input" placeholder="e.g. Enterprise evaluation" maxLength={120} required aria-label="New plan name" />
          <SubmitButton className="btn btn-primary" pendingLabel="Creating…">
            Create plan
          </SubmitButton>
        </form>
      ) : null}

      {templates.length === 0 ? (
        <p className="hint" style={{ marginTop: 16 }}>
          No plans yet. A good plan is short: who does what, by when, starting with the obvious three steps.
        </p>
      ) : (
        templates.map((template) => (
          <section key={template.id} className="plan-template" aria-labelledby={`template-${template.id}`}>
            <div className="plan-template-head">
              <ListChecks size={17} aria-hidden="true" />
              {canWrite ? (
                <form action={renamePlan} className="plan-template-rename">
                  {hidden}
                  <input type="hidden" name="id" value={template.id} />
                  <input name="name" className="input" defaultValue={template.name} maxLength={120} required aria-label="Plan name" />
                  <SubmitButton className="btn btn-sm" pendingLabel="Saving…">
                    Rename
                  </SubmitButton>
                </form>
              ) : (
                <h2 id={`template-${template.id}`} className="plan-template-name">
                  {template.name}
                </h2>
              )}
              {canWrite ? (
                <form action={deletePlan}>
                  {hidden}
                  <input type="hidden" name="id" value={template.id} />
                  <button type="submit" className="icon-button" aria-label="Delete plan" title="Delete plan">
                    <Trash2 width={15} height={15} aria-hidden="true" />
                  </button>
                </form>
              ) : null}
            </div>

            {template.items.length > 0 ? (
              <ol className="plan-admin-list">
                {template.items.map((item, index) => (
                  <li key={item.id} className="plan-admin-item">
                    <form action={saveStep} className="plan-admin-edit">
                      {hidden}
                      <input type="hidden" name="template" value={template.id} />
                      <input type="hidden" name="id" value={item.id} />
                      <input name="label" className="input plan-admin-label" defaultValue={item.label} maxLength={300} required aria-label="Step" disabled={!canWrite} />
                      <select name="owner" className="select" defaultValue={item.owner} aria-label="Who owns this step" disabled={!canWrite}>
                        <option value="buyer">Buyer</option>
                        <option value="seller">{workspace.name}</option>
                      </select>
                      {canWrite ? (
                        <SubmitButton className="btn btn-sm" pendingLabel="Saving…">
                          Save
                        </SubmitButton>
                      ) : null}
                    </form>
                    <div className="plan-admin-ops">
                      {canWrite ? (
                        <>
                          <form action={moveStep}>
                            {hidden}
                            <input type="hidden" name="template" value={template.id} />
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="to" value={index - 1} />
                            <button type="submit" className="icon-button" aria-label="Move up" disabled={index === 0}>
                              <ArrowUp width={15} height={15} aria-hidden="true" />
                            </button>
                          </form>
                          <form action={moveStep}>
                            {hidden}
                            <input type="hidden" name="template" value={template.id} />
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="to" value={index + 1} />
                            <button type="submit" className="icon-button" aria-label="Move down" disabled={index === template.items.length - 1}>
                              <ArrowDown width={15} height={15} aria-hidden="true" />
                            </button>
                          </form>
                          <form action={deleteStep}>
                            {hidden}
                            <input type="hidden" name="template" value={template.id} />
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className="icon-button" aria-label="Delete step">
                              <Trash2 width={15} height={15} aria-hidden="true" />
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="hint">No steps yet.</p>
            )}

            {canWrite ? (
              <form action={addStep} className="plan-admin-add">
                {hidden}
                <input type="hidden" name="template" value={template.id} />
                <input name="label" className="input" placeholder="e.g. Buyer: security review" maxLength={300} required aria-label="New step" />
                <select name="owner" className="select" defaultValue="buyer" aria-label="Who owns this step">
                  <option value="buyer">Buyer</option>
                  <option value="seller">{workspace.name}</option>
                </select>
                <SubmitButton className="btn" pendingLabel="Adding…">
                  Add step
                </SubmitButton>
              </form>
            ) : null}

            {canWrite && trackOptions.length > 0 ? (
              <form action={applyPlan} className="plan-admin-apply">
                {hidden}
                <input type="hidden" name="template" value={template.id} />
                <select name="track" className="select" required defaultValue="" aria-label="Apply to a track">
                  <option value="" disabled>
                    Apply to a track…
                  </option>
                  {trackOptions.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.label}
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                  Apply
                </SubmitButton>
              </form>
            ) : null}
          </section>
        ))
      )}
    </div>
  );
}
