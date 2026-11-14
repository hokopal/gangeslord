import Link from 'next/link';
import { Logo } from '@/components/ui/Brand';
import { LEGAL_UPDATED } from '@/lib/site';

const START = '/login';

/** The public site's header. `home` uses in-page links; other pages link back to the home page's sections. */
export function SiteHeader({ home = false }: { home?: boolean }) {
  const to = (hash: string) => (home ? hash : `/${hash}`);
  return (
    <header className="site-nav">
      <Link href="/" className="site-logo" aria-label="Pipemouse home">
        <Logo size={24} />
        <span>Pipemouse</span>
        <span className="site-alpha">Alpha</span>
      </Link>
      <nav aria-label="Sections">
        <a href={to('#how')}>How it works</a>
        <a href={to('#teams')}>Who it’s for</a>
        <a href={to('#plans')}>Plans</a>
      </nav>
      <div className="site-nav-actions">
        <Link href={START} className="site-link">
          Sign in
        </Link>
        <Link href={START} className="site-btn site-btn-lamp">
          Start free
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter({ home = false }: { home?: boolean }) {
  const to = (hash: string) => (home ? hash : `/${hash}`);
  return (
    <footer className="site-footer">
      <span className="site-logo">
        <Logo size={18} />
        <span>Pipemouse</span>
      </span>
      <nav aria-label="Footer">
        <a href={to('#how')}>How it works</a>
        <a href={to('#plans')}>Plans</a>
        <a href={to('#faq')}>Questions</a>
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms of service</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/contact">Contact</Link>
        <Link href={START}>Sign in</Link>
      </nav>
      <span>© 2026 Pipemouse. In alpha.</span>
    </footer>
  );
}

/** A plain reading page on the public site: the legal pages and the contact page. */
export function SitePage({ title, intro, dated = true, children }: { title: string; intro: string; dated?: boolean; children: React.ReactNode }) {
  return (
    <div className="site">
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- one display face, loaded only on the public site */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" precedence="default" />
      <div className="site-top">
        <SiteHeader />
        <div className="site-page-head">
          <h1>{title}</h1>
          <p>{intro}</p>
          {dated ? <p className="site-page-date">Last updated {LEGAL_UPDATED}</p> : null}
        </div>
      </div>
      <main className="site-prose">{children}</main>
      <SiteFooter />
    </div>
  );
}
