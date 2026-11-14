import { headers } from 'next/headers';
import { SITE_URL } from './site';

/**
 * The public origin to use in links this app writes into emails, alerts and other tools.
 * The request's own host is used only when it is this site, a deployment preview, or a local
 * machine; anything else falls back to the site's address, so a forged Host header can never
 * make Pipemouse send out links to somebody else's server.
 */
export async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').toLowerCase();
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  if (host === new URL(SITE_URL).host || /^salesroom-[a-z0-9-]+\.vercel\.app$/.test(host)) return `https://${host}`;
  return SITE_URL;
}
