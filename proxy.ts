import { NextResponse, type NextRequest } from 'next/server';
import { resolveWorkspaceDomain } from '@/lib/workspace-domains';
import { MARKETING_PAGES } from '@/lib/marketing';
import { APP_URL, SITE_URL } from '@/lib/site';
import { isValidTitleSlug } from '@/lib/slug';
import { updateSession } from '@/lib/supabase/proxy';

// The address Pipemouse had before it got its own domain. Anything that still arrives there,
// such as an old room link, is sent on to the same page at the real address.
const FIRST_HOST = 'salesroom-maininstancelai.vercel.app';

const SITE_HOST = new URL(SITE_URL).host;
const APP_HOST = new URL(APP_URL).host;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1)(:\d+)?$/;

// The signed-in app lives on its own address; sign-in (/login) stays on the public site, and the
// session cookie is shared across the parent domain so it carries over. Buyer rooms (/r/), the API
// (/api/) and the sign-in callback (/auth/) answer on both: room links already sent out keep working
// on the public address, and the admin console signs in on the app address.
const APP_PREFIXES = ['/onboarding', '/w', '/invite', '/admin', '/content'];
const SITE_PATHS = new Set(['/login', '/contact', '/privacy', '/terms', '/cookies', '/llms.txt', '/llms-full.txt', '/sitemap.xml', ...MARKETING_PAGES.map((p) => p.path)]);
const isSitePath = (pathname: string) => SITE_PATHS.has(pathname) || pathname.startsWith('/md/');
const isAppPath = (pathname: string) => APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0].trim().toLowerCase();
  const { pathname, search } = request.nextUrl;
  const home = isAppPath(pathname) ? APP_URL : SITE_URL;
  const isPlatformHost = !host || host === SITE_HOST || host === APP_HOST || host.endsWith('.vercel.app') || host.endsWith('.v0.build') || LOCAL_HOST.test(host);
  const workspaceSlug = isPlatformHost ? null : await resolveWorkspaceDomain(host, { headers: request.headers });

  if (workspaceSlug) {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
    const next = () => NextResponse.next();
    const notFound = () => new NextResponse('Not found', { status: 404 });

    if (path === '/r/api' || path.startsWith('/r/api/') || path === '/api' || path.startsWith('/api/')) return next();
    if (path === '/r' || path === `/r/${workspaceSlug}` || path.startsWith(`/r/${workspaceSlug}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = path === '/r' ? '/' : path.slice(`/r/${workspaceSlug}`.length) || '/';
      return NextResponse.redirect(url, 307);
    }
    // A verified host serves only its own workspace, never another workspace's rooms.
    if (path.startsWith('/r/')) return notFound();
    if (isAppPath(path)) return NextResponse.redirect(`${APP_URL}${path}${search}`, 307);
    if (path === '/login' || path === '/auth' || path.startsWith('/auth/')) {
      return NextResponse.redirect(`${SITE_URL}${path}${search}`, 307);
    }

    const segments = path.split('/').filter(Boolean);
    const track = segments[0];
    const item = segments[1];
    if (!track || segments.length > 2 || segments.some((segment) => !isValidTitleSlug(segment))) return notFound();
    const url = request.nextUrl.clone();
    url.pathname = `/r/${workspaceSlug}/${track}${item ? `/${item}` : ''}`;
    return NextResponse.rewrite(url);
  }

  // An unbound custom host must never fall through to the canonical room route for another workspace.
  if (!isPlatformHost && (pathname === '/r' || pathname.startsWith('/r/'))) {
    return new NextResponse('Not found', { status: 404 });
  }

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
      if (isSitePath(pathname)) {
        return NextResponse.redirect(`${SITE_URL}${pathname}${search}`, 307);
      }
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
