'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';

/** Last-resort error screen for the public site; styled like the pages it replaces. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the digest so support can tie a report to the server log entry.
    console.error(error);
  }, [error]);

  return (
    <div className="site">
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- the public site's display face */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" precedence="default" />
      <div className="site-top">
        <SiteHeader />
        <div className="site-page-head">
          <p className="mk-eyebrow">Something went wrong</p>
          <h1 className="text-balance">That didn&rsquo;t load.</h1>
          <p className="text-pretty">This one is ours, not yours. Try again, or head back to the home page.</p>
        </div>
      </div>

      <main className="site-prose mk-main">
        <article>
          <section aria-labelledby="error-actions">
            <h2 id="error-actions">What you can do</h2>
            <ul>
              <li>
                <button type="button" className="site-btn site-btn-dark" onClick={() => reset()}>
                  Try again
                </button>
              </li>
              <li>
                <Link href="/">Back to the home page</Link>
              </li>
              <li>
                <Link href="/contact">Tell us what happened</Link>
              </li>
            </ul>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
