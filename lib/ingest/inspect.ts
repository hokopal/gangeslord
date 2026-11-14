import { isFramingAllowed } from './frame';
import { extractMetadata } from './html';
import { safeFetch, type Resolver } from './net';
import { parseYouTubeId, youTubeThumbnailUrl } from './youtube';

export const HTML_LIMIT = 5 * 1024 * 1024;
export const PDF_LIMIT = 50 * 1024 * 1024;

export type Inspection =
  | { kind: 'youtube'; sourceUrl: string; videoId: string; title: string; description: string; thumbnailUrl: string }
  | {
      kind: 'web';
      sourceUrl: string;
      title: string;
      description: string;
      thumbnailUrl: string | null;
      text: string;
      framingAllowed: boolean;
      html: string;
    }
  | { kind: 'pdf'; sourceUrl: string; title: string; bytes: Uint8Array };

export type InspectDeps = { fetchImpl?: typeof fetch; resolve?: Resolver };

const HTML_TYPES = new Set(['text/html', 'application/xhtml+xml']);

function fileTitle(url: string): string {
  const name = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? '');
  return name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim() || new URL(url).hostname;
}

/**
 * Works out what a URL is and gathers what the library needs to store it.
 * Throws coded errors: url_invalid, url_blocked, fetch_failed, too_large,
 * too_many_redirects, page_unavailable, video_unavailable, unsupported_type.
 */
export async function inspectUrl(rawUrl: string, appOrigin: string, deps: InspectDeps = {}): Promise<Inspection> {
  const videoId = parseYouTubeId(rawUrl);
  if (videoId) {
    const canonical = `https://www.youtube.com/watch?v=${videoId}`;
    const oembed = await safeFetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonical)}`,
      { ...deps, limitFor: () => 256 * 1024 },
    );
    // oEmbed answers 401/403 when embedding is disabled and 404 when the video is gone.
    if (oembed.status !== 200) throw new Error('video_unavailable');
    let data: { title?: string; author_name?: string };
    try {
      data = JSON.parse(new TextDecoder().decode(oembed.body));
    } catch {
      throw new Error('video_unavailable');
    }
    return {
      kind: 'youtube',
      sourceUrl: canonical,
      videoId,
      title: data.title?.trim() || 'YouTube video',
      description: data.author_name ? `Video by ${data.author_name}` : '',
      thumbnailUrl: youTubeThumbnailUrl(videoId),
    };
  }

  const result = await safeFetch(rawUrl, {
    ...deps,
    limitFor: (type) => (type === 'application/pdf' ? PDF_LIMIT : HTML_LIMIT),
  });
  if (result.status === 401 || result.status === 403) throw new Error('page_unavailable');
  if (result.status < 200 || result.status >= 300) throw new Error('page_unavailable');

  const looksLikePdf = result.body.length > 4 && new TextDecoder().decode(result.body.subarray(0, 5)) === '%PDF-';
  if (result.contentType === 'application/pdf' || looksLikePdf) {
    if (!looksLikePdf) throw new Error('unsupported_type');
    return { kind: 'pdf', sourceUrl: result.url, title: fileTitle(result.url), bytes: result.body };
  }
  if (!HTML_TYPES.has(result.contentType)) throw new Error('unsupported_type');

  const html = new TextDecoder().decode(result.body);
  const metadata = extractMetadata(html, result.url);
  return {
    kind: 'web',
    sourceUrl: result.url,
    ...metadata,
    framingAllowed: isFramingAllowed(result.headers, appOrigin),
    html,
  };
}
