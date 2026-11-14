import { NextResponse, type NextRequest } from 'next/server';
import { SITE_URL } from '@/lib/site';
import { updateSession } from '@/lib/supabase/proxy';

// The address Pipemouse had before it got its own domain. Anything that still arrives there,
// such as an old room link, is sent on to the same page at the real address.
const FIRST_HOST = 'salesroom-maininstancelai.vercel.app';

export async function proxy(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host === FIRST_HOST && !SITE_URL.includes(FIRST_HOST)) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, SITE_URL), 308);
  }
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
