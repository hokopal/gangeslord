import { FileText, Globe, SquarePlay } from 'lucide-react';
import type { Asset, AssetType, RenderMode } from '@/lib/assets';
import { errorMessage } from '@/lib/messages';

export const TYPE_LABEL: Record<AssetType, string> = { web: 'Web page', pdf: 'PDF', youtube: 'YouTube' };
export const MODE_LABEL: Record<RenderMode, string> = {
  iframe: 'Live page',
  snapshot: 'Snapshot',
  file: 'Stored file',
  embed: 'Video player',
};

export function TypeIcon({ type }: { type: AssetType }) {
  if (type === 'pdf') return <FileText aria-hidden="true" />;
  if (type === 'youtube') return <SquarePlay aria-hidden="true" />;
  return <Globe aria-hidden="true" />;
}

export function StatusBadge({ asset }: { asset: Asset }) {
  if (asset.status === 'failed') {
    return (
      <span className="badge badge-error" title={errorMessage(asset.error ?? '')}>
        Failed
      </span>
    );
  }
  if (asset.status === 'needs_confirmation') return <span className="badge badge-warn">Needs review</span>;
  return <span className="badge">Ready</span>;
}
