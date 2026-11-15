import Link from 'next/link';
import { FAQ } from '@/lib/faq';
import { COMPARISON, PLANS, PRICE_NOTE, currentPrice, priceLabel, regularPriceLabel } from '@/lib/plans';
import { SITE_DEFINITION, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { RoomDemo } from './RoomDemo';
import { SiteFooter, SiteHeader } from './SiteChrome';

const START = '/login';

const STEPS = [
  {
    title: 'Add what you already have',
    body: 'Paste links to your web pages, upload PDFs, add YouTube videos. A page that refuses to be embedded is saved as a snapshot, so it still opens inside the room.',
  },
  {
    title: 'Arrange it into a track',
    body: 'Drag items into the order you want read and add your own buttons, such as “Book a demo”. Or describe the buyer in a sentence and let AI draft the track from your library.',
  },
  {
    title: 'Send each buyer their own link',
    body: 'Create links one at a time, or import a HubSpot segment and get a personal link for every contact, ready to drop into your sequences as a merge field.',
  },
  {
    title: 'Follow up on what they read',
    body: 'See who opened the room, which PDF pages they read, how much of each video they watched and what they asked. Get a Slack message the moment a buyer digs in, and find the visit on their HubSpot record.',
  },
];

const TEAMS = [
  {
    who: 'Marketing',
    line: 'One campaign, a room for every contact.',
    points: [
      'Import a HubSpot segment as an audience and generate a personal link for each person in it.',
      'Greet buyers by name and company with merge fields in the welcome note, titles and buttons.',
      'See which content earns attention across the whole segment, item by item.',
      'A lead form on any room, with your own questions and a consent box, shown on arrival or once a buyer is engaged.',
    ],
  },
  {
    who: 'Sales',
    line: 'Know when to call, and what to talk about.',
    points: [
      'A personal link is one buyer’s alone, so you know whose room was opened without asking them to sign in.',
      'Alerts when a link is opened, when a buyer engages with two or more items, and when they click a button.',
      'A visit-by-visit timeline of what each buyer opened and how long they stayed.',
      'Buyers can ask a question, comment, or draw on a PDF page, and you reply inside the room.',
    ],
  },
  {
    who: 'Revenue operations',
    line: 'It fits the stack you already run.',
    points: [
      'Every visit by a known contact is written to their HubSpot timeline as one tidy note.',
      'Form submissions create or update the person in Apollo, Salesforce, Salesloft, Instantly or Mailchimp, using your own keys.',
      'Admin, Editor, Seller and Viewer roles keep content and connections in the right hands.',
      'A REST API, webhooks and an MCP server for your own tools and AI assistants.',
    ],
  },
];

const CONNECTIONS: { group: string; names: string[] }[] = [
  { group: 'CRM and sales tools', names: ['HubSpot', 'Salesforce', 'Apollo', 'Salesloft', 'Instantly'] },
  { group: 'Marketing and analytics', names: ['Mailchimp', 'Google Analytics'] },
  { group: 'Alerts and automation', names: ['Slack', 'Webhooks for Zapier, Make, n8n, Clay and your own endpoints'] },
  { group: 'AI, with your own key', names: ['Anthropic', 'OpenAI', 'Google Gemini', 'OpenRouter', 'Together AI', 'Groq'] },
  { group: 'For developers', names: ['REST API', 'MCP server'] },
];


// What search and answer engines read to understand the page: who publishes it, what the product is, and the questions it answers.
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg`, description: SITE_DEFINITION },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: 'en' },
    {
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DEFINITION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      publisher: { '@id': `${SITE_URL}/#organization` },
      offers: PLANS.map((plan) => ({
        '@type': 'Offer', name: plan.name, price: String(currentPrice(plan)), priceCurrency: 'USD', description: plan.audience,
        ...(currentPrice(plan) > 0 ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: String(currentPrice(plan)), priceCurrency: 'USD', billingDuration: 'P1M', unitText: 'workspace per month' } } : {}),
      })),
      featureList: PLANS.flatMap((plan) => plan.features),
    },
    { '@type': 'FAQPage', mainEntity: FAQ.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) },
  ],
};

export function Landing() {
  return (
    <div className="site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, '\\u003c') }} />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- one display face, loaded only on the marketing page */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" precedence="default" />

      <div className="site-top">
        <SiteHeader home />

        <section className="site-hero">
          <div className="site-hero-copy">
            <h1>Send buyers a room, not a pile of links.</h1>
            <p>
              Pipemouse gathers your web pages, PDFs and videos into one room a buyer can read from start to finish without leaving. You see
              who opened it, what they read and for how long.
            </p>
            <div className="site-hero-actions">
              <Link href={START} className="site-btn site-btn-lamp site-btn-lg">
                Start free
              </Link>
              <a href="#how" className="site-btn site-btn-ghost site-btn-lg">
                See how it works
              </a>
            </div>
            <p className="site-hero-note">Every plan is free. Sign in with your work email: no password and no card.</p>
          </div>
          <RoomDemo />
        </section>
      </div>

      <section className="site-section site-answer" id="what">
        <h2>What is Pipemouse?</h2>
        <p>{SITE_DEFINITION}</p>
      </section>

      <section className="site-section site-views">
        <h2>One room, seen from both sides.</h2>
        <div className="site-views-grid">
          <div>
            <h3>What your buyer gets</h3>
            <ul>
              <li>One link, with everything in the order you chose.</li>
              <li>Pages, PDFs and videos that open in place, with no downloads and no new tabs.</li>
              <li>Your logo and colour, and a welcome note with their name on it.</li>
              <li>A prompt for what to read next, and your button when they are ready to talk.</li>
              <li>A place to ask a question or mark up a page, without writing an email.</li>
            </ul>
          </div>
          <div className="site-views-you">
            <h3>What you get</h3>
            <ul>
              <li>Who opened the room, through a link that is theirs alone.</li>
              <li>Active time on every item, counted only while they are actually looking.</li>
              <li>Which items they engaged with, which PDF pages they read and how much of each video they watched.</li>
              <li>Their questions and comments, and their details if you ask with a form.</li>
              <li>An alert in Slack and a note on their HubSpot record, while it still matters.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="site-section" id="how">
        <h2>From scattered content to a tracked room in four steps.</h2>
        <ol className="site-steps">
          {STEPS.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="site-section site-teams" id="teams">
        <h2>Built for the people who share the number.</h2>
        {TEAMS.map((team) => (
          <article key={team.who} className="site-team">
            <div>
              <h3>{team.who}</h3>
              <p>{team.line}</p>
            </div>
            <ul>
              {team.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="site-section site-connect">
        <h2>Connects to what you already use.</h2>
        <dl>
          {CONNECTIONS.map((row) => (
            <div key={row.group}>
              <dt>{row.group}</dt>
              <dd>
                {row.names.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="site-section site-plans" id="plans">
        <h2>Plans and pricing</h2>
        <p className="site-lede">{PRICE_NOTE}</p>
        <div className="site-plan-grid">
          {PLANS.map((plan) => (
            <article key={plan.id} className="site-plan" data-plan={plan.id}>
              <h3>{plan.name}</h3>
              <p className="site-plan-price">
                {regularPriceLabel(plan) ? <s className="site-plan-regular">{regularPriceLabel(plan)}</s> : null} {priceLabel(plan)}
              </p>
              <p className="site-plan-audience">{plan.audience}</p>
              {plan.includes ? <p className="site-plan-includes">{plan.includes}</p> : null}
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link href={START} className="site-btn site-btn-dark">
                Start free
              </Link>
            </article>
          ))}
        </div>

        <h3 className="site-compare-title">Compare the plans</h3>
        <div className="site-compare">
          <table>
            <thead>
              <tr>
                <th scope="col">What you get</th>
                {PLANS.map((plan) => (
                  <th key={plan.id} scope="col">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={PLANS[index].id} data-no={value === 'No'}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="site-section site-faq" id="faq">
        <h2>Questions people ask first.</h2>
        <div>
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="site-close">
        <h2>Your next buyer is going to get a link. Make it a room.</h2>
        <Link href={START} className="site-btn site-btn-lamp site-btn-lg">
          Start free
        </Link>
        <p>Set up a workspace in a couple of minutes. Starter is free.</p>
      </section>

      <SiteFooter home />
    </div>
  );
}
