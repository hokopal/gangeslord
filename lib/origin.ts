import { headers } from 'next/headers';
import { resolveWorkspaceDomain } from './workspace-domains';
import { APP_URL, SITE_URL } from './site';
import { preferredWorkspaceDomain } from './vercel-domains';

const LOCAL = /^(localhost|127\.0\.0\.1)(:\d+)?$/;
const PREVIEW = /^salesroom-[a-z0-9-]+\.vercel\.app$/;
const PLATFORM_HOSTS = new Set([new URL(SITE_URL).host, new URL(APP_URL).host]);

function requestHost(h: Headers): string {
  return (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0].trim().toLowerCase();
}

async function customDomain(h: Headers): Promise<{ origin: string; workspaceSlug: string } | null> {
  const host = requestHost(h);
  if (!host || LOCAL.test(host) || PREVIEW.test(host) || PLATFORM_HOSTS.has(host) || host.endsWith('.vercel.app') || host.endsWith('.v0.build')) return null;
  const workspaceSlug = await resolveWorkspaceDomain(host, { headers: h });
  return workspaceSlug ? { origin: `https://${host}`, workspaceSlug } : null;
}

/** The origin of the current request when it is a local, preview or verified custom-domain deployment. */
async function sharedOrigin(workspaceSlug?: string, allowCustom = true): Promise<string | null> {
  const h = await headers();
  const host = requestHost(h);
  if (!host) return null;
  if (LOCAL.test(host)) return `http://${host}`;
  if (PREVIEW.test(host)) return `https://${host}`;
  if (allowCustom) {
    const custom = await customDomain(h);
    if (custom && (!workspaceSlug || custom.workspaceSlug === workspaceSlug)) return custom.origin;
  }
  return null;
}

/** The workspace slug proved by the current custom-domain request, if any. */
export async function customWorkspaceSlug(): Promise<string | null> {
  return (await customDomain(await headers()))?.workspaceSlug ?? null;
}

/** The clean room path on its own custom domain, or the canonical Pipemouse path elsewhere. */
export async function roomBasePath(workspaceSlug: string, trackSlug: string): Promise<string> {
  return (await customWorkspaceSlug()) === workspaceSlug ? `/${trackSlug}` : `/r/${workspaceSlug}/${trackSlug}`;
}

/**
 * The public origin for links to rooms and snapshots. A verified workspace domain is preferred
 * in production; local and preview requests keep their own origin. Server-only.
 */
export async function siteOrigin(workspaceSlug?: string): Promise<string> {
  const shared = await sharedOrigin(workspaceSlug);
  if (shared) return shared;
  if (workspaceSlug) {
    const domain = await preferredWorkspaceDomain(workspaceSlug);
    if (domain) return `https://${domain}`;
  }
  return SITE_URL;
}

/** The app origin for links to the signed-in workspace. Same preview rule as siteOrigin. */
export async function appOrigin(): Promise<string> {
  return (await sharedOrigin(undefined, false)) ?? APP_URL;
}

/** Is this request on the app's own address, apart from the public site? */
export async function onAppHost(): Promise<boolean> {
  return APP_URL !== SITE_URL && requestHost(await headers()) === new URL(APP_URL).host;
}
