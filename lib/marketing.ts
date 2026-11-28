import { FAQ } from '@/lib/faq';
import { OS_DEFINITION, OS_URL, ROOMS_DEFINITION, SITE_DEFINITION } from '@/lib/site';

/**
 * Public content is answer-first: a quotable definition, descriptive sections, then relevant questions.
 * The same source renders HTML, markdown, llms-full.txt, metadata, and the sitemap.
 */

export type Section = {
  id: string;
  heading: string;
  paragraphs?: string[];
  list?: string[];
  table?: { head: string[]; rows: string[][] };
};

export type Question = { q: string; a: string };

export type MarketingPage = {
  path: string;
  /** Short name for navigation and breadcrumbs. */
  label: string;
  /** The <title>, before the site name is added. */
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  /** Quotable on its own: it must make sense with no surrounding page. */
  answer: string;
  schemaType: 'WebPage' | 'Article' | 'CollectionPage' | 'FAQPage';
  sections: Section[];
  faq?: Question[];
  related: string[];
  updated: string;
  cta?: { label: string; href: string; note: string };
};

export const CONTENT_UPDATED = '2026-11-15';

const INTEGRATIONS: { name: string; product: string; what: string; availability: string }[] = [
  { name: 'Custom objects and views', product: 'OS', what: 'Model your GTM process around the records, relationships, pipelines, and working views your team needs.', availability: 'Available' },
  { name: 'GraphQL and REST APIs', product: 'OS', what: 'Read and write customer data, build custom applications, and connect Pipemouse OS to your own systems.', availability: 'Available' },
  { name: 'Webhooks', product: 'OS', what: 'Send customer and workflow events to the services that need to act on them.', availability: 'Available' },
  { name: 'SDK and CLI', product: 'OS', what: 'Build, publish, and operate applications on the Pipemouse developer platform.', availability: 'Available' },
  { name: 'HubSpot', product: 'Rooms', what: 'Import a segment as an audience with a personal link per contact; log each room visit on the contact timeline; create or update contacts from form submissions.', availability: 'Available' },
  { name: 'Salesforce', product: 'Rooms', what: 'Create or update a person from a room lead form using your own credentials.', availability: 'Available' },
  { name: 'Apollo', product: 'Rooms', what: 'Create or update a contact from a lead form submission.', availability: 'Available' },
  { name: 'Salesloft', product: 'Rooms', what: 'Create or update a person from a lead form submission.', availability: 'Available' },
  { name: 'Instantly', product: 'Rooms', what: 'Add a lead from a form submission to your Instantly workspace.', availability: 'Available' },
  { name: 'Mailchimp', product: 'Rooms', what: 'Add or update a subscriber from a form submission, with their consent.', availability: 'Available' },
  { name: 'Google Analytics', product: 'Rooms', what: 'Send room views and item engagement to your GA4 property.', availability: 'Available' },
  { name: 'Slack', product: 'Rooms', what: 'Send a message when a link is opened, a buyer engages with two or more items, or a buyer clicks a button.', availability: 'Available' },
  { name: 'Webhooks', product: 'Rooms', what: 'Send engagement events to Zapier, Make, n8n, Clay, or your own endpoint.', availability: 'Available' },
  { name: 'MCP server', product: 'Rooms', what: 'Let AI assistants look up content and tracks, read engagement analytics, and create personal room links through the Model Context Protocol.', availability: 'Available' },
  { name: 'REST API', product: 'Rooms', what: 'Use read-only and read-write keys for library assets, tracks, links, sessions, and analytics.', availability: 'Available' },
  { name: 'Anthropic, OpenAI, Google Gemini, OpenRouter, Together AI, Groq', product: 'Rooms', what: 'Draft a track from a short brief using your own model key, provider, and billing relationship.', availability: 'Available' },
];

export const MARKETING_PAGES: MarketingPage[] = [
  {
    path: '/os',
    label: 'Pipemouse OS',
    title: 'Pipemouse OS: CRM, Workflows, and AI Agents for GTM',
    description: 'Pipemouse OS combines a flexible CRM, GTM workflows, AI agents, and developer tools in a connected workspace for revenue teams.',
    eyebrow: 'Pipemouse platform · OS',
    h1: 'The operating system for your go-to-market.',
    intro: 'Give marketing, sales, and RevOps a shared place to understand accounts, run processes, and automate the work between customer moments.',
    answer: OS_DEFINITION,
    schemaType: 'WebPage',
    sections: [
      {
        id: 'crm',
        heading: 'A CRM that adapts to your GTM model',
        paragraphs: ['Your process should shape your workspace, not disappear into a generic data model. Pipemouse OS gives teams a shared system for customer records and daily execution, with the flexibility to represent how your business actually sells.'],
        list: ['Companies, contacts, deals, and pipelines', 'Custom objects and views defined around your process', 'Shared customer context for marketing, sales, and revenue operations', 'A workspace designed for people and AI agents to work from the same records'],
      },
      {
        id: 'execution',
        heading: 'Workflows and AI agents with customer context',
        paragraphs: ['Automation is more useful when it understands the account, the deal, and the work already happening. Pipemouse OS brings workflows and AI agents into the same workspace as your CRM so routine execution can happen closer to the customer context.'],
        list: ['Support follow-ups and handoffs', 'Assist with enrichment and repetitive GTM work', 'Keep teams in control of customer-facing decisions', 'Connect automated work to the rest of your stack'],
      },
      {
        id: 'rooms',
        heading: 'Connect internal execution to the buyer experience',
        paragraphs: ['Rooms opens inside the Pipemouse OS workspace as the buyer-facing product in the suite. Use it to share guided content experiences, mutual action plans, and decks, then bring engagement analytics back into the account conversation. Rooms also works as a standalone product at rooms.pipemouse.com.'],
      },
      {
        id: 'platform',
        heading: 'Extensible by design',
        paragraphs: ['Build on GraphQL and REST APIs, webhooks, an SDK, and a CLI. Pipemouse OS is designed for teams that need a GTM platform they can shape rather than a fixed set of screens.'],
      },
    ],
    faq: [
      { q: 'What is Pipemouse OS?', a: OS_DEFINITION },
      { q: 'Does Pipemouse OS include Rooms?', a: 'Rooms is a separate Pipemouse product that opens inside the OS workspace. It provides buyer-facing rooms and engagement analytics, and it is also available as a standalone app at rooms.pipemouse.com.' },
    ],
    related: ['/product', '/integrations', '/use-cases/revenue-operations'],
    updated: CONTENT_UPDATED,
    cta: { label: 'Open Pipemouse OS', href: OS_URL, note: 'Explore the connected GTM workspace.' },
  },
  {
    path: '/product',
    label: 'Rooms',
    title: 'Digital Sales Room Software with Buyer Tracking | Rooms',
    description: 'Rooms turns pages, PDFs, and videos into personalized digital sales rooms with buyer engagement analytics, lead forms, CRM integrations, and AI support.',
    eyebrow: 'Pipemouse platform · Rooms',
    h1: 'Give every buyer a clear path to yes.',
    intro: 'Replace scattered links and attachments with one guided experience, then use real engagement to make your next conversation more relevant.',
    answer: ROOMS_DEFINITION,
    schemaType: 'WebPage',
    sections: [
      {
        id: 'experience',
        heading: 'One destination for the whole buying story',
        paragraphs: ['Add web pages, upload PDFs, and include YouTube videos in a library your team can reuse. Arrange that material into a track, the order you want a buyer to follow, and publish it as a branded room. Most pages open live in place; pages that block embedding are saved as snapshots.'],
        list: ['A guided reading order instead of a folder of files', 'Your logo, color, welcome message, and calls to action', 'No downloads, new tabs, or buyer account required', 'AI-assisted track drafting from a short brief, using your own model key'],
      },
      {
        id: 'personalization',
        heading: 'Personal for every stakeholder, scalable for your team',
        paragraphs: ['Create a personal link for one buyer or import a HubSpot segment and generate links for an entire audience. Merge fields greet each person by name and company, while every link gives you a clear view of who engaged.'],
        list: ['Personal links created individually or in bulk', 'CSV export for sequences and merge fields', 'Lead forms shown on arrival or after meaningful engagement', 'A consistent room that can still feel relevant to each recipient'],
      },
      {
        id: 'engagement',
        heading: 'Engagement that helps you decide what to do next',
        paragraphs: ['Rooms records active time only while the room is visible and focused, so a background tab does not inflate the signal. See each visit, each item, each PDF page, and how much of every video was actually played.'],
        list: ['Who opened and returned', 'Active time by item and visit', 'Page-by-page PDF reading', 'Video play progress', 'Button clicks, form submissions, comments, and questions'],
      },
      {
        id: 'conversation',
        heading: 'Keep buyer questions close to the content',
        paragraphs: ['A buyer can comment on an item, pin a note to a PDF page, or draw on it. You and the colleagues sharing the room can reply in place, keeping the conversation connected to the material that prompted it.'],
      },
      {
        id: 'workflow',
        heading: 'Bring buyer signals into your GTM workflow',
        paragraphs: ['Send alerts to Slack or a webhook, log visits on HubSpot contact timelines, and route form submissions to Salesforce, Apollo, Salesloft, Instantly, or Mailchimp. Use the REST API or MCP server when your own tools and AI assistants need access.'],
      },
      {
        id: 'suite',
        heading: 'Part of the connected Pipemouse platform',
        paragraphs: ['Rooms is the buyer-facing product in the Pipemouse platform. Pipemouse OS provides the CRM, workflows, AI agents, and developer platform for internal GTM execution. Use Rooms on its own or open it inside Pipemouse OS to connect buyer engagement with the rest of your customer work.'],
      },
    ],
    faq: [
      { q: 'Do buyers need an account to open a room?', a: 'No. A room is a web link that opens in a modern browser on a phone or laptop, with nothing to install and no buyer sign-in.' },
      { q: 'What content can go in a room?', a: 'Web pages, PDFs, and YouTube videos. Pages that block embedding are captured as snapshots so they still open inside the room.' },
      { q: 'How does Rooms measure reading time?', a: 'Active time is counted only while the room is the visible, focused tab. PDFs are measured page by page, and videos by how much was actually played.' },
    ],
    related: ['/os', '/what-is-a-sales-room', '/integrations'],
    updated: CONTENT_UPDATED,
    cta: { label: 'Get started with Rooms', href: '/login', note: 'Create your Pipemouse account and give buyers a clearer path through your content.' },
  },
  {
    path: '/integrations',
    label: 'Integrations',
    title: 'GTM Integrations, APIs, Webhooks, and MCP | Pipemouse',
    description: 'Connect Pipemouse OS and Rooms to your GTM stack with CRM integrations, Slack, webhooks, GraphQL and REST APIs, an SDK, CLI, and MCP.',
    eyebrow: 'Pipemouse platform · Integrations',
    h1: 'Keep your customer context in motion.',
    intro: 'Connect the tools your team already uses, automate the handoffs between them, and build on an open developer platform when your process needs something different.',
    answer: 'Pipemouse connects GTM execution and buyer engagement to your existing stack. Pipemouse OS provides custom objects, GraphQL and REST APIs, webhooks, an SDK, and a CLI. Rooms connects with HubSpot, Salesforce, Apollo, Salesloft, Instantly, Mailchimp, Google Analytics, and Slack, with additional webhooks, a REST API, and an MCP server.',
    schemaType: 'CollectionPage',
    sections: [
      {
        id: 'all',
        heading: 'Integrations and developer capabilities',
        table: { head: ['Product', 'Integration', 'What it enables', 'Availability'], rows: INTEGRATIONS.map((i) => [i.product, i.name, i.what, i.availability]) },
      },
      {
        id: 'mcp',
        heading: 'Give AI assistants a useful GTM context',
        paragraphs: ['The Rooms MCP server lets compatible AI assistants look up library content and tracks, review engagement before a call, and create personal room links for named recipients. A read-only key limits access to lookups; a read-write key also permits link creation. Pipemouse OS separately supports workflows and AI agents working from CRM context.'],
      },
      {
        id: 'security',
        heading: 'Credentials with clear boundaries',
        paragraphs: ['For Rooms, API keys, HubSpot tokens, and webhook addresses are encrypted before storage and are never shown again, even to admins. They can only be replaced or removed. AI drafting uses your own provider key and billing relationship.'],
      },
    ],
    faq: [
      { q: 'Does Pipemouse integrate with HubSpot?', a: 'Yes. Rooms can import a HubSpot segment as an audience with a personal link for every contact, log room visits on the contact timeline, and create or update contacts from form submissions.' },
      { q: 'Does Pipemouse work with Zapier?', a: 'Yes, through Rooms webhooks. Pipemouse sends events when a buyer opens a room, engages, or submits a form, which Zapier, Make, n8n, and Clay can receive.' },
      { q: 'Can developers build on Pipemouse?', a: 'Yes. Pipemouse OS provides GraphQL and REST APIs, webhooks, an SDK, and a CLI. Rooms provides a REST API, webhooks, and an MCP server.' },
    ],
    related: ['/os', '/product', '/use-cases/revenue-operations'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/what-is-a-sales-room',
    label: 'What is a sales room?',
    title: 'What Is a Digital Sales Room? Definition and Examples',
    description: 'Learn what a digital sales room is, how it improves the buyer experience, which engagement signals matter, and when to use one in your GTM motion.',
    eyebrow: 'GTM guide',
    h1: 'What is a digital sales room?',
    intro: 'A practical explanation of the format, the problems it solves, and the difference between a better buyer experience and another place to store files.',
    answer: 'A digital sales room is a shared web destination where a seller organizes the content a buyer needs, such as product pages, PDFs, and videos, into a guided experience. The buyer opens one link instead of managing attachments, and the seller can see which content was read, watched, and acted on.',
    schemaType: 'Article',
    sections: [
      {
        id: 'how',
        heading: 'How a digital sales room works',
        list: ['Collect the pages, documents, and videos a buyer needs to evaluate the purchase.', 'Arrange them in a deliberate order with a clear next action.', 'Create a personal link for the buyer or for each stakeholder in the buying group.', 'Let buyers explore everything in the browser without downloads or sign-in.', 'Use item-level engagement, return visits, clicks, and questions to guide the next conversation.'],
      },
      {
        id: 'why',
        heading: 'Why GTM teams use sales rooms',
        paragraphs: ['B2B purchases involve more content and more stakeholders than a single email can serve well. A sales room gives buyers a persistent destination they can revisit and share, while marketing and sales gain a clearer picture of what creates interest. For revenue operations, those engagement signals can become useful CRM and workflow inputs.'],
      },
      {
        id: 'names',
        heading: 'Sales room, deal room, buyer portal, or content hub?',
        paragraphs: ['These terms overlap. Deal rooms often emphasize a mutual action plan for one complex opportunity. Content-first sales rooms, including Pipemouse Rooms, emphasize the buyer’s reading and viewing experience and can be personalized for one person or generated for an entire segment. Buyer portal and microsite usually describe the same destination from the buyer’s perspective.'],
      },
      {
        id: 'measure',
        heading: 'Which engagement signals are useful?',
        list: ['A known stakeholder opening through a personal link', 'Active time on a specific item while the tab is visible and focused', 'Repeated attention to implementation, security, or product material', 'PDF page-level reading and video play progress', 'Return visits, calls to action, form submissions, and questions'],
      },
    ],
    faq: [
      { q: 'Is a sales room the same as a digital sales room?', a: 'Yes. The terms are used interchangeably. Some vendors use digital sales room for deal workspaces with mutual action plans; content-first rooms focus on what buyers read and watch.' },
      { q: 'Does a buyer need to log in?', a: 'With Pipemouse Rooms, no. A personal link identifies the buyer, so the room opens like any other web page.' },
    ],
    related: ['/product', '/compare/sales-room-vs-email-attachments', '/compare/content-room-vs-deal-room', '/guides/track-buyer-engagement'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/guides/track-buyer-engagement',
    label: 'Track buyer engagement',
    title: 'How to Track Buyer Engagement Beyond Email Opens',
    description: 'Learn how to track whether B2B buyers read your pages, PDFs, and videos, and how to turn buyer engagement into a more relevant sales follow-up.',
    eyebrow: 'GTM guide',
    h1: 'How to know what a buyer actually engaged with.',
    intro: 'An email open is not a buying signal. A more useful picture starts with the content a person chose to spend time on and what they did next.',
    answer: 'To track buyer engagement beyond email opens, share content through a personal tracked link instead of attachments. A digital sales room such as Pipemouse Rooms records which items each buyer opened, active time per item, page-by-page PDF reading, video play progress, return visits, clicks, forms, and questions.',
    schemaType: 'Article',
    sections: [
      {
        id: 'problem',
        heading: 'Why email opens leave too much unsaid',
        paragraphs: ['Mail clients can preload tracking pixels, making opens unreliable, and an open says nothing about what happened to an attachment. Once a PDF is downloaded, the sender usually loses visibility. A personal content link creates a more direct measure of attention because the reading or viewing happens in the tracked experience.'],
      },
      {
        id: 'steps',
        heading: 'A practical buyer engagement workflow',
        list: ['Organize the content into one room with a deliberate reading order.', 'Create a personal link for each buyer, or import a HubSpot segment to generate links in bulk.', 'Send the link through your email or sales sequence as a merge field.', 'Configure Slack or webhook alerts for meaningful engagement rather than every trivial open.', 'Review the items, PDF pages, videos, and return visits before choosing your follow-up.', 'Write the useful signal back to your CRM so the next person has the same context.'],
      },
      {
        id: 'signals',
        heading: 'Separate weak activity from useful intent',
        paragraphs: ['A single open is weak evidence. Stronger signals include sustained attention to decision-stage material, engagement with multiple items, a return visit, a new stakeholder opening a personal link, a call-to-action click, or a question. These signals should inform a relevant conversation, not trigger a generic automated nudge.'],
      },
    ],
    faq: [
      { q: 'Can I see which PDF pages a buyer read?', a: 'Yes. Pipemouse Rooms records active reading time page by page in its built-in PDF reader.' },
      { q: 'Does a background tab inflate engagement?', a: 'No. Rooms counts active time only while the room is the visible, focused tab.' },
    ],
    related: ['/what-is-a-sales-room', '/use-cases/sales', '/product'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/use-cases/marketing',
    label: 'For marketing',
    title: 'GTM Software for B2B Marketing Teams | Pipemouse',
    description: 'Pipemouse helps B2B marketing teams personalize campaigns, create buyer rooms for HubSpot segments, measure content engagement, and improve sales handoffs.',
    eyebrow: 'Use case · Marketing',
    h1: 'Build campaigns around what buyers actually do.',
    intro: 'Connect audience targeting, personalized content experiences, and engagement signals so your next campaign and your next sales handoff start with better evidence.',
    answer: 'B2B marketing teams use Pipemouse to turn a HubSpot segment into personalized buyer experiences, measure which content earns attention, and share useful engagement context with sales. Rooms provides personal links, merge fields, lead forms, and item-level analytics; Pipemouse OS provides the broader CRM and workflow foundation for GTM execution.',
    schemaType: 'WebPage',
    sections: [
      { id: 'how', heading: 'From segment to personal buyer experience', list: TEAMS_MARKETING() },
      { id: 'results', heading: 'Use attention to improve the whole motion', paragraphs: ['Item-level engagement shows which case study, page, or video earns attention across a segment. Use that evidence to refine the campaign, let a track reorder itself from past engagement, and give sales a more specific reason to follow up. Pipemouse OS can keep that signal connected to the broader account and workflow context.'] },
    ],
    related: ['/use-cases/account-based-marketing', '/integrations', '/product'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/use-cases/account-based-marketing',
    label: 'For ABM',
    title: 'Account-Based Marketing Software with Buyer Signals | Pipemouse',
    description: 'Pipemouse helps ABM teams personalize content for target accounts, give every stakeholder a personal link, and understand buying-group engagement.',
    eyebrow: 'Use case · Account-based marketing',
    h1: 'Give every buying group a reason to lean in.',
    intro: 'Make the account feel understood, make the content easy to navigate, and learn which stakeholders are engaging with the decision.',
    answer: 'For account-based marketing, Pipemouse Rooms gives each stakeholder at a target account a personal link to a branded room with name and company personalization. Marketing and sales can see which members of the buying group engaged and which content they used, while Pipemouse OS provides shared account and workflow context.',
    schemaType: 'WebPage',
    sections: [
      { id: 'how', heading: 'A connected ABM workflow', list: ['Import account contacts from a HubSpot segment.', 'Use merge fields for name and company in the welcome note, titles, and buttons.', 'Organize the room around the account’s evaluation journey rather than a generic asset dump.', 'Watch engagement per person to understand the buying group.', 'Alert the account owner when a new stakeholder engages.', 'Keep account context and follow-up work connected in Pipemouse OS.'] },
    ],
    related: ['/use-cases/marketing', '/use-cases/sales', '/integrations'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/use-cases/sales',
    label: 'For sales',
    title: 'Sales Software for Buyer Engagement and Follow-Up | Pipemouse',
    description: 'Pipemouse gives sales teams shared deal context, personalized buyer rooms, engagement alerts, and content-level insight for more relevant follow-up.',
    eyebrow: 'Use case · Sales',
    h1: 'Follow up with context, not another generic nudge.',
    intro: 'Give buyers a clearer way to evaluate you and give every rep a better reason to start the next conversation.',
    answer: 'Sales teams use Pipemouse OS to work from shared account, contact, deal, and pipeline context, and Rooms to give each buyer a guided content experience. Personal links, engagement alerts, and visit-level analytics show who engaged and what they used, helping reps choose a more relevant next step.',
    schemaType: 'WebPage',
    sections: [
      { id: 'how', heading: 'How sales teams use Pipemouse', list: ['Start with the account, stakeholders, deal, and previous activity in Pipemouse OS.', 'Send one personal Room instead of a chain of attachments.', 'Receive alerts when a buyer opens, engages with multiple items, or clicks a call to action.', 'Review a visit-by-visit timeline before the next call.', 'Let buyers ask questions or mark up a PDF in the room, then reply in context.', 'Log useful engagement in HubSpot and route it into the team’s workflow.'] },
    ],
    related: ['/guides/track-buyer-engagement', '/product', '/os'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/use-cases/revenue-operations',
    label: 'For revenue operations',
    title: 'Revenue Operations Software and GTM APIs | Pipemouse',
    description: 'Pipemouse helps RevOps teams model GTM processes, automate workflows, connect buyer engagement to the CRM, and build on open APIs and webhooks.',
    eyebrow: 'Use case · Revenue operations',
    h1: 'Connect the systems. Keep the signal.',
    intro: 'Build a GTM foundation that reflects your process, moves useful data between tools, and stays open enough to evolve with the business.',
    answer: 'Revenue operations teams use Pipemouse OS for flexible CRM objects, views, workflows, AI agents, and developer tools, and Rooms to bring buyer engagement into the revenue stack. HubSpot timeline logging, CRM form routing, roles, REST and GraphQL APIs, webhooks, an SDK, a CLI, and MCP support connected GTM operations.',
    schemaType: 'WebPage',
    sections: [
      { id: 'how', heading: 'What RevOps can build with Pipemouse', list: ['A CRM model with custom objects and views that reflects the company’s GTM process.', 'Workflows for repeatable enrichment, follow-up, and handoff patterns.', 'Known-contact room visits written to HubSpot contact timelines as tidy notes.', 'Lead form submissions routed to Salesforce, Apollo, Salesloft, Instantly, or Mailchimp.', 'Admin, Editor, Seller, and Viewer roles in Rooms.', 'Custom integrations through GraphQL and REST APIs, webhooks, an SDK, a CLI, and MCP.'] },
    ],
    related: ['/integrations', '/os', '/use-cases/marketing'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/compare/sales-room-vs-email-attachments',
    label: 'Sales room vs attachments',
    title: 'Digital Sales Room vs Email Attachments: A Practical Comparison',
    description: 'Compare digital sales rooms with email attachments for buyer experience, content updates, stakeholder access, and engagement tracking.',
    eyebrow: 'Comparison',
    h1: 'Digital sales room vs email attachments.',
    intro: 'Attachments move files. A sales room creates an experience you can guide, update, and learn from.',
    answer: 'Email attachments are convenient for sending a file but difficult to track once downloaded and easy to fragment across a thread. A digital sales room gives buyers one browser link for organized content and gives the sender item-level engagement, return-visit, and interaction data.',
    schemaType: 'Article',
    sections: [
      {
        id: 'table',
        heading: 'Side by side',
        table: {
          head: ['', 'Email attachments and links', 'Pipemouse Rooms'],
          rows: [
            ['What the buyer receives', 'Files and links spread across a message', 'One guided destination'],
            ['Reading order', 'Determined by whatever they open first', 'The order your team sets'],
            ['Mobile experience', 'Depends on file type and local apps', 'Browser-based, with no buyer app required'],
            ['Know what was read', 'Usually no', 'Yes, by item and visit'],
            ['PDF page-level reading', 'No', 'Yes'],
            ['Questions in context', 'A separate email reply', 'Comments and markup on the item'],
            ['Update after sending', 'Send another version', 'Edit the room while the link stays the same'],
          ],
        },
      },
      { id: 'when', heading: 'When an attachment is still the right choice', paragraphs: ['Use an attachment when a recipient must retain or sign a specific file. Use a room when the goal is to help a buyer evaluate material, share it with colleagues, and give your team useful engagement context.'] },
    ],
    related: ['/what-is-a-sales-room', '/compare/content-room-vs-deal-room', '/product'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/compare/content-room-vs-deal-room',
    label: 'Content room vs deal room',
    title: 'Content-First Sales Room vs Deal Room: Key Differences',
    description: 'Understand the difference between a content-first digital sales room and a deal room built around a mutual action plan, and when each fits.',
    eyebrow: 'Comparison',
    h1: 'Content-first sales room vs deal room.',
    intro: 'Both can support a purchase, but they optimize for different parts of the buying journey.',
    answer: 'A deal room is usually a workspace for one complex opportunity, centered on a mutual action plan and deal coordination. A content-first sales room such as Pipemouse Rooms centers on the material buyers read and watch, supports personal links at segment scale, and measures engagement per person and per item.',
    schemaType: 'Article',
    sections: [
      {
        id: 'table',
        heading: 'Side by side',
        table: {
          head: ['', 'Deal room', 'Pipemouse content-first room'],
          rows: [
            ['Primary focus', 'Coordinating one complex opportunity', 'Helping buyers evaluate content'],
            ['Center of the experience', 'Mutual action plan and deal tasks', 'Guided pages, documents, and videos'],
            ['Audience', 'Usually one buying group', 'One buyer, one account, or a whole segment'],
            ['Personalization', 'Often invite-based', 'Personal links generated individually or in bulk'],
            ['Engagement detail', 'Varies by vendor', 'Active time per item, PDF page, video, and visit'],
          ],
        },
      },
      { id: 'choose', heading: 'Which approach fits your motion?', paragraphs: ['Choose a deal room when joint procurement tasks and a mutual plan are the main need. Choose a content-first room when buyers need a clearer content experience and your team needs to understand what different stakeholders actually engaged with. Pipemouse also supports mutual action plans inside the broader suite.'] },
    ],
    related: ['/what-is-a-sales-room', '/compare/sales-room-vs-email-attachments', '/product'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/faq',
    label: 'Questions',
    title: 'Pipemouse Platform Questions and Answers',
    description: 'Answers about Pipemouse OS, Rooms, GTM use cases, integrations, buyer access, engagement tracking, and security.',
    eyebrow: 'Pipemouse platform · Questions',
    h1: 'Straight answers about the Pipemouse platform.',
    intro: 'What the products do, how they work together, and what to expect before you start.',
    answer: SITE_DEFINITION,
    schemaType: 'FAQPage',
    sections: [],
    faq: FAQ,
    related: ['/os', '/product', '/integrations'],
    updated: CONTENT_UPDATED,
  },
];

function TEAMS_MARKETING() {
  return [
    'Import a HubSpot segment as an audience and generate a personal link for each person in it.',
    'Greet buyers by name and company with merge fields in the welcome note, titles, and buttons.',
    'See which content earns attention across the whole segment, item by item.',
    'Add a lead form with your own questions and a consent box, shown on arrival or once a buyer is engaged.',
    'Send room activity to Google Analytics and route useful signals into the team’s workflow.',
  ];
}

export const FAQ_PAGE_PATH = '/faq';

export function pageAt(path: string): MarketingPage {
  const page = MARKETING_PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`No marketing page at ${path}`);
  return page;
}

export const pagesUnder = (prefix: string) => MARKETING_PAGES.filter((p) => p.path.startsWith(`${prefix}/`));

/** A plain markdown copy of a page, for agents and llms-full.txt. */
export function toMarkdown(page: MarketingPage, siteUrl: string): string {
  const lines: string[] = [`# ${page.h1}`, '', `> ${page.answer}`, '', page.intro, ''];
  for (const s of page.sections) {
    lines.push(`## ${s.heading}`, '');
    for (const p of s.paragraphs ?? []) lines.push(p, '');
    if (s.list) lines.push(...s.list.map((item) => `- ${item}`), '');
    if (s.table) {
      lines.push(`| ${s.table.head.join(' | ')} |`, `|${s.table.head.map(() => '---').join('|')}|`);
      lines.push(...s.table.rows.map((row) => `| ${row.join(' | ')} |`), '');
    }
  }
  if (page.faq?.length) {
    lines.push('## Questions', '');
    for (const f of page.faq) lines.push(`### ${f.q}`, '', f.a, '');
  }
  lines.push('## Related', '', ...page.related.map((path) => `- [${pageAt(path).label}](${siteUrl}${path})`), '');
  lines.push(`Source: ${siteUrl}${page.path}`, `Last updated: ${page.updated}`);
  return lines.join('\n');
}
