import { FAQ } from '@/lib/faq';
import { COMPARISON, PLANS, PRICE_NOTE, priceLabel, TRIAL_DAYS } from '@/lib/plans';
import { SITE_DEFINITION } from '@/lib/site';

/**
 * The public site's content pages. Each page is written answer-first: a one-paragraph short answer
 * that a search or answer engine can quote on its own, then sections with descriptive headings, then
 * questions. The same data renders the HTML page, its markdown copy for agents, llms-full.txt and the sitemap.
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
};

export const CONTENT_UPDATED = '2026-11-15';

const INTEGRATIONS: { name: string; group: string; what: string; plan: string }[] = [
  { name: 'HubSpot', group: 'CRM', what: 'Import a segment as an audience with a personal link per contact; log each room visit on the contact timeline; create or update contacts from form submissions.', plan: 'Audiences on Pro, timeline on Business' },
  { name: 'Salesforce', group: 'CRM', what: 'Create or update the person from a room’s lead form, using your own credentials.', plan: 'Pro' },
  { name: 'Apollo', group: 'Sales engagement', what: 'Create or update the contact from a lead form submission.', plan: 'Pro' },
  { name: 'Salesloft', group: 'Sales engagement', what: 'Create or update the person from a lead form submission.', plan: 'Pro' },
  { name: 'Instantly', group: 'Sales engagement', what: 'Add the lead from a form submission to your Instantly workspace.', plan: 'Pro' },
  { name: 'Mailchimp', group: 'Email marketing', what: 'Add or update the subscriber from a form submission, with their consent.', plan: 'Pro' },
  { name: 'Google Analytics', group: 'Analytics', what: 'Send room views and item engagement to your GA4 property.', plan: 'Pro' },
  { name: 'Slack', group: 'Alerts', what: 'A message when a link is opened, when a buyer engages with two or more items, or when they click a button.', plan: 'Pro' },
  { name: 'Webhooks', group: 'Automation', what: 'Engagement events sent to Zapier, Make, n8n, Clay or your own endpoint.', plan: 'Pro' },
  { name: 'MCP server', group: 'AI assistants', what: 'Lets AI assistants look up library content and tracks, read engagement analytics and create personal room links, through the Model Context Protocol.', plan: 'Pro' },
  { name: 'REST API', group: 'Developers', what: 'Read-only and read-write keys for library assets, tracks, links, sessions and analytics.', plan: 'Business' },
  { name: 'Anthropic, OpenAI, Google Gemini, OpenRouter, Together AI, Groq', group: 'AI drafting', what: 'Draft a track from a short brief using your own model key. Your key, your provider, your bill.', plan: 'All plans' },
];

export const MARKETING_PAGES: MarketingPage[] = [
  {
    path: '/product',
    label: 'Product',
    title: 'Sales room software with buyer engagement tracking',
    description: 'How Pipemouse works: build a room from web pages, PDFs and videos, send each buyer a personal link, and see what they read, item by item and page by page.',
    eyebrow: 'Product',
    h1: 'Everything a buyer needs, in one room you can measure.',
    intro: 'Pipemouse turns the links, decks and videos you already send into one room a buyer reads end to end, and tells you exactly what happened inside it.',
    answer: SITE_DEFINITION,
    schemaType: 'WebPage',
    sections: [
      {
        id: 'library',
        heading: 'A library of what you already have',
        paragraphs: ['Add web pages by pasting a link, upload PDFs, and add YouTube videos. Most pages open live inside the room. A page that blocks embedding is saved as a snapshot so it still opens in place.'],
        list: ['Web pages, live or as a snapshot', 'PDFs in a built-in reader with selectable text', 'YouTube videos with play tracking'],
      },
      {
        id: 'tracks',
        heading: 'Tracks: content in the order you want it read',
        paragraphs: ['A track is an ordered list of items from your library, with your own buttons such as “Book a demo”. Publishing a track gives you a room. AI can draft a track from a one-sentence brief using your own model key, and a track can reorder itself from what past buyers engaged with.'],
      },
      {
        id: 'links',
        heading: 'Personal links that identify each buyer',
        paragraphs: ['Every buyer gets a link that is theirs alone, so you know whose room was opened without asking them to sign in. Create links one at a time, or import a HubSpot segment and get a link for every contact, exported as CSV or used as a merge field in your sequences.'],
      },
      {
        id: 'engagement',
        heading: 'Engagement you can trust',
        paragraphs: ['Pipemouse counts active time only while the room is the tab in view and in focus, so a room left open in the background does not inflate the numbers.'],
        list: ['Who opened the room, and on which visit', 'Active time on every item', 'PDF reading time page by page', 'How much of each video was actually played', 'Buttons clicked and forms submitted'],
      },
      {
        id: 'conversation',
        heading: 'Buyers can ask, comment and mark up',
        paragraphs: ['A buyer can leave a question or comment on any item, pin a sticky note to a PDF page, or draw on it. Only the room’s owner and colleagues it is shared with see these, and they reply in the room.'],
      },
      {
        id: 'capture',
        heading: 'Lead forms and personalisation',
        paragraphs: ['Show a lead form on arrival, after a number of seconds, or after a number of items, with your own questions and a consent box. Merge fields greet each buyer by name and company in the welcome note, titles and buttons. Rooms carry your logo and colour with no Pipemouse watermark.'],
      },
      {
        id: 'stack',
        heading: 'Connected to your stack',
        paragraphs: ['Alerts go to Slack or any webhook. Visits are logged on the HubSpot contact timeline. Form submissions reach HubSpot, Salesforce, Apollo, Salesloft, Instantly or Mailchimp. A REST API and an MCP server give your own tools and AI assistants access.'],
      },
    ],
    faq: [
      { q: 'Do buyers need an account to open a room?', a: 'No. A room is a web link that opens in any browser on a phone or laptop, with nothing to install and nothing to sign in to.' },
      { q: 'What content can go in a room?', a: 'Web pages, PDFs and YouTube videos. Pages that block embedding are captured as a snapshot so they still open inside the room.' },
      { q: 'How is time on an item measured?', a: 'Only while the room is the visible, focused tab. For PDFs, time is recorded page by page; for videos, Pipemouse records how much was actually played.' },
    ],
    related: ['/what-is-a-sales-room', '/integrations', '/pricing', '/use-cases/sales'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/pricing',
    label: 'Pricing',
    title: 'Pricing: free to start, $20 or $49 a month per workspace',
    description: `Pipemouse pricing. Starter is free, Pro is $20 a month and Business is $49 a month, per workspace rather than per person, with a ${TRIAL_DAYS}-day free trial.`,
    eyebrow: 'Pricing',
    h1: 'One price for the whole workspace.',
    intro: PRICE_NOTE,
    answer: `Pipemouse has three plans. Starter is free with up to 3 tracks. Pro is $20 a month with up to 25 tracks, HubSpot audiences, merge fields, CRM connections and Slack alerts. Business is $49 a month with unlimited tracks, HubSpot timeline logging and a REST API. Prices are per workspace, not per person, and paid plans start with a ${TRIAL_DAYS}-day free trial.`,
    schemaType: 'WebPage',
    sections: [
      ...PLANS.map((p) => ({
        id: p.id,
        heading: `${p.name}: ${priceLabel(p)}`,
        paragraphs: [p.audience, ...(p.includes ? [p.includes] : [])],
        list: p.features,
      })),
      {
        id: 'compare',
        heading: 'Compare the plans',
        table: { head: ['What you get', ...PLANS.map((p) => p.name)], rows: COMPARISON.map((row) => [row.label, ...row.values]) },
      },
      {
        id: 'billing',
        heading: 'Billing',
        paragraphs: ['Payments are taken by Paddle, which sells Pipemouse as merchant of record and handles sales tax and invoices. Card details go to Paddle and never reach Pipemouse. A workspace admin can switch plan, update the card or cancel from the Plan page at any time.'],
      },
    ],
    faq: [
      { q: 'Is Pipemouse free?', a: 'Starter is free for good, with up to 3 tracks and no card required.' },
      { q: 'Is pricing per user?', a: 'No. Each price covers the whole workspace, however many people are in it.' },
      { q: 'How does the free trial work?', a: `Pro and Business start with ${TRIAL_DAYS} days free. You enter a card to begin, and the first payment is taken when the trial ends. Cancel before then and nothing is charged.` },
      { q: 'What happens if I move down to Starter?', a: 'Nothing is deleted and existing rooms keep working. You cannot create new tracks until you are within Starter’s limit of three.' },
    ],
    related: ['/product', '/integrations', '/faq'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/integrations',
    label: 'Integrations',
    title: 'Integrations: HubSpot, Salesforce, Slack, MCP and more',
    description: 'Pipemouse connects to HubSpot, Salesforce, Apollo, Salesloft, Instantly, Mailchimp, Google Analytics and Slack, with webhooks, a REST API and an MCP server for AI assistants.',
    eyebrow: 'Integrations',
    h1: 'Room activity, where your team already works.',
    intro: 'Every connection uses your own key or account, and every key is encrypted before it is stored.',
    answer: 'Pipemouse integrates with HubSpot, Salesforce, Apollo, Salesloft, Instantly, Mailchimp, Google Analytics and Slack. Webhooks work with Zapier, Make, n8n and Clay. Developers and AI assistants can use the REST API and the MCP server.',
    schemaType: 'CollectionPage',
    sections: [
      {
        id: 'all',
        heading: 'Every integration',
        table: { head: ['Integration', 'Type', 'What it does', 'Plan'], rows: INTEGRATIONS.map((i) => [i.name, i.group, i.what, i.plan]) },
      },
      {
        id: 'mcp',
        heading: 'For AI assistants: the Pipemouse MCP server',
        paragraphs: ['The MCP server lets any AI assistant that supports the Model Context Protocol work with your workspace: look up library content and tracks, read engagement analytics before a call, and create personal room links for named recipients. A read-only key keeps it to looking; a read-write key lets it create links.'],
      },
      {
        id: 'security',
        heading: 'How keys are kept',
        paragraphs: ['API keys, HubSpot tokens and webhook addresses are encrypted before they are stored and are never shown again, even to admins. They can only be replaced or removed.'],
      },
    ],
    faq: [
      { q: 'Does Pipemouse integrate with HubSpot?', a: 'Yes. You can import a HubSpot segment as an audience with a personal link for every contact, log room visits on the contact timeline, and create or update contacts from form submissions.' },
      { q: 'Does Pipemouse work with Zapier?', a: 'Yes, through webhooks. Pipemouse sends events when a buyer opens a room, engages or submits a form, which Zapier, Make, n8n and Clay can receive.' },
      { q: 'Can AI agents use Pipemouse?', a: 'Yes. The MCP server gives AI assistants access to rooms and engagement, and the REST API covers programmatic use.' },
    ],
    related: ['/product', '/use-cases/revenue-operations', '/pricing'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/what-is-a-sales-room',
    label: 'What is a sales room?',
    title: 'What is a sales room? Definition, uses and examples',
    description: 'A sales room is a single web page where a seller gathers everything a buyer needs to read, in a set order, and sees what was read. Here is how sales rooms work and when to use one.',
    eyebrow: 'Guide',
    h1: 'What is a sales room?',
    intro: 'A plain explanation of sales rooms, how they differ from attachments and deal rooms, and what to measure.',
    answer: 'A sales room is a single web page where a seller gathers everything a buyer needs to read, such as product pages, PDFs and videos, in a set order. The buyer opens one link and reads it all in place, and the seller sees what was read and for how long.',
    schemaType: 'Article',
    sections: [
      {
        id: 'how',
        heading: 'How a sales room works',
        list: ['The seller collects the content a buyer needs: pages, decks, case studies and videos.', 'They arrange it in the order it should be read.', 'They send the buyer one personal link instead of several attachments.', 'The buyer reads everything in the browser with no download or sign-in.', 'The seller sees which items were opened and the active time on each.'],
      },
      {
        id: 'why',
        heading: 'Why teams use sales rooms',
        paragraphs: ['Buyers receive more links and attachments than they read. A sales room puts the content in one place, so nothing is lost in an inbox, and gives the seller a signal of real interest to act on. For marketing, the same room can go to a whole segment with a personal link for each contact.'],
      },
      {
        id: 'names',
        heading: 'Other names for a sales room',
        paragraphs: ['Sales rooms are also called digital sales rooms, deal rooms, buyer portals, microsites and content hubs. Deal rooms usually centre on a shared action plan for one large deal. Content-first sales rooms, like Pipemouse, centre on what the buyer reads and can be sent to many buyers at once.'],
      },
      {
        id: 'measure',
        heading: 'What to measure in a sales room',
        list: ['Who opened the room, identified by a personal link', 'Active time per item, counted only while the tab is in view', 'Page-level reading time for PDFs', 'How much of each video was played', 'Return visits, button clicks and questions asked'],
      },
    ],
    faq: [
      { q: 'Is a sales room the same as a digital sales room?', a: 'Yes, the terms are used interchangeably. Some vendors use “digital sales room” for deal workspaces with mutual action plans; a content-first sales room focuses on the material a buyer reads.' },
      { q: 'Does the buyer need to log in to a sales room?', a: 'With Pipemouse, no. The personal link identifies the buyer, so they open it like any web page.' },
    ],
    related: ['/product', '/compare/sales-room-vs-email-attachments', '/compare/content-room-vs-deal-room', '/guides/track-buyer-engagement'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/guides/track-buyer-engagement',
    label: 'Track buyer engagement',
    title: 'How to see if a buyer read what you sent',
    description: 'A practical guide to tracking whether a B2B buyer opened and read your PDFs, pages and videos, and how to act on the signal without guessing.',
    eyebrow: 'Guide',
    h1: 'How to see whether a buyer read what you sent.',
    intro: 'Open rates tell you an email arrived. This guide covers how to know the content inside it was read.',
    answer: 'To see whether a buyer read what you sent, share the content through one tracked link per buyer instead of attachments. A sales room such as Pipemouse records which items each buyer opened, the active time on each, page-by-page reading for PDFs and how much of each video was played.',
    schemaType: 'Article',
    sections: [
      {
        id: 'problem',
        heading: 'Why email tracking is not enough',
        paragraphs: ['Email open tracking is unreliable because mail clients pre-load images, and it says nothing about attachments. Once a PDF is downloaded, there is no record of whether it was read.'],
      },
      {
        id: 'steps',
        heading: 'Step by step',
        list: ['Put the content in one room, in the order it should be read.', 'Create a personal link for each buyer, or import a HubSpot segment to generate them in bulk.', 'Send the link in your email or sequence as a merge field.', 'Turn on a Slack alert for when a buyer engages with two or more items.', 'Before following up, check which items and PDF pages they spent time on.'],
      },
      {
        id: 'signals',
        heading: 'Which signals matter',
        paragraphs: ['A single open is weak evidence. Stronger signals are active time on pricing or security material, engagement with two or more items, a return visit, a button click and a question asked in the room.'],
      },
    ],
    faq: [
      { q: 'Can I see which pages of a PDF a buyer read?', a: 'Yes. Pipemouse records reading time page by page for PDFs opened in its built-in reader.' },
      { q: 'Does tracking count time if the buyer leaves the tab open?', a: 'No. Pipemouse counts time only while the room is the tab in view and in focus.' },
    ],
    related: ['/what-is-a-sales-room', '/use-cases/sales', '/product'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/use-cases/marketing',
    label: 'For marketing',
    title: 'Sales rooms for B2B marketing campaigns',
    description: 'Send a whole HubSpot segment a personalised room, with a personal link per contact, merge fields and item-level engagement across the campaign.',
    eyebrow: 'Use case: marketing',
    h1: 'One campaign, a room for every contact.',
    intro: 'Turn a nurture email full of links into a room each contact reads in place, and learn which content earns attention.',
    answer: 'B2B marketing teams use Pipemouse to send one room to a whole segment. They import a HubSpot segment as an audience, get a personal link for every contact, greet each person by name with merge fields, and see which items earn attention across the campaign.',
    schemaType: 'WebPage',
    sections: [
      { id: 'how', heading: 'How marketing teams use Pipemouse', list: TEAMS_MARKETING() },
      { id: 'results', heading: 'What you learn', paragraphs: ['Item-level engagement across a whole segment shows which case study, page or video is doing the work, so the next campaign leads with it. Tracks can reorder themselves from what buyers engaged with.'] },
    ],
    related: ['/use-cases/account-based-marketing', '/integrations', '/pricing'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/use-cases/account-based-marketing',
    label: 'For ABM',
    title: 'Personalised rooms for account-based marketing',
    description: 'Give every target account a room greeting them by name and company, with a personal link per stakeholder so you can see the buying group engage.',
    eyebrow: 'Use case: ABM',
    h1: 'A room for every account, a link for every stakeholder.',
    intro: 'See which people at a target account are reading, and what.',
    answer: 'For account-based marketing, Pipemouse gives each stakeholder at a target account a personal link to a room that greets them by name and company. Because every link is personal, you can see which members of the buying group engaged and with which content.',
    schemaType: 'WebPage',
    sections: [
      { id: 'how', heading: 'How it works for ABM', list: ['Import the account’s contacts from a HubSpot segment.', 'Use merge fields for name and company in the welcome note and titles.', 'Add your brand colour and logo, with no Pipemouse watermark.', 'Watch engagement per person to map the buying group.', 'Alert the account owner in Slack when a new stakeholder engages.'] },
    ],
    related: ['/use-cases/marketing', '/use-cases/sales', '/integrations'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/use-cases/sales',
    label: 'For sales',
    title: 'Sales rooms for follow-up: know when to call',
    description: 'Send buyers one room instead of attachments, get a Slack alert when they engage, and follow up on what they actually read.',
    eyebrow: 'Use case: sales',
    h1: 'Know when to call, and what to talk about.',
    intro: 'Replace the follow-up email with five attachments with one link, and see what happens next.',
    answer: 'Sales teams use Pipemouse to follow up with one room instead of a pile of attachments. Each buyer gets a personal link, the seller is alerted when the buyer engages, and a visit-by-visit timeline shows what was read before the next call.',
    schemaType: 'WebPage',
    sections: [
      { id: 'how', heading: 'How sales teams use Pipemouse', list: ['A personal link is one buyer’s alone, so you know whose room was opened.', 'Alerts when a link is opened, when a buyer engages with two or more items, and when they click a button.', 'A visit-by-visit timeline of what each buyer opened and how long they stayed.', 'Buyers can ask a question or draw on a PDF page, and you reply inside the room.'] },
    ],
    related: ['/guides/track-buyer-engagement', '/product', '/compare/sales-room-vs-email-attachments'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/use-cases/revenue-operations',
    label: 'For revenue operations',
    title: 'Sales room engagement data for revenue operations',
    description: 'Write room visits to HubSpot, push form submissions to your CRM, control access with roles, and reach everything through a REST API, webhooks and MCP.',
    eyebrow: 'Use case: revenue operations',
    h1: 'It fits the stack you already run.',
    intro: 'Engagement data that lands where your team already reports.',
    answer: 'Revenue operations teams use Pipemouse to bring content engagement into the CRM. Room visits are logged on the HubSpot contact timeline, form submissions create or update people in Salesforce, Apollo, Salesloft, Instantly or Mailchimp, and a REST API, webhooks and an MCP server expose the data.',
    schemaType: 'WebPage',
    sections: [
      { id: 'how', heading: 'What RevOps gets', list: ['Every visit by a known contact written to their HubSpot timeline as one note.', 'Form submissions sent to your CRM using your own keys.', 'Admin, Editor, Seller and Viewer roles.', 'A REST API with read-only and read-write keys, webhooks and an MCP server.', 'Keys encrypted at rest and never shown again.'] },
    ],
    related: ['/integrations', '/pricing', '/use-cases/marketing'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/compare/sales-room-vs-email-attachments',
    label: 'Sales room vs attachments',
    title: 'Sales room vs email attachments: which to send buyers',
    description: 'A side-by-side comparison of sending a B2B buyer a sales room link versus PDFs and links attached to an email.',
    eyebrow: 'Comparison',
    h1: 'Sales room vs email attachments.',
    intro: 'What changes when a buyer gets one room instead of five attachments.',
    answer: 'Email attachments are quick to send but cannot be tracked once downloaded and are easy to lose. A sales room sends one link that opens everything in the browser in a set order and shows the seller who read which item, for how long.',
    schemaType: 'Article',
    sections: [
      {
        id: 'table',
        heading: 'Side by side',
        table: {
          head: ['', 'Email attachments and links', 'Pipemouse sales room'],
          rows: [
            ['What the buyer receives', 'Several files and links', 'One link'],
            ['Reading order', 'Whatever they open first', 'The order you set'],
            ['Works on a phone', 'Depends on file type', 'Yes, in any browser'],
            ['Know it was read', 'No', 'Yes, item by item'],
            ['PDF page-level reading', 'No', 'Yes'],
            ['Buyer can ask a question in place', 'By replying to email', 'Yes, on any item'],
            ['Update content after sending', 'Send again', 'Edit the room; the link stays the same'],
          ],
        },
      },
      { id: 'when', heading: 'When attachments are still fine', paragraphs: ['For a single signed contract or a file a buyer must keep, an attachment is simpler. For anything you want read, a room is better.'] },
    ],
    related: ['/what-is-a-sales-room', '/compare/content-room-vs-deal-room', '/product'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/compare/content-room-vs-deal-room',
    label: 'Content room vs deal room',
    title: 'Content-first sales room vs deal room: the difference',
    description: 'How a content-first sales room like Pipemouse differs from a deal room built around a mutual action plan, and which suits your team.',
    eyebrow: 'Comparison',
    h1: 'Content-first sales room vs deal room.',
    intro: 'Two kinds of tool share the name “digital sales room”. They solve different problems.',
    answer: 'A deal room is a workspace a seller builds for one deal, centred on a shared action plan. A content-first sales room like Pipemouse is built around what the buyer reads: one room can go to a whole segment, each buyer has their own link, and engagement is measured per person and per item.',
    schemaType: 'Article',
    sections: [
      {
        id: 'table',
        heading: 'Side by side',
        table: {
          head: ['', 'Deal room', 'Pipemouse content room'],
          rows: [
            ['Built for', 'One large deal', 'One buyer or a whole segment'],
            ['Centre of the page', 'Mutual action plan', 'The content, in reading order'],
            ['Personal links', 'Often invite-based', 'A link per buyer, generated in bulk'],
            ['Engagement detail', 'Varies', 'Active time per item, PDF page and video'],
            ['Pricing', 'Usually per seat', 'Per workspace, from free'],
          ],
        },
      },
      { id: 'choose', heading: 'Which to choose', paragraphs: ['If your deals are few, large and need a joint plan with procurement, a deal room fits. If you send content to many buyers and need to know who read what, a content-first room fits.'] },
    ],
    related: ['/what-is-a-sales-room', '/compare/sales-room-vs-email-attachments', '/pricing'],
    updated: CONTENT_UPDATED,
  },
  {
    path: '/faq',
    label: 'Questions',
    title: 'Pipemouse questions and answers',
    description: 'Answers to common questions about Pipemouse: what it is, pricing, the free trial, integrations, buyer privacy and how engagement is measured.',
    eyebrow: 'Questions',
    h1: 'Questions people ask first.',
    intro: 'Short, direct answers. If yours is not here, the contact page reaches a person.',
    answer: SITE_DEFINITION,
    schemaType: 'FAQPage',
    sections: [],
    faq: FAQ,
    related: ['/product', '/pricing', '/what-is-a-sales-room'],
    updated: CONTENT_UPDATED,
  },
];

function TEAMS_MARKETING() {
  return [
    'Import a HubSpot segment as an audience and generate a personal link for each person in it.',
    'Greet buyers by name and company with merge fields in the welcome note, titles and buttons.',
    'See which content earns attention across the whole segment, item by item.',
    'Add a lead form with your own questions and a consent box, shown on arrival or once a buyer is engaged.',
    'Send room activity to Google Analytics.',
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
