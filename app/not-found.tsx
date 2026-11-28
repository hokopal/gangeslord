import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

/** The public 404: same chrome as the marketing pages, with the few places people actually want. */
export default function NotFound() {
  return (
    <div className="site">
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- the public site's display face */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" precedence="default" />
      <div className="site-top">
        <SiteHeader />
        <div className="site-page-head">
          <p className="mk-eyebrow">404</p>
          <h1 className="text-balance">That page isn&rsquo;t here.</h1>
          <p className="text-pretty">The link may be old, or the page may have moved. These are the pages people usually want instead.</p>
        </div>
      </div>

      <main className="site-prose mk-main">
        <article>
          <section aria-labelledby="not-found-pages">
            <h2 id="not-found-pages">Pages that exist</h2>
            <ul>
              <li>
                <Link href="/">Home</Link>: what Pipemouse is and where to start.
              </li>
              <li>
                <Link href="/os">Pipemouse OS</Link>: the CRM, workflows, AI agents, and developer platform.
              </li>
              <li>
                <Link href="/product">Rooms</Link>: personalized buyer rooms and engagement analytics.
              </li>
              <li>
                <Link href="/pricing">Rooms pricing</Link>: every Rooms plan is free today; future prices are crossed out.
              </li>
              <li>
                <Link href="/faq">Platform questions</Link>: answers about products, pricing, logins, and data.
              </li>
              <li>
                <Link href="/contact">Contact</Link>: a person replies, usually the same day.
              </li>
            </ul>
          </section>
        </article>
      </main>

      <section className="site-close">
        <h2>Make your next customer interaction count.</h2>
        <Link href="/login" className="site-btn site-btn-lamp site-btn-lg">
          Start with Rooms free
        </Link>
        <p>Every Rooms plan is currently free. No credit card required.</p>
      </section>
      <SiteFooter />
    </div>
  );
}
