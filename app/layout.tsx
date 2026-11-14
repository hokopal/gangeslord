import type { Metadata } from 'next';
import './globals.css';
import './library.css';
import './room.css';
import './analytics.css';
import './motion.css';
import './integrations.css';
import './audiences.css';
import './platform.css';
import './responsive.css';
import './site.css';
import './site-pages.css';
import './room-options.css';
import './guest-notes.css';
import './pdf.css';
import './room-sidebar.css';
import './brand.css';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: 'website', siteName: SITE_NAME, title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESCRIPTION, url: SITE_URL, locale: 'en' },
  twitter: { card: 'summary_large_image', title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
