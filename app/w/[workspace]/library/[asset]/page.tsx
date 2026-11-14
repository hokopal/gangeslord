import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AssetPreview } from '@/components/assets/AssetPreview';
import { MODE_LABEL, StatusBadge, TYPE_LABEL } from '@/components/assets/labels';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { getAsset, signedFileUrl } from '@/lib/assets';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { deleteAssetAction, saveSnapshotAction, updateAssetAction, switchToLivePageAction } from '../actions';

export const maxDuration = 60;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function AssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; asset: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { workspace: slug, asset: assetId } = await params;
  const { error, saved } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const asset = /^[0-9a-f-]{36}$/.test(assetId) ? await getAsset(workspace.id, assetId) : null;
  if (!asset) notFound();

  const canWrite = can(role, 'content.write');
  const fileUrl = asset.renderMode === 'file' ? await signedFileUrl(asset) : null;
  const hidden = (
    <>
      <input type="hidden" name="workspace" value={workspace.slug} />
      <input type="hidden" name="asset" value={asset.id} />
    </>
  );

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/library`} className="back">
        <ArrowLeft aria-hidden="true" /> Library
      </Link>
      <h1 className="page-title">{asset.title}</h1>
      <p className="page-subtitle">
        {TYPE_LABEL[asset.type]}
        {asset.status === 'failed' ? '' : ` · ${MODE_LABEL[asset.renderMode]}`}
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

      <div className="asset-layout">
        <div className="preview">
          {asset.status === 'needs_confirmation' ? (
            <div className="preview-message">
              <div>
                <h2>This page doesn’t allow embedding</h2>
                <p>
                  The site tells browsers not to show it inside other pages. You can save a snapshot instead:
                  a static copy taken now. Forms, video and anything interactive on the page won’t work in
                  the snapshot, and it won’t update when the page changes.
                </p>
                {canWrite ? (
                  <form action={saveSnapshotAction}>
                    {hidden}
                    <label className="check">
                      <input type="checkbox" name="rights" required />
                      <span>I have the right to copy and share this page’s content.</span>
                    </label>
                    <SubmitButton className="btn btn-primary" pendingLabel="Saving snapshot…">
                      Save snapshot
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            </div>
          ) : (
            <AssetPreview asset={asset} fileUrl={fileUrl} />
          )}
        </div>

        <div>
          <dl className="meta-list">
            <dt>Status</dt>
            <dd>
              <StatusBadge asset={asset} />
            </dd>
            {asset.sourceUrl ? (
              <>
                <dt>Source</dt>
                <dd>
                  <a className="link" href={asset.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {asset.sourceUrl}
                  </a>
                </dd>
              </>
            ) : null}
            {asset.snapshotAt ? (
              <>
                <dt>Snapshot</dt>
                <dd>Taken {formatDateTime(asset.snapshotAt)}</dd>
              </>
            ) : null}
            <dt>Added</dt>
            <dd>{formatDateTime(asset.createdAt)}</dd>
          </dl>

          <form action={updateAssetAction}>
            {hidden}
            <div className="field">
              <label className="label" htmlFor="title">
                Title
              </label>
              <input id="title" name="title" className="input" defaultValue={asset.title} required maxLength={300} disabled={!canWrite} />
            </div>
            <div className="field">
              <label className="label" htmlFor="description">
                Description
              </label>
              <textarea id="description" name="description" className="textarea" defaultValue={asset.description} maxLength={1000} disabled={!canWrite} />
            </div>
            <div className="field">
              <label className="label" htmlFor="slug">
                Link name
              </label>
              <input
                id="slug"
                name="slug"
                className="input"
                defaultValue={asset.slug}
                required
                minLength={3}
                maxLength={80}
                pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
                disabled={!canWrite}
              />
              <span className="hint">Used in the item’s direct link inside a room.</span>
            </div>
            <div className="field">
              <label className="label" htmlFor="threshold">
                Engagement threshold (seconds)
              </label>
              <input
                id="threshold"
                name="threshold"
                type="number"
                className="input"
                defaultValue={asset.thresholdSeconds}
                min={1}
                max={3600}
                required
                disabled={!canWrite}
              />
              <span className="hint">Time a visitor must spend before this item counts as engaged with.</span>
            </div>
            {canWrite ? (
              <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
                Save changes
              </SubmitButton>
            ) : null}
          </form>

          {canWrite && asset.type === 'web' && asset.status === 'ready' ? (
            <>
              <h2 className="section-title">Display</h2>
              <div className="stack">
                <form action={saveSnapshotAction}>
                  {hidden}
                  {asset.renderMode === 'snapshot' ? (
                    <input type="hidden" name="rights" value="on" />
                  ) : (
                    <label className="check">
                      <input type="checkbox" name="rights" required />
                      <span>I have the right to copy and share this page’s content.</span>
                    </label>
                  )}
                  <SubmitButton className="btn" pendingLabel="Saving snapshot…">
                    {asset.renderMode === 'snapshot' ? 'Refresh snapshot' : 'Use a snapshot instead'}
                  </SubmitButton>
                </form>
                {asset.renderMode === 'snapshot' ? (
                  <form action={switchToLivePageAction}>
                    {hidden}
                    <SubmitButton className="btn" pendingLabel="Checking…">
                      Try the live page
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            </>
          ) : null}

          {can(role, 'content.delete') ? (
            <>
              <h2 className="section-title">Remove</h2>
              <form action={deleteAssetAction}>
                {hidden}
                <SubmitButton className="btn btn-danger" pendingLabel="Deleting…">
                  Delete from library
                </SubmitButton>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
