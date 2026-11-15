import { TRIAL_DAYS } from '@/lib/plans';
import { SITE_DEFINITION } from '@/lib/site';

/** The questions people ask first, shown on the home page and the FAQ page. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is Pipemouse?',
    a: SITE_DEFINITION,
  },
  {
    q: 'How is Pipemouse different from a digital sales room or deal room?',
    a: 'Most deal rooms are workspaces a seller builds for one deal, centred on a shared action plan. Pipemouse is built around the content: one room can go to a whole segment at once, each buyer gets their own link, and you measure how long each person actually spent on each item.',
  },
  {
    q: 'How much does Pipemouse cost?',
    a: `Every plan is free, including Pro and Business. The crossed-out prices on the pricing page — $20 a month for Pro and $49 a month for Business — are what they will cost later. Each price covers the whole workspace, however many people are in it.`,
  },
  {
    q: 'How does the free trial work?',
    a: `While every plan is free there is no trial and no card. When paid plans open, Pro and Business will start with ${TRIAL_DAYS} days free. You enter a card to begin, and the first payment is taken when the trial ends. Cancel before then and nothing is charged.`,
  },
  {
    q: 'Can I cancel or change plan at any time?',
    a: 'Yes. A workspace admin can switch plan, update the card or cancel from the Plan page. After cancelling, the plan stays active until the end of the period already paid for, then the workspace moves to Starter.',
  },
  {
    q: 'What happens to my rooms if I move down to Starter?',
    a: 'Nothing is deleted. Rooms you already made keep working and buyers can still open them. You cannot create new tracks until you are within Starter’s limit of three.',
  },
  {
    q: 'Who takes the payment?',
    a: 'Paddle. It sells Pipemouse on our behalf, takes the payment, and handles sales tax and invoices. Card details go to Paddle and never reach Pipemouse.',
  },
  {
    q: 'What is a sales room?',
    a: 'A sales room is a single web page where a seller gathers everything a buyer needs to read, such as product pages, PDFs and videos, in a set order. The buyer opens one link and reads it all in place, and the seller sees what was read.',
  },
  {
    q: 'Can buyers ask questions inside a room?',
    a: 'Yes. A buyer can leave a comment or a question on any item, pin a sticky note to a PDF page, or draw on it. Only the person who made the room, and colleagues they share it with, can see what a buyer leaves, and they can reply in the room.',
  },
  {
    q: 'Which tools does Pipemouse connect to?',
    a: 'HubSpot, Salesforce, Apollo, Salesloft, Instantly, Mailchimp, Google Analytics and Slack, plus webhooks that work with Zapier, Make, n8n and Clay. You connect each one with your own key or account. There is also a REST API and an MCP server.',
  },
  {
    q: 'Do buyers need an account or an app?',
    a: 'No. A room is a web link. Buyers open it in any browser, on a phone or a laptop, with nothing to install and nothing to sign in to.',
  },
  {
    q: 'What can I put in a room?',
    a: 'Web pages, PDFs and YouTube videos today. Most pages open live inside the room. Pages that block embedding are captured as a snapshot instead. PDFs open in a built-in reader with selectable text.',
  },
  {
    q: 'How is time on an item measured?',
    a: 'Pipemouse counts time only while the room is the tab in view and in focus, so a room left open in the background does not inflate the numbers. For PDFs it records time page by page, and for videos how much was actually played.',
  },
  {
    q: 'Can I sign in with Google?',
    a: 'Not yet. Google sign-in is coming soon. For now you sign in with a link sent to your work email, so there is no password to set or remember.',
  },
  {
    q: 'How are my keys and tokens kept?',
    a: 'API keys, HubSpot tokens and webhook addresses are encrypted before they are stored and are never shown again, even to admins. They can only be replaced or removed.',
  },
];
