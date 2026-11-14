import type { Metadata } from 'next';
import Script from 'next/script';
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

const GTM_ID = 'GTM-53XDMNSL';

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
      <body>
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
