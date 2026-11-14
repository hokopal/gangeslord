import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TYPE_LABEL, TypeIcon } from '@/components/assets/labels';
import { CopyButton } from '@/components/ui/CopyButton';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { listAssets } from '@/lib/assets';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';
import {
  addItemAction,
  deleteTrackAction,
  publishTrackAction,
  updateItemAction,
  updateTrackAction,
} from '../actions';
import { ItemList } from './ItemList';

export default async function TrackEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; track: string }>;
  searchParams: Promise<{ item?: string; error?: string; saved?: string }>;
}) {
  const { workspace: slug, track: trackId } = await params;
  const sp = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const detail = /^[0-9a-f-]{36}$/.test(trackId) ? await getTrackDetail(workspace.id, trackId) : null;
  if (!detail) notFound();
  const { track, items, ctas } = detail;

  const canWrite = can(role, 'content.write');
  const published = track.status === 'published';
  const base = `/w/${workspace.slug}/tracks/${track.id}`;
  const roomPath = `/r/${workspace.slug}/${track.slug}`;
  const selected = items.find((i) => i.id === sp.item) ?? null;
  const cta = (placement: 'header' | 'sidebar') => ctas.find((c) => c.placement === placement);
  const itemCta = selected ? ctas.find((c) => c.placement === 'item' && c.trackItemId === selected.id) : undefined;

  const inTrack = new Set(items.map((i) => i.assetId));
  const available = canWrite ? (await listAssets(workspace.id)).filter((a) => !inTrack.has(a.id)) : [];
  const hidden = (
    <>
      <input type="hidden" name="workspace" value={workspace.slug} />
      <input type="hidden" name="track" value={track.id} />
    </>
  );

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/tracks`} className="back">
        <ArrowLeft aria-hidden="true" /> Tracks
      </Link>
      <div className="header-row">
        <div>
          <h1 className="page-title">{track.name}</h1>
          <p className="page-subtitle">
            <span className={published ? 'badge' : 'badge badge-warn'}>{published ? 'Published' : 'Draft'}</span>{' '}
            {published ? 'Anyone with the link can open this room.' : 'Only members of this workspace can open this room.'}
          </p>
        </div>
        <div className="header-actions">
          <a className="btn" href={roomPath} target="_blank" rel="noopener noreferrer">
            <ExternalLink width={14} height={14} aria-hidden="true" />
            {published ? 'Open room' : 'Preview room'}
          </a>
          {published ? <CopyButton path={roomPath} label="Copy room link" /> : null}
          {can(role, 'content.publish') ? (
            <form action={publishTrackAction}>
              {hidden}
              <input type="hidden" name="publish" value={published ? '0' : '1'} />
              <SubmitButton className={published ? 'btn' : 'btn btn-primary'} pendingLabel="Saving…">
                {published ? 'Unpublish' : 'Publish'}
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      {sp.error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(sp.error)}
        </p>
      ) : null}
      {sp.saved ? (
        <p className="notice" role="status">
          Saved.
        </p>
      ) : null}

      <div className="editor-layout">
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            Items in this track
          </h2>
          {items.length === 0 ? (
            <p className="hint">Nothing here yet. Add items from your library below.</p>
          ) : (
            <ItemList
              items={items.map((i) => ({
                id: i.id,
                title: i.titleOverride || i.asset.title,
                type: i.asset.type,
                ready: i.asset.status === 'ready',
              }))}
              workspaceSlug={workspace.slug}
              trackId={track.id}
              selectedId={selected?.id ?? null}
              editable={canWrite}
            />
          )}

          {canWrite ? (
            <>
              <h2 className="section-title">Add from library</h2>
              {available.length === 0 ? (
                <p className="hint">
                  {inTrack.size > 0 ? 'Everything in your library is already in this track. ' : 'Your library is empty. '}
                  <Link className="link" href={`/w/${workspace.slug}/library`}>
                    Add content to the library
                  </Link>
                </p>
              ) : (
                <div className="picker">
                  {available.map((asset) => (
                    <form key={asset.id} action={addItemAction} className="picker-row">
                      {hidden}
                      <input type="hidden" name="asset" value={asset.id} />
                      <span className="thumb" style={{ width: 28, height: 28 }}>
                        <TypeIcon type={asset.type} />
                      </span>
                      <span className="truncate" style={{ flex: 1 }}>
                        {asset.title}
                      </span>
                      <span className="hint">{TYPE_LABEL[asset.type]}</span>
                      {asset.status === 'ready' ? (
                        <SubmitButton className="btn btn-sm" pendingLabel="Adding…">
                          Add
                        </SubmitButton>
                      ) : (
                        <Link className="btn btn-sm btn-ghost" href={`/w/${workspace.slug}/library/${asset.id}`}>
                          {asset.status === 'failed' ? 'Failed' : 'Needs review'}
                        </Link>
                      )}
                    </form>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="panel">
          {selected ? (
            <form action={updateItemAction}>
              {hidden}
              <input type="hidden" name="item" value={selected.id} />
              <Link href={base} className="back">
                <ArrowLeft aria-hidden="true" /> Track settings
              </Link>
              <h2>Item settings</h2>
              <div className="field">
                <label className="label" htmlFor="item-title">
                  Title in this track
                </label>
                <input id="item-title" name="title" className="input" defaultValue={selected.titleOverride} placeholder={selected.asset.title} maxLength={300} disabled={!canWrite} />
                <span className="hint">Leave empty to use the library title.</span>
              </div>
              <div className="field">
                <label className="label" htmlFor="item-description">
                  Description in this track
                </label>
                <textarea id="item-description" name="description" className="textarea" defaultValue={selected.descriptionOverride} placeholder={selected.asset.description} maxLength={1000} disabled={!canWrite} />
              </div>
              <div className="field">
                <label className="label" htmlFor="item-slug">
                  Link name
                </label>
                <input id="item-slug" name="slug" className="input" defaultValue={selected.slug} required minLength={3} maxLength={80} pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" disabled={!canWrite} />
              </div>
              <h3>Button shown with this item</h3>
              <div className="two-up">
                <div className="field">
                  <label className="label" htmlFor="item-cta-label">
                    Label
                  </label>
                  <input id="item-cta-label" name="ctaLabel" className="input" defaultValue={itemCta?.label ?? ''} maxLength={60} disabled={!canWrite} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="item-cta-url">
                    Link
                  </label>
                  <input id="item-cta-url" name="ctaUrl" className="input" defaultValue={itemCta?.url ?? ''} disabled={!canWrite} />
                </div>
              </div>
              <div className="header-actions">
                {canWrite ? (
                  <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                    Save item
                  </SubmitButton>
                ) : null}
                <CopyButton path={`${roomPath}/${selected.slug}`} label="Copy direct link" />
              </div>
            </form>
          ) : (
            <>
              <form action={updateTrackAction}>
                {hidden}
                <h2>Track settings</h2>
                <div className="field">
                  <label className="label" htmlFor="track-name">
                    Name
                  </label>
                  <input id="track-name" name="name" className="input" defaultValue={track.name} required maxLength={120} disabled={!canWrite} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="track-slug">
                    Link name
                  </label>
                  <input id="track-slug" name="slug" className="input" defaultValue={track.slug} required minLength={3} maxLength={80} pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" disabled={!canWrite} />
                  <span className="hint">
                    {published ? 'Changing this breaks links you have already shared.' : 'Part of the room’s web address.'}
                  </span>
                </div>
                <div className="field">
                  <label className="label" htmlFor="track-header">
                    Title shown to visitors
                  </label>
                  <input id="track-header" name="headerTitle" className="input" defaultValue={track.headerTitle} placeholder={track.name} maxLength={120} disabled={!canWrite} />
                </div>
                <label className="check">
                  <input type="checkbox" name="showNextButton" defaultChecked={track.showNextButton} disabled={!canWrite} />
                  <span>Show a Next button on each item</span>
                </label>
                <h3>Button in the room header</h3>
                <div className="two-up">
                  <div className="field">
                    <label className="label" htmlFor="header-label">
                      Label
                    </label>
                    <input id="header-label" name="headerLabel" className="input" defaultValue={cta('header')?.label ?? ''} maxLength={60} placeholder="Book a demo" disabled={!canWrite} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="header-url">
                      Link
                    </label>
                    <input id="header-url" name="headerUrl" className="input" defaultValue={cta('header')?.url ?? ''} disabled={!canWrite} />
                  </div>
                </div>
                <h3>Button under the contents list</h3>
                <div className="two-up">
                  <div className="field">
                    <label className="label" htmlFor="sidebar-label">
                      Label
                    </label>
                    <input id="sidebar-label" name="sidebarLabel" className="input" defaultValue={cta('sidebar')?.label ?? ''} maxLength={60} disabled={!canWrite} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="sidebar-url">
                      Link
                    </label>
                    <input id="sidebar-url" name="sidebarUrl" className="input" defaultValue={cta('sidebar')?.url ?? ''} disabled={!canWrite} />
                  </div>
                </div>
                <p className="hint" style={{ marginBottom: 12 }}>
                  Leave a label and its link empty to remove that button.
                </p>
                {canWrite ? (
                  <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                    Save track
                  </SubmitButton>
                ) : null}
              </form>
              {can(role, 'content.delete') ? (
                <form action={deleteTrackAction}>
                  {hidden}
                  <h3>Remove</h3>
                  <SubmitButton className="btn btn-danger" pendingLabel="Deleting…">
                    Delete track
                  </SubmitButton>
                </form>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
