import type { Room, RoomCta } from './room';

export type MergeFields = Record<string, unknown>;

/** {{firstname}}, {{ contact.firstname }}, or with a fallback: {{firstname|there}}. */
const TOKEN = /\{\{\s*(?:contact\.)?([a-zA-Z][a-zA-Z0-9_]*)\s*(?:\|([^{}]*))?\}\}/g;

export const hasMergeFields = (text: string) => new RegExp(TOKEN.source).test(text);

/** The field names used in a piece of text, lowercased and without duplicates. */
export function mergeFieldNames(text: string): string[] {
  return [...new Set([...text.matchAll(TOKEN)].map((m) => m[1].toLowerCase()))];
}

function valueOf(fields: MergeFields | null, name: string, fallback: string | undefined): string {
  const value = fields?.[name.toLowerCase()];
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return text !== '' ? text : (fallback ?? '').trim();
}

/**
 * Fills merge fields into display text. A field with no value uses its fallback, or disappears.
 * Leftover gaps are tidied so "Welcome, {{firstname}}" reads "Welcome" for an unknown visitor.
 */
export function renderMerge(text: string, fields: MergeFields | null): string {
  if (!text.includes('{{')) return text;
  return text
    .replace(TOKEN, (_, name: string, fallback?: string) => valueOf(fields, name, fallback))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/^[\s,;:]+|[\s,;:]+$/g, '')
    .trim();
}

/**
 * Fills merge fields into a link, encoding each value so it cannot change where the link goes.
 * Returns null unless the result is still a web or email link.
 */
export function renderMergeUrl(url: string, fields: MergeFields | null): string | null {
  const filled = url.includes('{{')
    ? url.replace(TOKEN, (_, name: string, fallback?: string) => encodeURIComponent(valueOf(fields, name, fallback)))
    : url;
  try {
    const parsed = new URL(filled);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? filled : null;
  } catch {
    return null;
  }
}

function cta(button: RoomCta | null | undefined, fields: MergeFields | null): RoomCta | null {
  if (!button) return null;
  const url = renderMergeUrl(button.url, fields);
  const label = renderMerge(button.label, fields);
  return url && label ? { label, url } : null;
}

/** The room as one visitor should see it. With no fields, every merge field shows its fallback. */
export function personalizeRoom(room: Room, fields: MergeFields | null): Room {
  const itemCtas: Record<string, RoomCta> = {};
  for (const [id, button] of Object.entries(room.itemCtas)) {
    const rendered = cta(button, fields);
    if (rendered) itemCtas[id] = rendered;
  }
  return {
    ...room,
    track: { ...room.track, headerTitle: renderMerge(room.track.headerTitle, fields) },
    items: room.items.map((item) => ({
      ...item,
      title: renderMerge(item.title, fields) || 'Untitled',
      description: renderMerge(item.description, fields),
    })),
    headerCta: cta(room.headerCta, fields),
    sidebarCta: cta(room.sidebarCta, fields),
    itemCtas,
  };
}
