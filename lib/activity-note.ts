import { formatDuration } from './analytics';

export type VisitSummary = {
  trackName: string;
  visitor: string;
  startedAt: string;
  /** Items the visitor opened, in the order they opened them. */
  items: { title: string; seconds: number; engaged: boolean }[];
  totalItems: number;
  /** Labels of buttons the visitor clicked. */
  buttons: string[];
  /** Non-private milestones such as a form submission or acceptance. */
  milestones?: string[];
  sessionUrl: string;
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

/**
 * The body of the HubSpot timeline note for one visit. It is rewritten as the visit goes on,
 * so it always describes the visit so far. Everything that came from the buyer or the track is escaped.
 */
export function activityNoteHtml(visit: VisitSummary): string {
  const seconds = visit.items.reduce((sum, item) => sum + item.seconds, 0);
  const engaged = visit.items.filter((item) => item.engaged).length;
  const parts = [
    `<p><strong>Pipemouse room visit: ${escapeHtml(visit.trackName)}</strong></p>`,
    `<p>${escapeHtml(visit.visitor)} opened the room on ${formatWhen(visit.startedAt)}. ` +
      (visit.items.length === 0
        ? 'No items viewed yet.'
        : `Active time so far: ${formatDuration(seconds)} across ${visit.items.length} of ${visit.totalItems} item${visit.totalItems === 1 ? '' : 's'}` +
          `${engaged > 0 ? `, ${engaged} past the engagement threshold` : ''}.`) +
      '</p>',
  ];
  if (visit.items.length > 0) {
    parts.push(
      `<ul>${visit.items
        .map((item) => `<li>${escapeHtml(item.title)}: ${formatDuration(item.seconds)}${item.engaged ? ' (engaged)' : ''}</li>`)
        .join('')}</ul>`,
    );
  }
  const buttons = [...new Set(visit.buttons.map((b) => b.replace(/^[a-z]+:\s*/, '').trim()).filter(Boolean))];
  if (buttons.length > 0) parts.push(`<p>Buttons clicked: ${buttons.map((b) => `“${escapeHtml(b)}”`).join(', ')}</p>`);
  parts.push(`<p><a href="${escapeHtml(visit.sessionUrl)}">View the visit in Pipemouse</a></p>`);
  return parts.join('');
}
