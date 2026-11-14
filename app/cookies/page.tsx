import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/site/SiteChrome';

export const metadata: Metadata = {
  title: 'Cookies',
  description: 'Every cookie Pipemouse sets, what it is for and how long it lasts. Pipemouse uses no advertising or third-party tracking cookies.',
  alternates: { canonical: '/cookies' },
};

const COOKIES = [
  { name: 'sb-…-auth-token', where: 'The Pipemouse application', purpose: 'Keeps you signed in to your account.', lasts: 'Until you sign out, refreshed while you use Pipemouse' },
  { name: 'fello_sidebar', where: 'The Pipemouse application', purpose: 'Remembers whether you minimised the sidebar.', lasts: '1 year' },
  { name: 'fello_vid', where: 'Rooms', purpose: 'A random identifier, so a returning visitor to a room is counted as the same visitor.', lasts: '1 year' },
  { name: 'fello_r', where: 'A room opened from a personal link', purpose: 'Remembers the personal link for that room, so a reload still shows the visitor’s own version.', lasts: '30 days' },
];

export default function CookiesPage() {
  return (
    <SitePage title="Cookies" intro="The complete list of cookies Pipemouse sets. There are four, and none of them is for advertising.">
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

      <h2 id="not">What Pipemouse does not use</h2>
      <p>
        Pipemouse sets no advertising cookies and no third-party tracking cookies, and it does not follow visitors across other websites. The public
        pages of this site set no cookies at all until you sign in.
      </p>
      <p>
        Content inside a room, such as an embedded web page or a YouTube video, is loaded from its own website, which may set its own cookies
        under its own policy.
      </p>

      <h2 id="control">Controlling cookies</h2>
      <p>
        You can block or delete cookies in your browser’s settings. Without the sign-in cookie you cannot stay signed in. Without the room
        cookies a room still opens, but a returning visitor is counted as a new one.
      </p>
      <p>
        More about what is collected and why is in the <Link href="/privacy">privacy policy</Link>.
      </p>
    </SitePage>
  );
}
