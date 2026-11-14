import type { Asset } from '@/lib/assets';
import { youTubeEmbedUrl } from '@/lib/ingest/youtube';
import { errorMessage } from '@/lib/messages';

/**
 * Renders an asset the way a room will show it. `fileUrl` is a signed link for stored PDFs.
 * Live pages are sandboxed so they cannot navigate the surrounding app.
 */
export function AssetPreview({ asset, fileUrl }: { asset: Asset; fileUrl: string | null }) {
  if (asset.status === 'failed') {
    return (
      <div className="preview-message">
        <div>
          <h2>This item couldn’t be added</h2>
          <p>{errorMessage(asset.error ?? '')}</p>
        </div>
      </div>
    );
  }
  if (asset.renderMode === 'embed' && asset.videoId) {
    return (
      <iframe
        title={asset.title}
        src={youTubeEmbedUrl(asset.videoId)}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }
  if (asset.renderMode === 'file') {
    return fileUrl ? (
      <iframe title={asset.title} src={fileUrl} />
    ) : (
      <div className="preview-message">
        <div>
          <h2>File not found</h2>
          <p>{errorMessage('storage_failed')}</p>
        </div>
      </div>
    );
  }
  if (asset.renderMode === 'snapshot') {
    return (
      <iframe
        title={asset.title}
        src={`/content/snapshot/${asset.id}`}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
      />
    );
  }
  return (
    <iframe
      title={asset.title}
      src={asset.sourceUrl ?? 'about:blank'}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
