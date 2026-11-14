/** Where the public site lives. NEXT_PUBLIC_SITE_URL overrides it, for a staging copy on another address. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.pipemouse.com').replace(/\/$/, '');
/**
 * Where the signed-in app lives. NEXT_PUBLIC_APP_URL overrides it. A staging copy that sets only
 * NEXT_PUBLIC_SITE_URL keeps the site and the app together on that one address.
 */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NEXT_PUBLIC_SITE_URL ? SITE_URL : 'https://space.pipemouse.com')
).replace(/\/$/, '');
export const SITE_NAME = 'Pipemouse';
export const SITE_TAGLINE = 'Send buyers a room, not a pile of links';
export const SITE_DESCRIPTION =
  'Pipemouse gathers your web pages, PDFs and videos into one room a buyer can read end to end. See who opened it, what they read and for how long. Free to start.';
/** One plain definition, reused wherever a search or answer engine might quote it. */
export const SITE_DEFINITION =
  'Pipemouse is a sales room platform for B2B sales and marketing teams. A seller gathers web pages, PDFs and videos into one room, sends each buyer a personal link, and sees who opened it, which items they read and for how long.';
/** The date the legal pages were last changed. */
export const LEGAL_UPDATED = '12 November 2026';
