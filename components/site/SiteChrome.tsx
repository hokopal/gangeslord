import Link from 'next/link';
import { Logo } from '@/components/ui/Brand';
import { pageAt } from '@/lib/marketing';
import { LEGAL_UPDATED } from '@/lib/site';

const START = '/login';

/** The public site's header. `home` uses in-page links; other pages link back to the home page's sections. */
export function SiteHeader(_props: { home?: boolean }) {
  return (
    <header className="site-nav">
      <Link href="/" className="site-logo" aria-label="Pipemouse home">
        <Logo size={24} />
        <span>Pipemouse</span>
        <span className="site-alpha">Alpha</span>
      </Link>
      <nav aria-label="Sections">
        <Link href="/product">Product</Link>
        <Link href="/use-cases/sales">Use cases</Link>
        <Link href="/integrations">Integrations</Link>
        <Link href="/pricing">Pricing</Link>
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

const FOOTER_GROUPS: { title: string; paths: string[] }[] = [
  { title: 'Product', paths: ['/product', '/pricing', '/integrations', '/faq'] },
  { title: 'Use cases', paths: ['/use-cases/marketing', '/use-cases/account-based-marketing', '/use-cases/sales', '/use-cases/revenue-operations'] },
  { title: 'Learn', paths: ['/what-is-a-sales-room', '/guides/track-buyer-engagement', '/compare/sales-room-vs-email-attachments', '/compare/content-room-vs-deal-room'] },
];

export function SiteFooter(_props: { home?: boolean }) {
  return (
    <>
      <nav aria-label="Site map" className="mk-sitemap">
        {FOOTER_GROUPS.map((group) => (
          <div key={group.title}>
            <h2>{group.title}</h2>
            <ul>
              {group.paths.map((path) => (
                <li key={path}>
                  <Link href={path}>{pageAt(path).label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2>For AI agents</h2>
          <ul>
            <li>
              <a href="/llms.txt">llms.txt</a>
            </li>
            <li>
              <a href="/llms-full.txt">llms-full.txt</a>
            </li>
            <li>
              <a href="/sitemap.xml">Sitemap</a>
            </li>
          </ul>
        </div>
      </nav>
    <footer className="site-footer">
      <span className="site-logo">
        <Logo size={18} />
        <span>Pipemouse</span>
      </span>
      <nav aria-label="Footer">
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms of service</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/contact">Contact</Link>
        <Link href={START}>Sign in</Link>
      </nav>
      <span>© 2026 Pipemouse. In alpha.</span>
    </footer>
    </>
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
