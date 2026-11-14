import { NextResponse, type NextRequest } from 'next/server';
import { APP_URL, SITE_URL } from '@/lib/site';
import { updateSession } from '@/lib/supabase/proxy';

// The address Pipemouse had before it got its own domain. Anything that still arrives there,
// such as an old room link, is sent on to the same page at the real address.
const FIRST_HOST = 'salesroom-maininstancelai.vercel.app';

const SITE_HOST = new URL(SITE_URL).host;
const APP_HOST = new URL(APP_URL).host;

// The signed-in app lives on its own address; sign-in (/login) stays on the public site, and the
// session cookie is shared across the parent domain so it carries over. Buyer rooms (/r/), the API
// (/api/) and the sign-in callback (/auth/) answer on both: room links already sent out keep working
// on the public address, and the admin console signs in on the app address.
const APP_PREFIXES = ['/onboarding', '/w', '/invite', '/admin', '/content'];
const SITE_PATHS = new Set(['/login', '/contact', '/privacy', '/terms', '/cookies', '/llms.txt', '/sitemap.xml']);

const isAppPath = (pathname: string) => APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').toLowerCase();
  const { pathname, search } = request.nextUrl;
  const home = isAppPath(pathname) ? APP_URL : SITE_URL;

  if (host === FIRST_HOST && !SITE_URL.includes(FIRST_HOST)) {
    return NextResponse.redirect(`${home}${pathname}${search}`, 308);
  }

  if (SITE_HOST !== APP_HOST) {
    if (host === SITE_HOST && isAppPath(pathname)) {
      return NextResponse.redirect(`${APP_URL}${pathname}${search}`, 307);
    }
    if (host === APP_HOST) {
      if (pathname === '/robots.txt') {
        return new NextResponse('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }
      if (SITE_PATHS.has(pathname)) {
        return NextResponse.redirect(`${SITE_URL}${pathname}${search}`, 307);
      }
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
