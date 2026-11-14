import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PdfViewer } from '@/components/room/PdfViewer';
import { getAsset, signedFileUrl } from '@/lib/assets';
import { guestAccess, listGuestMarks } from '@/lib/guest-notes';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';

const UUID = /^[0-9a-f-]{36}$/;

/** One buyer's drawings and pinned notes, shown over the document they were made on. Read-only. */
export default async function GuestMarkupPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; track: string }>;
  searchParams: Promise<{ item?: string; visitor?: string }>;
}) {
  const { workspace: slug, track: trackId } = await params;
  const { item: itemId = '', visitor = '' } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !UUID.test(trackId) || !UUID.test(itemId) || !UUID.test(visitor)) notFound();
  const detail = await getTrackDetail(context.workspace.id, trackId);
  const item = detail?.items.find((entry) => entry.id === itemId);
  if (!detail || !item) notFound();
  // The same rule as the notes list: the room's creator and people it is shared with.
  if (!(await guestAccess(detail.track.id)).sees) notFound();
  const [asset, marks] = await Promise.all([getAsset(context.workspace.id, item.assetId), listGuestMarks(detail.track.id, item.id, visitor)]);
  const src = asset ? await signedFileUrl(asset) : null;
  const title = item.titleOverride || item.asset.title;

  return (
    <div className="page page-wide" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 'none' }}>
      <Link href={`/w/${context.workspace.slug}/tracks/${detail.track.id}/notes`} className="back">
        <ArrowLeft aria-hidden="true" /> Guest notes
      </Link>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">
        {marks.length === 0 ? 'This guest has no marks on this document.' : `${marks.length} ${marks.length === 1 ? 'mark' : 'marks'} from this guest. Click a sticky note to read it.`}
      </p>
      {src ? (
        <div style={{ flex: 1, minHeight: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <PdfViewer src={src} title={title} overlay={marks} />
        </div>
      ) : (
        <p className="notice" role="status">
          This item isn’t a PDF, or its file is no longer available.
        </p>
      )}
    </div>
  );
}
