import { headers } from 'next/headers';
import { APP_URL, SITE_URL } from './site';

async function requestHost(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-host') ?? h.get('host') ?? '').toLowerCase();
}

/**
 * The request's own origin, when it is a local machine or a deployment preview, where the site
 * and the app share one address. Anything else gets null and falls back to the real addresses,
 * so a forged Host header can never make Pipemouse send out links to somebody else's server.
 */
async function sharedOrigin(): Promise<string | null> {
  const host = await requestHost();
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  if (/^salesroom-[a-z0-9-]+\.vercel\.app$/.test(host)) return `https://${host}`;
  return null;
}

/** The origin of the signed-in app, for links to workspace pages written into emails, alerts and other tools. */
export async function appOrigin(): Promise<string> {
  return (await sharedOrigin()) ?? APP_URL;
}

/** The origin of the public site, which is where the room links sent to buyers point. */
export async function siteOrigin(): Promise<string> {
  return (await sharedOrigin()) ?? SITE_URL;
}

/** Is this request on the app's own address, apart from the public site? */
export async function onAppHost(): Promise<boolean> {
  return APP_URL !== SITE_URL && (await requestHost()) === new URL(APP_URL).host;
}
