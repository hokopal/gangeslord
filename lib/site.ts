/** Where the public site lives. NEXT_PUBLIC_SITE_URL overrides it, for a staging copy on another address. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.pipemouse.com').replace(/\/$/, '');
/**
 * Where the signed-in app lives. NEXT_PUBLIC_APP_URL overrides it. A staging copy that sets only
 * NEXT_PUBLIC_SITE_URL keeps the site and the app together on that one address.
 */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NEXT_PUBLIC_SITE_URL ? SITE_URL : 'https://rooms.pipemouse.com')
).replace(/\/$/, '');
/**
 * The parent domain the site and the app share, such as pipemouse.com for www. and rooms., so one
 * session cookie works on both. Null when they share one address or have no common parent.
 */
export const SHARED_COOKIE_DOMAIN = (() => {
  const site = new URL(SITE_URL).hostname.split('.');
  const app = new URL(APP_URL).hostname.split('.');
  if (site.join('.') === app.join('.')) return null;
  const common: string[] = [];
  while (site.length && app.length && site[site.length - 1] === app[app.length - 1]) {
    common.unshift(site.pop()!);
    app.pop();
  }
  return common.length >= 2 ? common.join('.') : null;
})();

/** The cookie domain to use for a request on `hostname`: the shared parent when the host is under it, else host-only. */
export function cookieDomainFor(hostname: string): string | undefined {
  const host = hostname.toLowerCase().replace(/:\d+$/, '');
  if (!SHARED_COOKIE_DOMAIN) return undefined;
  return host === SHARED_COOKIE_DOMAIN || host.endsWith(`.${SHARED_COOKIE_DOMAIN}`) ? SHARED_COOKIE_DOMAIN : undefined;
}

export const SITE_NAME = 'Pipemouse';
export const OS_NAME = 'Pipemouse OS';
export const ROOMS_NAME = 'Rooms';
export const OS_URL = (process.env.NEXT_PUBLIC_OS_URL ?? 'https://space.pipemouse.com').replace(/\/$/, '');
export const SITE_TAGLINE = 'Go-to-market software for revenue teams';
export const SITE_DESCRIPTION =
  'Pipemouse is the go-to-market platform that connects CRM, AI agents, workflows, and sales rooms, giving revenue teams one place to act on customer context.';
/** One plain definition, reused wherever a search or answer engine might quote it. */
export const SITE_DEFINITION =
  'Pipemouse is a go-to-market SaaS platform for marketing, sales, and revenue operations. Pipemouse OS provides the CRM, workflows, AI agents, and developer platform; Rooms provides personalized digital sales rooms and buyer engagement analytics. Together, they connect internal GTM execution with the buyer experience.';
export const OS_DEFINITION =
  'Pipemouse OS is the GTM workspace in the Pipemouse platform. It combines a flexible CRM for companies, contacts, deals, pipelines, and custom objects with workflows, AI agents, GraphQL and REST APIs, webhooks, an SDK, and a CLI.';
export const ROOMS_DEFINITION =
  'Rooms is the digital sales room product in the Pipemouse platform. It turns web pages, PDFs, and videos into a guided buyer experience, gives every stakeholder a personal link, and shows teams which content each buyer read, watched, and acted on.';
/** The date the legal pages were last changed. */
export const LEGAL_UPDATED = '12 November 2026';
