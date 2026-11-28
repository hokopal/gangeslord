export type PlanId = 'starter' | 'pro' | 'business';

export type Plan = {
  id: PlanId;
  name: string;
  /** US dollars per workspace per month. Zero is free. */
  price: number;
  /** Who the plan is for, in one line. */
  audience: string;
  /** How many tracks the plan allows; null means no limit. Enforced by the database. */
  tracks: number | null;
  /** Shown above the feature list for every plan after the first. */
  includes: string | null;
  features: string[];
};

export const TRIAL_DAYS = 7;

/**
 * Every plan is free for now. Each plan's `price` stays its regular price, shown crossed
 * out next to "Free". Set this to false when paid plans switch on and the site reverts to normal pricing.
 */
export const EVERY_PLAN_FREE = true;

/** The plans Pipemouse sells. One price covers the whole workspace, however many people are in it. */
export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    audience: 'For a founder or a first seller who shares rooms one buyer at a time.',
    tracks: 3,
    includes: null,
    features: [
      'Up to 3 tracks',
      'A library for web pages, PDFs and YouTube videos',
      'Personal links that show who opened the room',
      'Engagement by room, by item and by visit',
      'Page-by-page reading time for PDFs, and how much of each video was watched',
      'Lead forms, with your own questions and a consent box',
      'Comments, questions and markup from buyers, with your replies',
      'Your logo and brand colour, with no Pipemouse watermark',
      'AI drafting of tracks, using your own model key',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 20,
    audience: 'For sales and marketing teams sending rooms to whole segments.',
    tracks: 25,
    includes: 'Everything in Starter, and:',
    features: [
      'Up to 25 tracks',
      'Audiences imported from HubSpot segments',
      'A personal link for every contact, with CSV export',
      'Merge fields that greet each buyer by name and company',
      'Tracks that reorder themselves from what buyers read',
      'Form submissions sent to Apollo, Salesforce, Salesloft, Instantly and Mailchimp',
      'Room activity sent to Google Analytics',
      'Alerts in Slack or any webhook when a buyer engages',
      'An MCP server so AI assistants can work with your rooms',
      'Admin, Editor, Seller and Viewer roles',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 49,
    audience: 'For revenue operations wiring Pipemouse into the rest of the stack.',
    tracks: null,
    includes: 'Everything in Pro, and:',
    features: [
      'Unlimited tracks',
      'Room visits logged on the HubSpot contact timeline',
      'A REST API with read-only and read-write keys',
    ],
  },
];

/** What a plan costs today. */
export const priceLabel = (plan: Plan) => (plan.price === 0 || EVERY_PLAN_FREE ? 'Free' : `$${plan.price} a month`);

/** The regular price, shown crossed out beside the current one. Null when there is nothing to cross out. */
export const regularPriceLabel = (plan: Plan) => (plan.price > 0 && EVERY_PLAN_FREE ? `$${plan.price} a month` : null);

/** The price to tell machines about: zero while every plan is free. */
export const currentPrice = (plan: Plan): number => (EVERY_PLAN_FREE ? 0 : plan.price);

export const PRICE_NOTE = `Every Rooms plan is free for now. The crossed-out prices are what they will cost later. Starter stays free for good. When paid plans open, they will be billed monthly per workspace, not per person, and can be cancelled at any time.`;

/** The side-by-side table: one row per thing people compare, one value per plan in the order above. */
export const COMPARISON: { label: string; values: [string, string, string] }[] = [
  { label: 'Price per workspace', values: ['Free', 'Free', 'Free'] },
  { label: 'Card required', values: ['No', 'No', 'No'] },
  { label: 'Tracks (rooms)', values: ['3', '25', 'Unlimited'] },
  { label: 'Team members', values: ['Unlimited', 'Unlimited', 'Unlimited'] },
  { label: 'Buyers and visits', values: ['Unlimited', 'Unlimited', 'Unlimited'] },
  { label: 'Web pages, PDFs and videos', values: ['Yes', 'Yes', 'Yes'] },
  { label: 'Engagement, PDF page and video analytics', values: ['Yes', 'Yes', 'Yes'] },
  { label: 'Lead forms and buyer comments', values: ['Yes', 'Yes', 'Yes'] },
  { label: 'Your branding, no watermark', values: ['Yes', 'Yes', 'Yes'] },
  { label: 'HubSpot audiences and merge fields', values: ['No', 'Yes', 'Yes'] },
  { label: 'Apollo, Salesforce, Salesloft, Instantly, Mailchimp', values: ['No', 'Yes', 'Yes'] },
  { label: 'Google Analytics, Slack and webhook alerts', values: ['No', 'Yes', 'Yes'] },
  { label: 'Self-optimising tracks', values: ['No', 'Yes', 'Yes'] },
  { label: 'MCP server for AI assistants', values: ['No', 'Yes', 'Yes'] },
  { label: 'Visits on the HubSpot timeline', values: ['No', 'No', 'Yes'] },
  { label: 'REST API', values: ['No', 'No', 'Yes'] },
];

export const PLAN_LABEL: Record<string, string> = {
  alpha_trial: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

/** Plans that include the MCP server. Early-access workspaces include everything. */
export const MCP_PLANS: readonly string[] = ['alpha_trial', 'pro', 'business'];
