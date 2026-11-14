import { MARKETING_PAGES } from '@/lib/marketing';
import { COMPARISON, PLANS, PRICE_NOTE, priceLabel } from '@/lib/plans';
import { SITE_DEFINITION, SITE_URL } from '@/lib/site';

/** A plain-text summary of Pipemouse for AI assistants and answer engines, following the llms.txt convention. */
export function GET() {
  const body = `# Pipemouse

> ${SITE_DEFINITION}

A sales room is a single web page where a seller gathers everything a buyer needs to read, in a set order. The buyer opens one link and reads it all in place, and the seller sees what was read.

## What Pipemouse does

- A seller adds web pages, PDFs and YouTube videos to a library, then arranges them into a track.
- A published track is a room: one link where a buyer reads every item in place, with no downloads, new tabs or sign-in.
- A personal link identifies each buyer. Pipemouse records which items they opened and the active time on each, counted only while the room is the tab in view.
- A HubSpot segment can be imported as an audience, with a personal link generated for every contact.
- Rooms can greet each buyer by name and company using merge fields.
- A track can reorder itself from what past buyers engaged with.
- Sellers can be alerted in Slack or by webhook, and visits can be logged on the HubSpot contact timeline.
- AI can draft a track from a brief, using the customer's own key for Anthropic, OpenAI, Google Gemini, OpenRouter, Together AI or Groq.
- PDFs open in a built-in reader. Pipemouse records reading time page by page, and for YouTube videos how much was actually played.
- A room can show a lead form on arrival, after some seconds, or after some items, with the seller's own questions and a consent box.
- Buyers can leave comments and questions, pin sticky notes to PDF pages and draw on them. Only the room's owner and colleagues it is shared with can see these, and they can reply in the room.
- Form submissions can create or update the person in HubSpot, Apollo, Salesforce, Salesloft, Instantly or Mailchimp, each connected with the customer's own key. Room activity can be sent to Google Analytics.
- Webhooks work with Zapier, Make, n8n and Clay.
- A REST API and an MCP server give programmatic access.

## Who it is for

B2B marketing teams running campaigns to a segment, sales teams following up on what a buyer read, and revenue operations teams connecting engagement data to their CRM.

## Plans and pricing

${PRICE_NOTE}

${PLANS.map((plan) => `- ${plan.name}: ${priceLabel(plan)}. ${plan.audience} ${plan.tracks === null ? 'Unlimited tracks.' : `Up to ${plan.tracks} tracks.`}`).join('\n')}

| | ${PLANS.map((plan) => plan.name).join(' | ')} |
|---|---|---|---|
${COMPARISON.map((row) => `| ${row.label} | ${row.values.join(' | ')} |`).join('\n')}

Payments are taken by Paddle, which sells Pipemouse as merchant of record and handles tax and invoices.

## Pages

- [Home](${SITE_URL}/): what Pipemouse is, how it works, plans, pricing and common questions
${MARKETING_PAGES.map((p) => `- [${p.label}](${SITE_URL}${p.path}): ${p.description} Markdown: ${SITE_URL}/md${p.path}`).join('\n')}
- [Full site content in one file](${SITE_URL}/llms-full.txt)
- [Privacy policy](${SITE_URL}/privacy)
- [Terms of service](${SITE_URL}/terms)
- [Cookies](${SITE_URL}/cookies)
- [Contact](${SITE_URL}/contact)
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
