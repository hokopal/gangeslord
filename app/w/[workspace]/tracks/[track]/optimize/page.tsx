import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { formatPercent } from '@/lib/analytics';
import { errorMessage } from '@/lib/messages';
import { MIN_SESSIONS } from '@/lib/optimize';
import { getOptimizationState } from '@/lib/optimize-server';
import { can } from '@/lib/roles';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';
import { recalculateAction, saveOrderingAction } from './actions';

const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

export default async function OptimizePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; track: string }>;
  searchParams: Promise<{ error?: string; saved?: string; recalculated?: string }>;
}) {
  const { workspace: slug, track: trackId } = await params;
  const { error, saved, recalculated } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const detail = /^[0-9a-f-]{36}$/.test(trackId) ? await getTrackDetail(workspace.id, trackId) : null;
  const state = detail ? await getOptimizationState(workspace.id, detail.track.id) : null;
  if (!detail || !state) notFound();
  const { track, items } = detail;
  const editable = can(role, 'content.write');
  const result = state.optimization;
  const title = new Map(items.map((item) => [item.id, item.titleOverride || item.asset.title]));
  const authored = new Map(items.map((item, index) => [item.id, index + 1]));
  const learned = new Map((result?.ready ? result.order : []).map((id, index) => [id, index + 1]));
  const rows = (result?.items ?? []).filter((row) => title.has(row.id)).sort((a, b) => (learned.get(a.id) ?? authored.get(a.id) ?? 0) - (learned.get(b.id) ?? authored.get(b.id) ?? 0));
  const hidden = (
    <>
      <input type="hidden" name="workspace" value={workspace.slug} />
      <input type="hidden" name="track" value={track.id} />
    </>
  );

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/tracks/${track.id}`} className="back">
        <ArrowLeft aria-hidden="true" /> {track.name}
      </Link>
      <h1 className="page-title">Optimise order</h1>
      <p className="page-subtitle">
        Let this track learn from how buyers read it. Items that hold attention move up, and the “Next” button suggests what similar
        visitors engaged with next.
      </p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {saved ? (
        <p className="notice" role="status">
          Saved. {state.ordering === 'optimized' ? 'New visitors will see the learned order once there are enough visits.' : 'Every visitor sees the order you arranged.'}
        </p>
      ) : null}
      {recalculated ? (
        <p className="notice" role="status">
          Recalculated from the latest visits.
        </p>
      ) : null}

      <h2 className="section-title">Mode</h2>
      <form action={saveOrderingAction} style={{ maxWidth: 640 }}>
        {hidden}
        <label className="check-row">
          <input type="radio" name="ordering" value="fixed" defaultChecked={state.ordering === 'fixed'} disabled={!editable} />
          <span>
            <span style={{ fontWeight: 500 }}>Fixed order</span>
            <span className="hint" style={{ display: 'block' }}>
              Every visitor sees the items in the order you arranged, and “Next” moves down the list.
            </span>
          </span>
        </label>
        <label className="check-row">
          <input type="radio" name="ordering" value="optimized" defaultChecked={state.ordering === 'optimized'} disabled={!editable} />
          <span>
            <span style={{ fontWeight: 500 }}>Self-optimising</span>
            <span className="hint" style={{ display: 'block' }}>
              After {MIN_SESSIONS} visits, Pipemouse reorders the items by how well they engage and suggests each visitor’s next item from
              what they haven’t opened yet. Until then, your order is used. It keeps adjusting as more visits come in.
            </span>
          </span>
        </label>
        <label className="check-row">
          <input type="checkbox" name="pinFirst" defaultChecked={state.pinFirst} disabled={!editable} />
          <span>
            <span style={{ fontWeight: 500 }}>Always keep my first item first</span>
            <span className="hint" style={{ display: 'block' }}>
              Useful when the first item is your introduction. Only the items after it are reordered.
            </span>
          </span>
        </label>
        {editable ? (
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            Save
          </SubmitButton>
        ) : null}
      </form>

      <div className="header-row" style={{ marginTop: 32 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          What the visits say
        </h2>
        {editable ? (
          <form action={recalculateAction}>
            {hidden}
            <SubmitButton className="btn btn-sm" pendingLabel="Calculating…">
              Recalculate now
            </SubmitButton>
          </form>
        ) : null}
      </div>
      {!result ? (
        <p className="hint" style={{ marginTop: 8 }}>
          Nothing calculated yet. Press “Recalculate now” to see how this track’s items are performing.
        </p>
      ) : (
        <>
          <p className="hint" style={{ margin: '8px 0 12px' }}>
            {result.ready
              ? `Based on ${result.sessions} visits in the last 180 days.`
              : `Still learning: ${result.sessions} of the ${MIN_SESSIONS} visits needed${items.length < 2 ? ', and a track needs at least two items to reorder' : ''}. Your order is used until then.`}{' '}
            {state.optimizedAt ? `Last calculated ${formatWhen(state.optimizedAt)}.` : ''}
            {result.ready && state.ordering === 'fixed' ? ' This is a preview: the track is on fixed order, so visitors still see your order.' : ''}
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{result.ready ? 'Learned position' : 'Position'}</th>
                  <th>Item</th>
                  <th className="num">Your position</th>
                  <th className="num">Opens</th>
                  <th className="num">Engaged</th>
                  <th className="num">Read on</th>
                  <th className="num">Clicked a button</th>
                  <th className="num">Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{learned.get(row.id) ?? authored.get(row.id)}</td>
                    <td style={{ maxWidth: 340 }}>
                      <span className="truncate" style={{ display: 'block' }}>
                        {title.get(row.id)}
                      </span>
                    </td>
                    <td className="num">{authored.get(row.id)}</td>
                    <td className="num">{row.opens}</td>
                    <td className="num">{formatPercent(row.engagement)}</td>
                    <td className="num">{formatPercent(row.readOn)}</td>
                    <td className="num">{formatPercent(row.conversion)}</td>
                    <td className="num">{Math.round(row.score * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="section-title">How the score works</h2>
      <ul className="hint" style={{ margin: '0 0 0 18px', lineHeight: 1.7, maxWidth: 720 }}>
        <li>
          <strong>Engaged</strong> (half the score): of the visitors who opened the item, how many stayed past its engagement threshold.
        </li>
        <li>
          <strong>Read on</strong> (three tenths): how many went on to open another item afterwards.
        </li>
        <li>
          <strong>Clicked a button</strong> (two tenths): of those who engaged, how many clicked one of the track’s buttons during the visit.
        </li>
        <li>Rates are counted per open, so an item isn’t favoured just for being listed first and seen most.</li>
        <li>
          An item with few opens is pulled towards the track’s average until it has evidence of its own, and gets a small boost in the
          order so it is seen often enough to be judged fairly.
        </li>
      </ul>
    </div>
  );
}
