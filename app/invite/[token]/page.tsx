import { redirect } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { Brand } from '@/components/ui/Brand';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { errorMessage } from '@/lib/messages';
import { getUser } from '@/lib/supabase/server';
import { acceptInvitationAction } from './actions';

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  return (
    <main className="center">
      <div className="card">
        <Brand />
        <h1>Join the workspace</h1>
        <p className="sub">You’re signed in as {user.email}.</p>
        {error ? (
          <>
            <p className="notice notice-error" role="alert">
              {errorMessage(error)}
            </p>
            <form action={signOut}>
              <SubmitButton className="btn btn-block">Sign in with a different email</SubmitButton>
            </form>
          </>
        ) : (
          <form action={acceptInvitationAction}>
            <input type="hidden" name="token" value={token} />
            <SubmitButton className="btn btn-primary btn-block" pendingLabel="Joining…">
              Accept invitation
            </SubmitButton>
          </form>
        )}
      </div>
    </main>
  );
}
