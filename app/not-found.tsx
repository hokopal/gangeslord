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
                <Link href="/">Home</Link> — what Pipemouse is and where to start.
              </li>
              <li>
                <Link href="/product">Product</Link> — what a room contains and how buyers open it.
              </li>
              <li>
                <Link href="/pricing">Pricing</Link> — every plan is free today; paid plans are crossed out.
              </li>
              <li>
                <Link href="/faq">Questions people ask first</Link> — answers about pricing, logins and data.
              </li>
              <li>
                <Link href="/contact">Contact</Link> — a person replies, usually the same day.
              </li>
            </ul>
          </section>
        </article>
      </main>

      <section className="site-close">
        <h2>Your next buyer is going to get a link. Make it a room.</h2>
        <Link href="/login" className="site-btn site-btn-lamp site-btn-lg">
          Start free
        </Link>
        <p>Every plan is free. No card needed.</p>
      </section>
      <SiteFooter />
    </div>
  );
}
