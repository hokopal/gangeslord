const BASE = 'https://api.hubapi.com';

export type HubspotOptions = { fetchImpl?: typeof fetch; timeoutMs?: number };
export type HubspotContact = { id: string; properties: Record<string, string | null> };

/** One JSON request to HubSpot. Throws one of our error codes; HubSpot's own error text is never passed on. */
async function hs(token: string, path: string, init: RequestInit, { fetchImpl = fetch, timeoutMs = 15_000 }: HubspotOptions): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(`${BASE}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error('hubspot_unreachable');
  }
  if (response.status === 401) throw new Error('hubspot_token_invalid');
  if (response.status === 403) throw new Error('hubspot_scope_missing');
  if (response.status === 404) throw new Error('hubspot_not_found');
  if (response.status === 409) throw new Error('hubspot_conflict');
  if (response.status === 429) throw new Error('hubspot_rate_limited');
  if (!response.ok) throw new Error('hubspot_failed');
  if (response.status === 204) return {};
  try {
    return await response.json();
  } catch {
    throw new Error('hubspot_failed');
  }
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

/** Confirms the token can read contacts, and returns the HubSpot account id when it can be read. */
export async function checkToken(token: string, options: HubspotOptions = {}): Promise<{ portalId: string | null }> {
  await hs(token, '/crm/v3/objects/contacts?limit=1', {}, options);
  try {
    const details = (await hs(token, '/account-info/v3/details', {}, options)) as { portalId?: unknown };
    return { portalId: details.portalId == null ? null : String(details.portalId) };
  } catch {
    return { portalId: null };
  }
}

export type Segment = { id: string; name: string; size: number | null };

/** Contact segments (lists) whose name matches the query. */
export async function searchSegments(token: string, query: string, options: HubspotOptions = {}): Promise<Segment[]> {
  const data = (await hs(token, '/crm/v3/lists/search', post({ query: query.trim().slice(0, 100), count: 25, offset: 0 }), options)) as {
    lists?: { listId?: unknown; name?: unknown; objectTypeId?: unknown; size?: unknown; additionalProperties?: { hs_list_size?: unknown } }[];
  };
  return (data.lists ?? [])
    .filter((l) => l.objectTypeId === '0-1' && l.listId != null && typeof l.name === 'string')
    .map((l) => {
      const size = Number(l.additionalProperties?.hs_list_size ?? l.size);
      return { id: String(l.listId), name: l.name as string, size: Number.isFinite(size) ? size : null };
    });
}

/** Every contact id in a segment. Throws hubspot_segment_too_large past `max`. */
export async function listMemberIds(token: string, listId: string, max: number, options: HubspotOptions = {}): Promise<string[]> {
  const ids: string[] = [];
  let after: string | undefined;
  for (let page = 0; page < 200; page += 1) {
    const query = `limit=250${after ? `&after=${encodeURIComponent(after)}` : ''}`;
    const data = (await hs(token, `/crm/v3/lists/${encodeURIComponent(listId)}/memberships?${query}`, {}, options)) as {
      results?: { recordId?: unknown }[];
      paging?: { next?: { after?: string } };
    };
    for (const row of data.results ?? []) if (row.recordId != null) ids.push(String(row.recordId));
    if (ids.length > max) throw new Error('hubspot_segment_too_large');
    after = data.paging?.next?.after;
    if (!after) break;
  }
  return [...new Set(ids)];
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Reads the chosen properties for many contacts, 100 at a time. */
export async function readContacts(token: string, ids: readonly string[], properties: readonly string[], options: HubspotOptions = {}): Promise<HubspotContact[]> {
  const contacts: HubspotContact[] = [];
  for (const batch of chunks(ids, 100)) {
    const data = (await hs(token, '/crm/v3/objects/contacts/batch/read', post({ properties, inputs: batch.map((id) => ({ id })) }), options)) as {
      results?: { id?: unknown; properties?: Record<string, string | null> }[];
    };
    for (const row of data.results ?? []) if (row.id != null) contacts.push({ id: String(row.id), properties: row.properties ?? {} });
  }
  return contacts;
}

/** Creates the contact property that holds a room link, if it does not exist yet. */
export async function ensureLinkProperty(token: string, name: string, label: string, options: HubspotOptions = {}): Promise<void> {
  try {
    await hs(token, '/crm/v3/properties/contacts', post({ name, label, type: 'string', fieldType: 'text', groupName: 'contactinformation' }), options);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'hubspot_conflict') throw error;
  }
}

/** Writes one property value per contact, 100 at a time. Returns how many were sent. */
export async function writeProperty(token: string, property: string, values: readonly { id: string; value: string }[], options: HubspotOptions = {}): Promise<number> {
  for (const batch of chunks(values, 100)) {
    await hs(token, '/crm/v3/objects/contacts/batch/update', post({ inputs: batch.map((v) => ({ id: v.id, properties: { [property]: v.value } })) }), options);
  }
  return values.length;
}

/** Logs a note on a contact's timeline. `html` is the note body; returns the note's id. */
export async function createContactNote(token: string, contactId: string, html: string, timestamp: string, options: HubspotOptions = {}): Promise<string> {
  const data = (await hs(
    token,
    '/crm/v3/objects/notes',
    post({
      properties: { hs_timestamp: timestamp, hs_note_body: html },
      // 202 is HubSpot's built-in "note to contact" association.
      associations: [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] }],
    }),
    options,
  )) as { id?: unknown };
  if (data.id == null) throw new Error('hubspot_failed');
  return String(data.id);
}

/** Replaces the body of an existing note. */
export async function updateNote(token: string, noteId: string, html: string, options: HubspotOptions = {}): Promise<void> {
  await hs(token, `/crm/v3/objects/notes/${encodeURIComponent(noteId)}`, { method: 'PATCH', body: JSON.stringify({ properties: { hs_note_body: html } }) }, options);
}
