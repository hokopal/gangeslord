import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/site/SiteChrome';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The terms for using Pipemouse during its alpha: your account, your content, acceptable use, and what Pipemouse does and does not promise.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <SitePage title="Terms of service" intro="The agreement between you and Pipemouse when you use the service. Pipemouse is in alpha, and these terms say plainly what that means.">
      <h2 id="agreement">The agreement</h2>
      <p>
        By creating an account or using Pipemouse, you agree to these terms. If you use Pipemouse for a company, you agree on that company’s behalf and
        confirm you are allowed to.
      </p>

      <h2 id="alpha">Pipemouse is in alpha</h2>
      <p>
        Pipemouse is an early version. Features may change or be removed, the service may be unavailable at times, and data could be lost. It is
        provided as it is, without any promise of uptime or support response. Do not rely on it as the only copy of anything important.
      </p>

      <h2 id="account">Your account</h2>
      <p>
        You sign in with a link sent to your email address, so keep that mailbox secure. You are responsible for what is done through your
        account and for the people you invite to your workspace. Tell us promptly if you think someone else has access.
      </p>

      <h2 id="content">Your content</h2>
      <p>
        You keep ownership of the content you add to Pipemouse. You give Pipemouse permission to store it, copy it and display it as needed to run the
        service for you, including showing it to the people you share rooms with.
      </p>
      <p>
        You confirm that you have the right to use and share everything you add, including web pages you ask Pipemouse to embed or take a snapshot
        of. If you do not have that right, do not add it.
      </p>

      <h2 id="buyers">The people you send rooms to</h2>
      <p>
        Pipemouse records how recipients engage with your rooms. You are responsible for having a lawful reason to contact them and to collect that
        information, and for telling them about it where the law asks you to. You are also responsible for the contact information you import or
        enter.
      </p>

      <h2 id="use">Acceptable use</h2>
      <p>You agree not to use Pipemouse to:</p>
      <ul>
        <li>break the law, or share content that is unlawful, deceptive or infringes someone else’s rights;</li>
        <li>send spam, or contact people who have asked not to be contacted;</li>
        <li>attempt to get into other workspaces, probe or overload the service, or get around its limits;</li>
        <li>distribute malware, or collect information from buyers by deception.</li>
      </ul>
      <p>We may suspend or close a workspace that breaks these terms or puts the service or other people at risk.</p>

      <h2 id="connections">Services you connect</h2>
      <p>
        When you connect another service, such as HubSpot, Slack or an AI provider, your use of it is covered by that service’s own terms. Any
        charges it makes, including for an AI key you supply, are between you and that service.
      </p>

      <h2 id="price">Price</h2>
      <p>
        The Starter plan is free. Pro and Business are paid plans, priced per workspace per month as shown on our pricing page, and each
        starts with a 7-day free trial. Nothing is charged unless a workspace admin chooses a paid plan. If you do, the first payment is taken
        when the trial ends and then monthly until you cancel. You can cancel at any time from the Plan page; the plan stays active until the
        end of the period already paid for, and payments already made are not refunded except where the law requires it. Payments are taken by
        Paddle, which sells Pipemouse as merchant of record and is responsible for tax and invoices; Paddle’s own terms apply to the purchase.
      </p>

      <h2 id="leaving">Leaving Pipemouse</h2>
      <p>
        You can stop using Pipemouse at any time and ask us to delete your workspace. We may end the alpha, or close an account, and will give notice
        where we reasonably can.
      </p>

      <h2 id="liability">What Pipemouse is not responsible for</h2>
      <p>
        To the extent the law allows, Pipemouse is provided without warranties of any kind, and Pipemouse is not liable for indirect or consequential
        losses, lost profits, lost data, or losses arising from decisions made using engagement information. Nothing in these terms limits
        liability that cannot legally be limited.
      </p>

      <h2 id="changes">Changes to these terms</h2>
      <p>
        If these terms change, the date at the top will change with them. If a change is significant, we will tell account holders before it
        takes effect. Continuing to use Pipemouse after that means you accept the new terms.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Questions about these terms go through the <Link href="/contact">contact page</Link>. See also the <Link href="/privacy">privacy policy</Link>.
      </p>
    </SitePage>
  );
}
