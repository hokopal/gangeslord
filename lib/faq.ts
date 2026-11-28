import { SITE_DEFINITION } from '@/lib/site';

/** The questions people ask first, shown on the home page and the FAQ page. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is Pipemouse?',
    a: SITE_DEFINITION,
  },
  {
    q: 'What products does Pipemouse offer?',
    a: 'Pipemouse OS is the CRM, workflow, AI agent, and developer workspace for internal GTM execution. Rooms is the buyer-facing digital sales room product for personalized content and engagement analytics. They can be used together, and Rooms also works on its own.',
  },
  {
    q: 'Who is Pipemouse for?',
    a: 'Pipemouse is built for B2B marketing, sales, account-based marketing, and revenue operations teams that want customer context, team execution, and buyer engagement to inform one another. Teams can start with OS, Rooms, or the product that solves their most immediate problem.',
  },
  {
    q: 'Is Pipemouse a CRM?',
    a: 'Pipemouse OS includes a flexible CRM for companies, contacts, deals, pipelines, custom objects, and views, alongside workflows, AI agents, and developer tools. Rooms is not a CRM; it is the digital sales room and buyer engagement product in the same platform.',
  },
  {
    q: 'How do Pipemouse OS and Rooms work together?',
    a: 'Rooms opens inside the Pipemouse OS workspace, connecting internal account work with buyer-facing content and engagement analytics. OS provides the CRM and workflow context; Rooms provides the guided buyer experience and signals such as reading time, video plays, clicks, forms, and questions.',
  },
  {
    q: 'How much does Pipemouse cost?',
    a: 'Every Rooms plan is currently free, including Pro and Business, and no card is required. Starter stays free for good; the crossed-out prices show planned future per-workspace pricing. Pipemouse OS is not covered by these Rooms prices.',
  },
  {
    q: 'Do buyers need an account to open a Room?',
    a: 'No. A Room is a web link that opens in a modern browser on a phone or laptop. Buyers do not install an app or sign in; the personal link identifies their engagement.',
  },
  {
    q: 'What can I put in a Room?',
    a: 'Web pages, PDFs, and YouTube videos. Most pages open live inside the room, while pages that block embedding are captured as snapshots. PDFs open in a built-in reader with selectable text.',
  },
  {
    q: 'How does Rooms measure buyer engagement?',
    a: 'Rooms counts active time only while the room is the visible, focused tab. It records engagement by item and visit, PDF reading page by page, video play progress, return visits, button clicks, form submissions, comments, and questions.',
  },
  {
    q: 'Which tools does Pipemouse connect to?',
    a: 'Rooms connects to HubSpot, Salesforce, Apollo, Salesloft, Instantly, Mailchimp, Google Analytics, and Slack, plus webhooks for Zapier, Make, n8n, Clay, and custom endpoints. Pipemouse OS and Rooms also provide developer capabilities including GraphQL and REST APIs, webhooks, an SDK, a CLI, and MCP support.',
  },
  {
    q: 'Can AI agents use Pipemouse?',
    a: 'Yes. Pipemouse OS supports AI agents working from CRM and workflow context. Rooms can draft tracks with your own AI provider key and offers an MCP server so compatible assistants can look up content, read engagement, and create personal links with the permissions you choose.',
  },
  {
    q: 'How are Rooms keys and tokens protected?',
    a: 'Rooms API keys, HubSpot tokens, and webhook addresses are encrypted before storage and are never shown again, even to admins. They can only be replaced or removed.',
  },
  {
    q: 'Can I change or cancel a Rooms plan?',
    a: 'Yes. A workspace admin can switch plans, update payment details, or cancel from the Plan page. Existing rooms are not deleted when moving to Starter, but new tracks cannot be created until the workspace is within Starter’s limit of three.',
  },
];
