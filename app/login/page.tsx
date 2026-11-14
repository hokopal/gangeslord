import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Brand } from '@/components/ui/Brand';
import { appOrigin } from '@/lib/origin';
import { safeNextPath } from '@/lib/safe-next';
import { getUser } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const target = safeNextPath(next);
  if (await getUser()) redirect(`${await appOrigin()}${target}`);

  return (
    <main className="center">
      <div className="card">
        <Link href="/" aria-label="Pipemouse home">
          <Brand />
        </Link>
        <h1>Sign in or start free</h1>
        <p className="sub">
          Enter your work email and we’ll send you a link. New here? The same link creates your account. Starter is free.
        </p>
        {error ? (
          <p className="notice notice-error" role="alert">
            That sign-in link didn’t work. It may have expired, or been opened in a different browser.
            Request a new one below.
          </p>
        ) : null}
        <LoginForm next={target} googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH === '1'} />
        {process.env.NEXT_PUBLIC_GOOGLE_AUTH === '1' ? null : (
          <>
            <div className="divider">or</div>
            <button type="button" className="btn btn-block" disabled aria-disabled="true">
              Continue with Google <span className="badge" style={{ marginLeft: 6 }}>Coming soon</span>
            </button>
          </>
        )}
      </div>
    </main>
  );
}
