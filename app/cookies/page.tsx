import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/site/SiteChrome';

export const metadata: Metadata = {
  title: 'Cookies',
  description: 'How Pipemouse uses essential, functional, analytics, advertising, and tracking cookies, and the choices available to you.',
  alternates: { canonical: '/cookies' },
};

const COOKIES = [
  { name: 'sb-…-auth-token', where: 'The Pipemouse application', purpose: 'Keeps you signed in to your account.', lasts: 'Until you sign out, refreshed while you use Pipemouse' },
  { name: 'fello_sidebar', where: 'The Pipemouse application', purpose: 'Remembers whether you minimised the sidebar.', lasts: '1 year' },
  { name: 'fello_vid', where: 'Rooms', purpose: 'A random identifier, so a returning visitor to a room is counted as the same visitor.', lasts: '1 year' },
  { name: 'fello_r', where: 'A room opened from a personal link', purpose: 'Remembers the personal link for that room, so a reload still shows the visitor’s own version.', lasts: '30 days' },
  { name: 'Analytics and performance cookies', where: 'The GTM site and Pipemouse applications', purpose: 'Measure visits, usage, performance, and interactions so we can improve our pages, product, and campaigns.', lasts: 'Varies by provider and configuration' },
  { name: 'Advertising and attribution cookies', where: 'The GTM site and our marketing pages', purpose: 'Measure ad performance, attribute visits and conversions, and help deliver or personalize advertising.', lasts: 'Varies by provider and configuration' },
  { name: 'Third-party tracking technologies', where: 'Pages that include analytics, advertising, social media, or embedded content', purpose: 'Allow third parties to recognize your browser and collect information about your interactions across sites and sessions.', lasts: 'Varies by provider and configuration' },
];

export default function CookiesPage() {
  return (
    <SitePage title="Cookies" intro="Pipemouse uses essential, functional, analytics, advertising, and tracking cookies and similar technologies. This page explains what they do and the choices you have.">
      <h2 id="list">The cookies</h2>
      <div className="site-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Where it is set</th>
              <th>What it is for</th>
              <th>How long it lasts</th>
            </tr>
          </thead>
          <tbody>
            {COOKIES.map((cookie) => (
              <tr key={cookie.name}>
                <td>
                  <code>{cookie.name}</code>
                </td>
                <td>{cookie.where}</td>
                <td>{cookie.purpose}</td>
                <td>{cookie.lasts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="advertising">Advertising and tracking</h2>
      <p>
        Pipemouse uses standard analytics, advertising, and tracking cookies and similar technologies, including cookies set by third parties.
        These technologies may collect cookie identifiers, device and browser information, IP addresses, pages visited, referring pages, campaign
        tags, and interactions with our content or ads. They help us understand usage, measure and attribute conversions, and deliver or personalize
        advertising.
      </p>
      <p>
        Some providers may combine information collected on Pipemouse with information from other websites, apps, or services under their own
        policies. Content inside a room, such as an embedded web page or a YouTube video, is loaded from its own website, which may also set its
        own cookies.
      </p>

      <h2 id="control">Controlling cookies</h2>
      <p>
        You can block or delete cookies in your browser’s settings and use any controls offered by your browser or third-party providers. Without
        the sign-in cookie you cannot stay signed in. Without the room cookies a room still opens, but a returning visitor is counted as a new one.
        Blocking some third-party cookies can also affect embedded content.
      </p>
      <p>
        Depending on where you live, you may have the right to opt out of targeted advertising or certain sharing of personal information. To ask
        about these choices, <Link href="/contact">contact us</Link>. More about what is collected and why is in the{' '}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    </SitePage>
  );
}
