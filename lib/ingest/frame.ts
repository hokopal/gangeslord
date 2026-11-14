/** Does one frame-ancestors source expression admit `origin`? */
function sourceAllows(source: string, origin: URL): boolean {
  const s = source.toLowerCase();
  if (s === '*') return true;
  if (s === "'none'" || s === "'self'") return false;
  if (s === 'https:' || s === 'http:') return s === origin.protocol;
  const match = s.match(/^(?:(https?):\/\/)?(\*\.)?([a-z0-9.-]+)(?::(\d+|\*))?(?:\/.*)?$/);
  if (!match) return false;
  const [, scheme, wildcard, host, port] = match;
  if (scheme && `${scheme}:` !== origin.protocol) return false;
  if (port && port !== '*' && port !== (origin.port || (origin.protocol === 'https:' ? '443' : '80'))) {
    return false;
  }
  return wildcard ? origin.hostname.endsWith(`.${host}`) : origin.hostname === host;
}

/**
 * Whether a page with these response headers can be shown in an iframe on `appOrigin`.
 * A `frame-ancestors` directive, when present, takes precedence over X-Frame-Options,
 * as browsers do. Every CSP header that carries the directive must allow the origin.
 */
export function isFramingAllowed(headers: Headers, appOrigin: string): boolean {
  const origin = new URL(appOrigin);
  const policies = (headers.get('content-security-policy') ?? '')
    .split(',')
    .map((policy) =>
      policy
        .split(';')
        .map((d) => d.trim())
        .find((d) => d.toLowerCase().startsWith('frame-ancestors')),
    )
    .filter((d): d is string => Boolean(d));

  if (policies.length > 0) {
    return policies.every((directive) =>
      directive
        .split(/\s+/)
        .slice(1)
        .some((source) => sourceAllows(source, origin)),
    );
  }
  // Any X-Frame-Options value (DENY, SAMEORIGIN, the obsolete ALLOW-FROM) blocks a third-party frame.
  return !headers.get('x-frame-options');
}
