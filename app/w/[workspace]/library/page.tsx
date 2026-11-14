import { Library } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MODE_LABEL, StatusBadge, TYPE_LABEL, TypeIcon } from '@/components/assets/labels';
import { EmptyState } from '@/components/shell/EmptyState';
import { ASSET_TYPES, isAssetType, listAssets } from '@/lib/assets';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { AddLinksForm } from './AddLinksForm';

// Adding links fetches other sites, which can take a while.
export const maxDuration = 60;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function summary(added: number, failed: number, review: number): string {
  const parts = [`${added} added`];
  if (review > 0) parts.push(`${review} need${review === 1 ? 's' : ''} review before use`);
  if (failed > 0) parts.push(`${failed} failed`);
  return `${parts.join(', ')}.`;
}

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ q?: string; type?: string; error?: string; added?: string; failed?: string; review?: string }>;
}) {
  const { workspace: slug } = await params;
  const sp = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const type = isAssetType(sp.type) ? sp.type : undefined;
  const assets = await listAssets(workspace.id, { q: sp.q, type });
  const canWrite = can(role, 'content.write');
  const filtered = Boolean(sp.q || type);
  const base = `/w/${workspace.slug}/library`;

  return (
    <div className="page page-wide">
      <h1 className="page-title">Library</h1>
      <p className="page-subtitle">Everything you can put in a room: web pages, PDFs and YouTube videos.</p>

      {sp.error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(sp.error)}
        </p>
      ) : null}
      {sp.added !== undefined ? (
        <p className="notice" role="status">
          {summary(Number(sp.added) || 0, Number(sp.failed) || 0, Number(sp.review) || 0)}
        </p>
      ) : null}

      {canWrite ? <AddLinksForm workspaceId={workspace.id} workspaceSlug={workspace.slug} /> : null}

      {assets.length > 0 || filtered ? (
        <form className="toolbar" method="get" action={base}>
          <input
            name="q"
            className="input"
            style={{ maxWidth: 260 }}
            placeholder="Search titles"
            aria-label="Search titles"
            defaultValue={sp.q ?? ''}
          />
          <select name="type" className="select" aria-label="Filter by type" defaultValue={type ?? ''}>
            <option value="">All types</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <button type="submit" className="btn">
            Filter
          </button>
          {filtered ? (
            <Link href={base} className="btn btn-ghost">
              Clear
            </Link>
          ) : null}
        </form>
      ) : null}

      {assets.length === 0 ? (
        <EmptyState
          icon={<Library aria-hidden="true" />}
          title={filtered ? 'Nothing matches' : 'No content yet'}
          body={
            filtered
              ? 'Try a different search or clear the filter.'
              : 'Web pages, PDFs and videos you add will appear here.'
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Shown as</th>
                <th>Status</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td style={{ maxWidth: 480 }}>
                    <Link href={`${base}/${asset.id}`} className="asset-row">
                      <span className="thumb">
                        {asset.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- remote share images from arbitrary sites
                          <img src={asset.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                        ) : (
                          <TypeIcon type={asset.type} />
                        )}
                      </span>
                      <span className="asset-title truncate">{asset.title}</span>
                    </Link>
                  </td>
                  <td>{TYPE_LABEL[asset.type]}</td>
                  <td>{asset.status === 'failed' ? '' : MODE_LABEL[asset.renderMode]}</td>
                  <td>
                    <StatusBadge asset={asset} />
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(asset.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
