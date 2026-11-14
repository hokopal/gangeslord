import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type Resolver = (hostname: string) => Promise<string[]>;

const defaultResolver: Resolver = async (hostname) =>
  (await lookup(hostname, { all: true })).map((r) => r.address);

function isPrivateV4(ip: string): boolean {
  const [a, b, c] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** True for loopback, private, link-local, CGNAT, multicast and reserved addresses. */
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateV4(ip);
  if (kind !== 6) return true;
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  if (v6.startsWith('::ffff:')) return true;
  return (
    v6 === '::' ||
    v6 === '::1' ||
    /^f[cd]/.test(v6) ||
    /^fe[89ab]/.test(v6) ||
    v6.startsWith('ff') ||
    v6.startsWith('64:ff9b:')
  );
}

/** Parses a URL and refuses anything that is not public HTTP(S). */
export async function assertPublicUrl(raw: string, resolve: Resolver = defaultResolver): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('url_invalid');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('url_invalid');
  if (url.username || url.password) throw new Error('url_invalid');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = await resolve(host);
    } catch {
      throw new Error('fetch_failed');
    }
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new Error('url_blocked');
  return url;
}

export type SafeFetchOptions = {
  /** Byte limit, chosen once the response content type is known. */
  limitFor: (contentType: string) => number;
  timeoutMs?: number;
  maxRedirects?: number;
  fetchImpl?: typeof fetch;
  resolve?: Resolver;
};

export type SafeFetchResult = {
  url: string;
  status: number;
  headers: Headers;
  contentType: string;
  body: Uint8Array;
};

const USER_AGENT = 'Mozilla/5.0 (compatible; PipemouseBot/1.0; +content-preview)';

/**
 * Fetches a public URL with manual redirects (each hop re-validated), a timeout and a
 * streaming size cap. Throws coded errors: url_invalid, url_blocked, fetch_failed,
 * too_many_redirects, too_large.
 */
export async function safeFetch(raw: string, options: SafeFetchOptions): Promise<SafeFetchResult> {
  const { limitFor, timeoutMs = 10_000, maxRedirects = 5, fetchImpl = fetch, resolve } = options;
  let current = raw;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const url = await assertPublicUrl(current, resolve);
    let response: Response;
    try {
      response = await fetchImpl(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/pdf;q=0.9,*/*;q=0.5' },
      });
    } catch {
      throw new Error('fetch_failed');
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('fetch_failed');
      current = new URL(location, url).toString();
      continue;
    }
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const limit = limitFor(contentType);
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > limit) throw new Error('too_large');

    const chunks: Uint8Array[] = [];
    let size = 0;
    if (response.body) {
      const reader = response.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limit) {
            await reader.cancel();
            throw new Error('too_large');
          }
          chunks.push(value);
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'too_large') throw error;
        throw new Error('fetch_failed');
      }
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { url: url.toString(), status: response.status, headers: response.headers, contentType, body };
  }
  throw new Error('too_many_redirects');
}
