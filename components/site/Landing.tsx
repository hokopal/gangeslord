import Link from 'next/link';
import { FAQ } from '@/lib/faq';
import { OS_DEFINITION, OS_NAME, ROOMS_DEFINITION, ROOMS_NAME, SITE_DEFINITION, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { RoomDemo } from './RoomDemo';
import { SiteFooter, SiteHeader } from './SiteChrome';
import { SuiteDemo } from './SuiteDemo';

const START = '/login';

const STEPS = [
  {
    title: 'Bring customer context together',
    body: 'Pipemouse OS gives your team a flexible CRM for companies, contacts, deals, pipelines, and custom objects, so account knowledge does not disappear between tools.',
  },
  {
    title: 'Put routine work in motion',
    body: 'Use workflows and AI agents to support enrichment, follow-ups, and handoffs while your team keeps control of the decisions that need a human.',
  },
  {
    title: 'Give buyers a clear path forward',
    body: 'Rooms turns pages, PDFs, and videos into a guided, branded experience with a personal link for every stakeholder and no buyer sign-in required.',
  },
  {
    title: 'Act on real engagement',
    body: 'See what buyers read, watch, ask, and click. Route those signals into Slack, HubSpot, and the rest of your stack so every follow-up starts with evidence.',
  },
];

const TEAMS = [
  {
    who: 'Marketing',
    line: 'Turn campaigns into conversations buyers want to continue.',
    points: [
      'Import a HubSpot segment and create a personal Room for every contact, ready for your next campaign or sequence.',
      'Use merge fields to make each welcome, title, and call to action relevant to the person opening it.',
      'Learn which pages, documents, and videos earn attention across a segment instead of relying on email opens alone.',
      'Give sales a warmer handoff with engagement history attached to the customer story.',
    ],
  },
  {
    who: 'Sales',
    line: 'Give every rep the context and timing to move a deal forward.',
    points: [
      'Work from shared account, contact, deal, and pipeline context in Pipemouse OS instead of reconstructing the story before every call.',
      'Send one guided Room rather than a chain of attachments, with a personal link for every member of the buying group.',
      'Get alerted when a buyer opens, engages, or clicks, then follow up on the exact content that held their attention.',
      'Keep questions, comments, and PDF markup close to the material they concern, so the next conversation picks up where the buyer left off.',
    ],
  },
  {
    who: 'Revenue operations',
    line: 'Build a GTM system around your process, not the other way around.',
    points: [
      'Model your business with custom objects and views, then use workflows to support the handoffs your team repeats every day.',
      'Connect Rooms engagement to HubSpot, Salesforce, Slack, Google Analytics, and the rest of your revenue stack.',
      'Build on GraphQL and REST APIs, webhooks, an SDK, a CLI, and an MCP server for AI assistants.',
      'Keep access deliberate with workspace roles and encrypted Rooms credentials.',
    ],
  },
];

const CONNECTIONS: { group: string; names: string[] }[] = [
  { group: 'CRM and sales engagement', names: ['HubSpot', 'Salesforce', 'Apollo', 'Salesloft', 'Instantly'] },
  { group: 'Marketing and analytics', names: ['Mailchimp', 'Google Analytics'] },
  { group: 'Alerts and automation', names: ['Slack', 'Webhooks for Zapier, Make, n8n, Clay, and custom endpoints'] },
  { group: 'AI and agents', names: ['Pipemouse OS agents', 'Rooms MCP server', 'Anthropic', 'OpenAI', 'Google Gemini', 'OpenRouter', 'Together AI', 'Groq'] },
  { group: 'Developer platform', names: ['GraphQL', 'REST APIs', 'SDK', 'CLI'] },
];

// Search and answer engines receive the same platform, product, and FAQ distinctions as readers.
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg`, description: SITE_DEFINITION },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: 'en' },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#platform`,
      name: SITE_NAME,
      alternateName: 'Pipemouse GTM platform',
      url: SITE_URL,
      description: SITE_DEFINITION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      publisher: { '@id': `${SITE_URL}/#organization` },
      featureList: ['CRM', 'GTM workflows', 'AI agents', 'Digital sales rooms', 'Buyer engagement analytics', 'Developer APIs'],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#os`,
      name: OS_NAME,
      url: `${SITE_URL}/os`,
      description: OS_DEFINITION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      publisher: { '@id': `${SITE_URL}/#organization` },
      isPartOf: { '@id': `${SITE_URL}/#platform` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#rooms`,
      name: ROOMS_NAME,
      alternateName: 'Pipemouse Rooms',
      url: `${SITE_URL}/product`,
      description: ROOMS_DEFINITION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      publisher: { '@id': `${SITE_URL}/#organization` },
      isPartOf: { '@id': `${SITE_URL}/#platform` },
      featureList: ['Personalized digital sales rooms', 'Buyer engagement analytics', 'PDF and video analytics', 'CRM and Slack connections'],
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
            <p className="site-suite-kicker">The connected go-to-market platform</p>
            <h1>Your go-to-market, finally working as one.</h1>
            <p>
              Pipemouse connects your CRM, workflows, AI agents, and buyer-facing sales rooms in one SaaS platform.
              Marketing, sales, and RevOps get the shared context to decide what happens next, and the tools to make it happen.
            </p>
            <div className="site-hero-actions">
              <Link href={START} className="site-btn site-btn-lamp site-btn-lg">
                Get started
              </Link>
              <a href="#platform" className="site-btn site-btn-ghost site-btn-lg">
                Explore the platform
              </a>
            </div>
          </div>
          <SuiteDemo />
        </section>
      </div>

      <main>
        <section className="site-section site-answer" id="what">
          <h2>What is Pipemouse?</h2>
          <p>{SITE_DEFINITION}</p>
        </section>

        <section className="site-section site-suite" id="platform" aria-labelledby="platform-title">
          <h2 id="platform-title">Connect the work behind every customer moment.</h2>
          <p className="site-lede">Pipemouse brings internal GTM execution and buyer engagement into a shared platform, so every team can work with more context and less friction.</p>
          <div className="site-views-grid site-suite-grid">
            <div>
              <p className="site-suite-label">Pipemouse OS</p>
              <h3>Run your GTM motion from one workspace.</h3>
              <p>A flexible CRM, workflows, AI agents, and developer tools for teams that want their customer context and execution in the same place.</p>
              <ul>
                <li>Companies, contacts, deals, pipelines, custom objects, and views</li>
                <li>Workflows and AI agents for enrichment, follow-ups, and handoffs</li>
                <li>Developer tools including GraphQL and REST APIs, an SDK, and a CLI</li>
              </ul>
              <Link href="/os" className="site-suite-link">Discover Pipemouse OS</Link>
            </div>
            <div className="site-views-you">
              <p className="site-suite-label">Rooms</p>
              <h3>Turn buyer attention into your next action.</h3>
              <p>Personalized digital sales rooms that make it easier for buyers to evaluate you, and easier for your team to understand what matters to them.</p>
              <ul>
                <li>Web pages, PDFs, and videos in one guided, branded experience</li>
                <li>Personal links for every buyer, with no sign-in or downloads</li>
                <li>Item, PDF page, video, and visit-level engagement analytics</li>
              </ul>
              <Link href="/product" className="site-suite-link">Discover Rooms</Link>
            </div>
          </div>
        </section>

        <section className="site-section site-views" id="why">
          <h2>Less tool-switching. More forward motion.</h2>
          <p className="site-lede">Pipemouse is designed around a simple idea: GTM works better when customer context, team execution, and buyer signals inform one another.</p>
          <div className="site-views-grid">
            <div>
              <h3>Connected by design</h3>
              <ul>
                <li>Give every team a shared understanding of the account, the deal, and the people involved.</li>
                <li>Carry context from internal planning into a buyer experience that feels considered and relevant.</li>
                <li>Bring buyer engagement back into the workflow so the next action is based on evidence, not guesswork.</li>
                <li>Let marketing, sales, and RevOps work toward the same outcome without forcing them into the same view.</li>
              </ul>
            </div>
            <div className="site-views-you">
              <h3>Flexible where it counts</h3>
              <ul>
                <li>Model your GTM process with custom objects, pipelines, and views in Pipemouse OS.</li>
                <li>Automate repeatable work while keeping people in control of customer-facing decisions.</li>
                <li>Connect your existing stack instead of replacing every tool your team already relies on.</li>
                <li>Use GraphQL and REST APIs, webhooks, MCP, an SDK, and a CLI to build around your process.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="site-section" id="how">
          <h2>From customer context to coordinated action.</h2>
          <p className="site-lede">A connected GTM workflow should feel like one continuous motion, not a series of handoffs between disconnected tools.</p>
          <ol className="site-steps">
            {STEPS.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="site-section site-demo-section" id="rooms-demo">
          <div className="site-demo-copy">
            <p className="site-suite-label">Rooms in action</p>
            <h2>Make it easy for buyers to lean in.</h2>
            <p className="site-lede">Give every stakeholder one clear place to explore your story, then see which content creates momentum. This interactive example shows the buyer experience on top and the seller’s engagement view below.</p>
            <Link href="/product" className="site-suite-link">See how Rooms works</Link>
          </div>
          <RoomDemo />
        </section>

        <section className="site-section site-teams" id="teams">
          <h2>One platform. A sharper day for every GTM team.</h2>
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

        <section className="site-section site-connect" id="integrations">
          <h2>Your stack stays connected. Your data stays useful.</h2>
          <p className="site-lede">Pipemouse works with the tools you already run and gives developers the primitives to build what makes your motion different.</p>
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
          <Link href="/integrations" className="site-suite-link">Explore integrations and developer tools</Link>
        </section>

        <section className="site-section site-faq" id="faq">
          <h2>Straight answers about Pipemouse.</h2>
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
          <h2>Make every GTM motion part of the same story.</h2>
          <div className="site-close-actions">
            <Link href={START} className="site-btn site-btn-lamp site-btn-lg">
              Get started with Pipemouse
            </Link>
            <Link href="/os" className="site-btn site-btn-ghost site-btn-lg">
              Explore Pipemouse OS
            </Link>
          </div>
          <p>Start with the product you need today. Build a more connected GTM motion from there.</p>
        </section>
      </main>

      <SiteFooter home />
    </div>
  );
}
