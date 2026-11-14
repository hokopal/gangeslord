import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { appOrigin } from '@/lib/origin';
import { safeNextPath } from '@/lib/safe-next';
import { createServerSupabase } from '@/lib/supabase/server';

/** Completes sign-in from a magic link or OAuth redirect, then sends the user on. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get('next'));
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
