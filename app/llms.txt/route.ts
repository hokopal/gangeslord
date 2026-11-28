import { MARKETING_PAGES } from '@/lib/marketing';
import { OS_DEFINITION, OS_URL, ROOMS_DEFINITION, SITE_DEFINITION, SITE_URL } from '@/lib/site';

/** A plain-text summary of Pipemouse for AI assistants and answer engines, following the llms.txt convention. */
export function GET() {
  const body = `# Pipemouse

> ${SITE_DEFINITION}

Pipemouse is a SaaS platform for go-to-market teams. It connects internal customer work with the buyer-facing experience instead of treating them as separate systems.

## Pipemouse OS

${OS_DEFINITION}

- CRM records include companies, contacts, deals, pipelines, custom objects, and views.
- Workflows and AI agents support enrichment, follow-ups, handoffs, and other repeatable GTM work.
- GraphQL and REST APIs, webhooks, an SDK, and a CLI support custom applications and integrations.
- Rooms opens inside the OS workspace as the buyer-facing product in the suite.
- Pipemouse OS: ${OS_URL}

## Rooms

${ROOMS_DEFINITION}

- Add web pages, PDFs, and YouTube videos to a library, then arrange them into a guided track.
- A published track is a room: one link where a buyer reads every item in place, with no downloads, new tabs, or sign-in.
- A personal link identifies each buyer. Rooms records which items they opened and active time only while the room is visible and focused.
- Import a HubSpot segment as an audience and generate a personal link for every contact.
- Merge fields personalize welcomes, titles, and buttons by name and company.
- Tracks can reorder themselves from what past buyers engaged with.
- PDF reading is measured page by page; video analytics measure how much was actually played.
- Buyers can leave comments and questions, pin notes to PDF pages, and draw on them.
- Lead forms can appear on arrival, after some seconds, or after some items, with custom questions and consent.
- Alerts can go to Slack or webhooks, visits can be logged on HubSpot timelines, and form submissions can reach HubSpot, Salesforce, Apollo, Salesloft, Instantly, or Mailchimp.
- Room activity can be sent to Google Analytics. A REST API and MCP server support custom tools and AI assistants.
- AI track drafting uses the customer's own key for Anthropic, OpenAI, Google Gemini, OpenRouter, Together AI, or Groq.

## Who Pipemouse is for

B2B marketing teams personalizing campaigns and measuring content engagement, sales teams coordinating deals and following up on buyer signals, account-based marketing teams mapping buying-group engagement, and revenue operations teams connecting GTM data, workflows, and systems.

## Pages

- [Home](${SITE_URL}/): Pipemouse platform positioning, products, GTM workflows, use cases, and FAQs
${MARKETING_PAGES.map((p) => `- [${p.label}](${SITE_URL}${p.path}): ${p.description} Markdown: ${SITE_URL}/md${p.path}`).join('\n')}
- [Full site content in one file](${SITE_URL}/llms-full.txt)
- [Privacy policy](${SITE_URL}/privacy)
- [Terms of service](${SITE_URL}/terms)
- [Cookies](${SITE_URL}/cookies)
- [Contact](${SITE_URL}/contact)
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
