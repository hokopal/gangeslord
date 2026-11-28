import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Blocks, PanelsTopLeft } from 'lucide-react';
import { Logo } from '@/components/ui/Brand';
import { OS_URL, SITE_URL } from '@/lib/site';

export function ProductChooser({ roomsHref }: { roomsHref: string }) {
  return (
    <main className="site product-choice-shell">
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- the public site's display face, also used on authentication */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" precedence="default" />
      <header className="product-choice-top">
        <a href={SITE_URL} className="site-logo" aria-label="Pipemouse home">
          <Logo size={26} />
          <span>Pipemouse</span>
        </a>
        <a href={SITE_URL} className="login-back">
          Explore platform <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </header>

      <section className="product-choice-content" aria-labelledby="product-choice-title">
        <p className="product-choice-eyebrow">Welcome to Pipemouse</p>
        <h1 id="product-choice-title">Where would you like to go?</h1>
        <p className="product-choice-sub">Choose the product you want to open.</p>

        <nav className="product-choice-grid" aria-label="Choose a Pipemouse product">
          <a href={OS_URL} className="product-choice-card">
            <span className="product-choice-icon">
              <Blocks size={24} aria-hidden="true" />
            </span>
            <span className="product-choice-card-copy">
              <strong>Pipemouse OS</strong>
              <span>CRM, workflows, AI agents, and developer tools for your go-to-market motion.</span>
            </span>
            <span className="product-choice-action">
              Open Pipemouse OS <ArrowUpRight size={18} aria-hidden="true" />
            </span>
          </a>

          <Link href={roomsHref} className="product-choice-card">
            <span className="product-choice-icon">
              <PanelsTopLeft size={24} aria-hidden="true" />
            </span>
            <span className="product-choice-card-copy">
              <strong>Rooms</strong>
              <span>Personalized sales rooms, content sharing, and buyer engagement analytics.</span>
            </span>
            <span className="product-choice-action">
              Open Rooms <ArrowRight size={18} aria-hidden="true" />
            </span>
          </Link>
        </nav>
      </section>
    </main>
  );
}
