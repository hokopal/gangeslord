import type { HubspotContact } from './hubspot';

export const DEFAULT_PROPERTIES = ['firstname', 'lastname', 'email', 'company', 'jobtitle'] as const;
export const MAX_EXTRA_PROPERTIES = 15;
export const MAX_CONTACTS = 5000;
/** The HubSpot contact property that receives each contact's room link. */
export const LINK_PROPERTY = { name: 'fello_room_link', label: 'Pipemouse room link' };

/**
 * Reads the "extra properties" box: HubSpot internal names separated by commas, spaces or new lines.
 * Throws property_invalid for anything that is not a plausible internal name, or too many.
 */
export function parseExtraProperties(text: string): string[] {
  const names = [...new Set(text.split(/[\s,]+/).map((n) => n.trim().toLowerCase()).filter(Boolean))].filter(
    (n) => !(DEFAULT_PROPERTIES as readonly string[]).includes(n),
  );
  if (names.length > MAX_EXTRA_PROPERTIES || names.some((n) => !/^[a-z][a-z0-9_]{0,99}$/.test(n))) throw new Error('property_invalid');
  return names;
}

const clean = (value: string | null | undefined, max: number) => {
  const text = (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  return text === '' ? null : text;
};

/** The database row for one imported contact. Only the requested properties are kept. */
export function contactRow(contact: HubspotContact, properties: readonly string[]) {
  const kept: Record<string, string> = {};
  for (const name of properties) {
    const value = clean(contact.properties[name], 500);
    if (value !== null) kept[name] = value;
  }
  return {
    external_id: contact.id,
    email: clean(contact.properties.email, 320)?.toLowerCase() ?? null,
    first_name: clean(contact.properties.firstname, 120),
    last_name: clean(contact.properties.lastname, 120),
    company: clean(contact.properties.company, 200),
    properties: kept,
  };
}

/** How a contact is named on their personal link and in analytics. Never empty. */
export function recipientName(contact: { first_name: string | null; last_name: string | null; email: string | null; external_id: string }): string {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim();
  return (name || contact.email || `Contact ${contact.external_id}`).slice(0, 120);
}

/** One CSV cell. Values that a spreadsheet would run as a formula are neutralised. */
export function csvCell(value: string | null): string {
  let text = value ?? '';
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export type LinkRow = { email: string | null; name: string; company: string | null; url: string };

export function linksCsv(rows: readonly LinkRow[]): string {
  const lines = [['email', 'name', 'company', 'room_link'].join(',')];
  for (const row of rows) lines.push([row.email, row.name, row.company, row.url].map(csvCell).join(','));
  return `${lines.join('\r\n')}\r\n`;
}
