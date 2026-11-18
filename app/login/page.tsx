import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, FileText, Globe2, MousePointer2 } from 'lucide-react';
import { Logo } from '@/components/ui/Brand';
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
    <main className="site login-shell">
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- the public site's display face, also used on authentication */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" precedence="default" />
      <section className="login-form-panel" aria-labelledby="login-title">
        <div className="login-form-top">
          <Link href="/" className="site-logo" aria-label="Pipemouse home">
            <Logo size={26} />
            <span>Pipemouse</span>
          </Link>
          <Link href="/product" className="login-back">
            Explore the product <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="login-form-content">
          <p className="login-eyebrow">Welcome to Pipemouse</p>
          <h1 id="login-title">Sign in or start free</h1>
          <p className="login-sub">
            Enter your work email and we’ll send you a link. New here? The same link creates your account. Every plan is free.
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
                Continue with Google <span className="badge">Coming soon</span>
              </button>
            </>
          )}
          <p className="login-legal">
            By continuing, you agree to our <Link href="/terms">Terms of service</Link> and <Link href="/privacy">Privacy policy</Link>.
          </p>
        </div>

        <div className="login-form-foot">
          <span>Every plan is free. No card required.</span>
        </div>
      </section>

      <section className="login-promo" aria-labelledby="login-promo-title">
        <div className="login-promo-copy">
          <p className="login-promo-eyebrow">A better buyer experience</p>
          <h2 id="login-promo-title">Send buyers a room, <span>not a pile of links.</span></h2>
          <p>
            Pages, PDFs and videos live in one guided room. Every buyer gets a personal link, and you see exactly what held their attention.
          </p>
        </div>

        <div className="login-room" aria-hidden="true">
          <div className="login-room-head">
            <div>
              <span className="login-room-kicker">Buyer room</span>
              <h3>Acme buying room</h3>
            </div>
            <span className="login-room-live"><span /> Live</span>
          </div>
          <div className="login-room-body">
            <div className="login-room-item">
              <span className="login-room-icon"><Globe2 size={18} /></span>
              <div><strong>Product overview</strong><span>Web page</span></div>
              <span className="login-room-time">2m 18s</span>
            </div>
            <div className="login-room-item">
              <span className="login-room-icon"><FileText size={18} /></span>
              <div><strong>Pricing &amp; rollout.pdf</strong><span>PDF document</span></div>
              <span className="login-room-time">4m 05s</span>
            </div>
          </div>
          <div className="login-room-signal">
            <MousePointer2 size={18} />
            <div>
              <strong>Buyer returned to pricing</strong>
              <p>Alex opened Pricing &amp; rollout.pdf twice today.</p>
            </div>
          </div>
        </div>

        <p className="login-promo-note">One link for them. Real buying signals for you.</p>
      </section>
    </main>
  );
}
