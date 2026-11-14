import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { appOrigin } from '@/lib/origin';
import { safeNextPath } from '@/lib/safe-next';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * The emails link here directly with the redirect the sign-in form asked for tucked into
 * `redirect_to`, so the link stays on pipemouse.com. Only its `next` path is kept.
 */
function nextFromRedirect(redirectTo: string | null): string | null {
  if (!redirectTo) return null;
  try {
    return new URL(redirectTo).searchParams.get('next');
  } catch {
    return null;
  }
}

/** Completes sign-in from a magic link or OAuth redirect, then sends the user on. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get('next') ?? nextFromRedirect(searchParams.get('redirect_to')));
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const supabase = await createServerSupabase();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  if (!ok) {
    return NextResponse.redirect(`${origin}/login?error=1&next=${encodeURIComponent(next)}`);
  }
  return NextResponse.redirect(`${await appOrigin()}${next}`);
}
