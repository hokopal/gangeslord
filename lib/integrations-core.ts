export const INTEGRATION_KINDS = ['slack', 'webhook'] as const;
export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];

export const isIntegrationKind = (value: unknown): value is IntegrationKind =>
  typeof value === 'string' && (INTEGRATION_KINDS as readonly string[]).includes(value);

export const ALERT_EVENTS = ['link_opened', 'binge', 'cta_click', 'comment', 'accepted'] as const;
export type AlertEvent = (typeof ALERT_EVENTS)[number];

export const EVENT_LABEL: Record<AlertEvent, { title: string; detail: string }> = {
  link_opened: { title: 'Personal link opened', detail: 'A named recipient opens the room from their personal link.' },
  binge: { title: 'Binge session', detail: 'A visitor passes the engagement threshold on two or more items in one visit.' },
  cta_click: { title: 'Button clicked', detail: 'A visitor clicks one of the room’s buttons. Sent once per visit.' },
  comment: { title: 'Comment or question left', detail: 'A visitor leaves a comment or question in the room. Sent once per visit; the text itself stays in Guest notes.' },
  accepted: { title: 'Proposal accepted', detail: 'A visitor accepts and signs the room. Sent once per visit; the signature stays on the Mutual plan page.' },
};

export const INTEGRATION_INFO: Record<IntegrationKind, { name: string; summary: string; urlLabel: string; urlHelp: string; placeholder: string }> = {
  slack: {
    name: 'Slack',
    summary: 'Post an alert to a Slack channel when buyers engage.',
    urlLabel: 'Incoming webhook URL',
    urlHelp: 'In Slack, create an app with Incoming Webhooks turned on, add a webhook for the channel you want, and paste its URL here.',
    placeholder: 'https://hooks.slack.com/services/…',
  },
  webhook: {
    name: 'Webhook',
    summary: 'Send the same alerts as JSON to any system that accepts a web address, such as a CRM, Zapier or Make.',
    urlLabel: 'Endpoint URL',
    urlHelp: 'Pipemouse sends a POST request with a JSON body to this address. It must start with https://.',
    placeholder: 'https://example.com/hooks/fello',
  },
};

/** Keeps only known events, without duplicates, in a stable order. */
export function normalizeEvents(values: readonly unknown[]): AlertEvent[] {
  return ALERT_EVENTS.filter((event) => values.includes(event));
}

/** Checks the shape of a connection address. Throws slack_url_invalid or webhook_url_invalid. */
export function parseConnectionUrl(kind: IntegrationKind, raw: string): URL {
  const code = kind === 'slack' ? 'slack_url_invalid' : 'webhook_url_invalid';
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(code);
  }
  if (url.protocol !== 'https:' || url.username || url.password || raw.trim().length > 500) throw new Error(code);
  if (kind === 'slack' && (url.hostname !== 'hooks.slack.com' || !url.pathname.startsWith('/services/'))) throw new Error(code);
  return url;
}

/** A recognisable but harmless reminder of which address is connected: the host and the last four characters. */
export function connectionHint(url: URL): string {
  const tail = (url.pathname + url.search).replace(/\/+$/, '');
  return `${url.hostname}/…${tail.slice(-4)}`;
}

export type AlertDetails = {
  workspaceName: string;
  trackName: string;
  /** Name or email when known. */
  visitor: string | null;
  account: string | null;
  sessionUrl: string;
  /** For button clicks: which button. */
  button?: string;
};

const escapeSlack = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function who(details: AlertDetails): string {
  if (!details.visitor) return 'An anonymous visitor';
  return details.account ? `${details.visitor} (${details.account})` : details.visitor;
}

/** The one-line Slack message for an alert. Buyer-supplied text is escaped so it cannot inject links or mentions. */
export function slackText(event: AlertEvent, details: AlertDetails): string {
  const person = `*${escapeSlack(who(details))}*`;
  const track = `*${escapeSlack(details.trackName)}*`;
  const link = `<${details.sessionUrl}|View the visit>`;
  if (event === 'link_opened') return `${person} opened ${track}. ${link}`;
  if (event === 'binge') return `${person} is engaging closely with ${track}: two or more items past the engagement threshold. ${link}`;
  // What they wrote is private to the room's owner, so the alert says only that there is something to read.
  if (event === 'comment') return `${person} left a comment or question in ${track}. The room’s owner can read it under Guest notes. ${link}`;
  if (event === 'accepted') return `${person} accepted and signed ${track}. ${link}`;
  const button = details.button ? ` “${escapeSlack(details.button.replace(/^[a-z]+:\s*/, ''))}”` : ' a button';
  return `${person} clicked${button} in ${track}. ${link}`;
}

/** The JSON body sent to a generic webhook. */
export function webhookPayload(event: AlertEvent | 'test', details: AlertDetails, occurredAt: string) {
  return {
    event,
    occurred_at: occurredAt,
    workspace: details.workspaceName,
    track: details.trackName,
    visitor: details.visitor,
    account: details.account,
    button: details.button ?? null,
    session_url: details.sessionUrl,
  };
}
