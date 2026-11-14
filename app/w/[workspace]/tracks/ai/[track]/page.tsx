import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TYPE_LABEL, TypeIcon } from '@/components/assets/labels';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { getDraftReview } from '@/lib/ai/generate';
import { isAssetType } from '@/lib/assets';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { deleteTrackAction } from '../../actions';

export default async function AiReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; track: string }>;
  searchParams: Promise<{ cta?: string }>;
}) {
  const { workspace: slug, track: trackId } = await params;
  const { cta } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const review = /^[0-9a-f-]{36}$/.test(trackId) ? await getDraftReview(workspace.id, trackId) : null;
  if (!review) notFound();
  const suggestion = (cta ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);

  return (
    <div className="page">
      <Link href={`/w/${workspace.slug}/tracks/ai`} className="back">
        <ArrowLeft aria-hidden="true" /> Draft another
      </Link>
      <h1 className="page-title">{review.name}</h1>
      <p className="page-subtitle">
        <span className="badge badge-warn">Draft</span> Written by AI from your brief. Check it before you publish.
      </p>
      {review.brief ? (
        <p className="notice">
          <strong>Your brief:</strong> {review.brief}
        </p>
      ) : null}

      <h2 className="section-title">Items, in order</h2>
      <ol className="item-list">
        {review.items.map((item, index) => (
          <li key={item.id} className="item" style={{ alignItems: 'flex-start', padding: '8px 6px', animationDelay: `${index * 60}ms` }}>
            <span className="thumb" style={{ width: 28, height: 28 }}>
              <TypeIcon type={isAssetType(item.type) ? item.type : 'web'} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 500 }}>
                {index + 1}. {item.title}
              </span>{' '}
              <span className="hint">{isAssetType(item.type) ? TYPE_LABEL[item.type] : ''}</span>
              {item.reason ? (
                <span className="hint" style={{ display: 'block', marginTop: 2 }}>
                  <Sparkles width={11} height={11} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> {item.reason}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>

      {suggestion ? (
        <p className="hint" style={{ marginTop: 12 }}>
          Suggested button label: “{suggestion}”. Add it, with your own link, in the track settings.
        </p>
      ) : null}

      <div className="header-actions" style={{ marginTop: 24 }}>
        <Link className="btn btn-primary" href={`/w/${workspace.slug}/tracks/${trackId}`}>
          Open in editor
        </Link>
        {can(role, 'content.delete') ? (
          <form action={deleteTrackAction}>
            <input type="hidden" name="workspace" value={workspace.slug} />
            <input type="hidden" name="track" value={trackId} />
            <SubmitButton className="btn btn-danger" pendingLabel="Discarding…">
              Discard draft
            </SubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}
