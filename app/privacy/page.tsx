import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '@/components/site/SiteChrome';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What information Pipemouse collects, how it is used, who it is shared with, and the choices you have. Includes how Pipemouse handles Google user data.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <SitePage title="Privacy policy" intro="What Pipemouse collects, why, who sees it, and what you can do about it. Written to be read, not skimmed past.">
      <h2 id="who">Who this covers</h2>
      <p>
        Pipemouse is a service that lets a company gather content into a room and share it with the people it is selling to. This policy covers two
        groups: <strong>customers</strong>, who have a Pipemouse account, and <strong>buyers</strong>, who open a room a customer has sent them.
      </p>
      <p>
        When a buyer opens a room, Pipemouse handles their information on behalf of the customer who sent it. That customer decides who receives a
        room and what happens with the results. If a room reached you and you have a question about it, the company that sent it is the best
        place to start, and you can also <Link href="/contact">contact us</Link>.
      </p>

      <h2 id="collect">What we collect</h2>
      <p>From customers:</p>
      <ul>
        <li>Your email address, which is how you sign in, and the name of your workspace.</li>
        <li>The content you add: links to web pages, uploaded PDFs, video links, snapshots of pages, and the tracks you build from them.</li>
        <li>The connections you set up, such as a HubSpot token, a Slack or webhook address, or an AI provider key. These are encrypted before they are stored and are never shown again.</li>
        <li>Contacts you import from HubSpot or enter by hand so that each can be sent a personal link: name, email address, company and any other properties you choose to import.</li>
        <li>Messages you send us through the contact page.</li>
        <li>If you take a paid plan: which plan, its status and renewal date. The payment itself, your card and your billing address go to Paddle, our payment provider and merchant of record, and never reach Pipemouse.</li>
      </ul>
      <p>From buyers who open a room:</p>
      <ul>
        <li>A random identifier kept in a cookie, so a returning visitor is counted as the same visitor.</li>
        <li>What happened in the room: which items were opened, the active time on each, and which buttons were clicked.</li>
        <li>The country the visit came from, the page that linked to the room, and any campaign tags in the link.</li>
        <li>If the room was opened through a personal link, the name, email address and company the customer attached to that link.</li>
        <li>What the visitor chooses to leave: answers to a form in the room, and any comments, questions, notes or drawings. If the customer has connected other tools, form answers are passed on to them.</li>
      </ul>
      <p>
        Pipemouse does not store buyers’ IP addresses in its own records. The companies that host Pipemouse keep standard server logs, which can include IP
        addresses, for security and reliability.
      </p>

      <h2 id="google">Google user data</h2>
      <p>Sign-in with Google is planned and not yet available. When it is, this is everything Pipemouse will do with information from your Google account:</p>
      <ul>
        <li><strong>What we access:</strong> your name, your email address and your profile picture. Pipemouse asks for nothing else: no email, calendar, contacts or files.</li>
        <li><strong>How we use it:</strong> only to create your Pipemouse account and sign you in to it.</li>
        <li><strong>How we store it:</strong> with the rest of your account record, protected in the same way, for as long as your account exists.</li>
        <li><strong>Who we share it with:</strong> nobody, apart from the hosting providers listed below that run Pipemouse for us.</li>
      </ul>
      <p>
        Pipemouse’s use of information received from Google APIs follows the Google API Services User Data Policy, including its Limited Use
        requirements. We do not sell Google user data, use it for advertising, or use it to train AI models.
      </p>

      <h2 id="use">How we use information</h2>
      <ul>
        <li>To run the service: show rooms, record engagement, and report it to the customer who owns the room.</li>
        <li>To send the customer the alerts and CRM updates they have switched on.</li>
        <li>To keep Pipemouse secure, prevent abuse, and fix problems.</li>
        <li>To reply when you contact us.</li>
      </ul>
      <p>We do not sell personal information, and we do not use it for advertising.</p>

      <h2 id="share">Who we share it with</h2>
      <p>Companies that run Pipemouse for us:</p>
      <ul>
        <li>Supabase, which provides the database, sign-in and file storage.</li>
        <li>Vercel, which hosts the website and application.</li>
      </ul>
      <p>Services a customer chooses to connect, which receive only what that connection needs:</p>
      <ul>
        <li>HubSpot: contacts are read from it, and room links and visit notes can be written back to it.</li>
        <li>Slack, or another address the customer supplies: alerts about room activity.</li>
        <li>An AI provider the customer selects: the customer’s brief, and the titles and descriptions of items in their library, to draft a track.</li>
      </ul>
      <p>We may also disclose information if the law requires it.</p>

      <h2 id="keep">How long we keep it</h2>
      <p>
        Account information, content and engagement data are kept for as long as the workspace exists. Deleting a track removes its visits.
        Deleting a workspace removes its content, contacts, visits and stored files. You can ask us to delete your account or your information at
        any time.
      </p>

      <h2 id="security">How we protect it</h2>
      <p>
        Pipemouse is served over encrypted connections. Each workspace’s data is separated from every other workspace’s by access rules in the
        database. Keys and tokens are encrypted before they are stored. No system is perfectly secure, so please do not put
        information in it that you could not afford to have exposed.
      </p>

      <h2 id="choices">Your choices</h2>
      <p>
        You can ask for a copy of the information we hold about you, ask us to correct it, or ask us to delete it. Depending on where you live, you
        may have further rights under local law, such as objecting to how your information is used. To make any of these requests,{' '}
        <Link href="/contact">contact us</Link> and choose “Privacy or my data”.
      </p>
      <p>
        Pipemouse stores information with hosting providers that may be in a different country from yours. Pipemouse is not intended for children and
        should not be used by anyone under 16.
      </p>

      <h2 id="changes">Changes to this policy</h2>
      <p>
        If this policy changes, the date at the top will change with it. If a change affects how we use information we already hold, we will tell
        account holders before it takes effect.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Questions about this policy or about your information go through the <Link href="/contact">contact page</Link>. See also the{' '}
        <Link href="/cookies">cookie list</Link> and the <Link href="/terms">terms of service</Link>.
      </p>
    </SitePage>
  );
}
