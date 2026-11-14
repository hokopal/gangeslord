// A snapshot is someone else's HTML. `sandbox` gives it an opaque origin (no access to this
// app's cookies or storage) and the rest forbids script outright, whatever sanitising missed.
const CSP = [
  'sandbox allow-popups allow-popups-to-escape-sandbox',
  "default-src 'none'",
  'img-src * data:',
  "style-src * 'unsafe-inline'",
  'font-src * data:',
  'media-src *',
  "frame-ancestors 'self'",
  'base-uri *',
  "form-action 'none'",
].join('; ');

export function snapshotResponse(html: string | null): Response {
  if (html === null) return new Response('Not found', { status: 404 });
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': CSP,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'cache-control': 'private, max-age=60',
    },
  });
}
