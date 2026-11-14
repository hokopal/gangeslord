import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { LoginForm } from '@/app/login/LoginForm';
import { getPlatformAdmin } from '@/lib/platform';
import { getUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Pipemouse Admin', robots: { index: false, follow: false } };

/** The platform admin sign-in. Separate from the workspace sign-in, and useless without being on the admin list. */
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [user, admin] = await Promise.all([getUser(), getPlatformAdmin()]);
  if (admin) redirect('/admin');

  return (
    <main className="center">
      <div className="card">
        <h1>Pipemouse Admin</h1>
        {user ? (
          <>
            <p className="sub">
              You are signed in as {user.email}, which does not have access to the admin console. Sign out to use a different account.
            </p>
            <form action={signOut}>
              <button type="submit" className="btn btn-block">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="sub">Sign in with a platform admin account.</p>
            {error ? (
              <p className="notice notice-error" role="alert">
                That sign-in link didn’t work. Request a new one.
              </p>
            ) : null}
            <LoginForm next="/admin" googleEnabled={false} />
          </>
        )}
      </div>
    </main>
  );
}
