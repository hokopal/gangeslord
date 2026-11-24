import { decryptKey, encryptKey } from './ai/crypto';
import { contactRow, DEFAULT_PROPERTIES, LINK_PROPERTY, MAX_CONTACTS, parseExtraProperties, recipientName, type LinkRow } from './audience-core';
import { checkToken, ensureLinkProperty, listMemberIds, readContacts, searchSegments, writeProperty, type Segment } from './hubspot';
import { createAdminSupabase, serverSecret } from './supabase/admin';
import { createServerSupabase } from './supabase/server';

// ── HubSpot connection ─────────────────────────────────────────────────────
// These use the service role. Callers must first check the user's role in the workspace.

export type HubspotStatus = { connected: boolean; hint: string; portalId: string | null; updatedAt: string | null };

export async function getHubspotStatus(workspaceId: string): Promise<HubspotStatus> {
  const { data } = await createAdminSupabase()
    .from('workspace_integrations')
    .select('hint, meta, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('kind', 'hubspot')
    .maybeSingle();
  if (!data) return { connected: false, hint: '', portalId: null, updatedAt: null };
  const portalId = (data.meta as { portalId?: string | null } | null)?.portalId ?? null;
  return { connected: true, hint: data.hint as string, portalId, updatedAt: data.updated_at as string };
}

/** Checks the token with HubSpot, then stores it encrypted. Throws hubspot_token_format or a HubSpot error. */
export async function saveHubspotToken(workspaceId: string, userId: string, rawToken: string): Promise<void> {
  const token = rawToken.trim();
  if (token.length < 20 || token.length > 300 || /\s/.test(token)) throw new Error('hubspot_token_format');
  const { portalId } = await checkToken(token);
  const { error } = await createAdminSupabase().from('workspace_integrations').upsert({
    workspace_id: workspaceId,
    kind: 'hubspot',
    secret_ciphertext: encryptKey(token, serverSecret()),
    hint: `…${token.slice(-4)}`,
    events: [],
    meta: { portalId },
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('integration_failed');
}

export async function removeHubspot(workspaceId: string): Promise<void> {
  const { error } = await createAdminSupabase().from('workspace_integrations').delete().eq('workspace_id', workspaceId).eq('kind', 'hubspot');
  if (error) throw new Error('integration_failed');
}

async function loadToken(workspaceId: string): Promise<string> {
  const { data } = await createAdminSupabase()
    .from('workspace_integrations')
    .select('secret_ciphertext')
    .eq('workspace_id', workspaceId)
    .eq('kind', 'hubspot')
    .maybeSingle();
  if (!data) throw new Error('hubspot_not_connected');
  return decryptKey(data.secret_ciphertext as string, serverSecret());
}

export async function findSegments(workspaceId: string, query: string): Promise<Segment[]> {
  return searchSegments(await loadToken(workspaceId), query);
}

// ── Audiences ──────────────────────────────────────────────────────────────
// Everything below reads and writes through the user's own session, so row-level security applies.

export type Audience = { id: string; name: string; externalId: string; properties: string[]; contactCount: number; syncedAt: string | null };
type AudienceRow = { id: string; name: string; external_id: string; properties: string[]; contact_count: number; synced_at: string | null };
const AUDIENCE_COLUMNS = 'id, name, external_id, properties, contact_count, synced_at';
const toAudience = (r: AudienceRow): Audience => ({
  id: r.id, name: r.name, externalId: r.external_id, properties: r.properties, contactCount: r.contact_count, syncedAt: r.synced_at,
});

export async function listAudiences(workspaceId: string): Promise<Audience[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('audiences').select(AUDIENCE_COLUMNS).eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AudienceRow[]).map(toAudience);
}

export type ContactSummary = { id: string; name: string; email: string | null; company: string | null };

export async function getAudience(workspaceId: string, audienceId: string): Promise<{ audience: Audience; contacts: ContactSummary[] } | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from('audiences').select(AUDIENCE_COLUMNS).eq('workspace_id', workspaceId).eq('id', audienceId).maybeSingle();
  if (!data) return null;
  const { data: rows } = await supabase
    .from('contacts')
    .select('id, external_id, email, first_name, last_name, company')
    .eq('workspace_id', workspaceId)
    .eq('audience_id', audienceId)
    .order('last_name')
    .order('first_name')
    .limit(100);
  const contacts = ((rows ?? []) as { id: string; external_id: string; email: string | null; first_name: string | null; last_name: string | null; company: string | null }[]).map(
    (c) => ({ id: c.id, name: recipientName(c), email: c.email, company: c.company }),
  );
  return { audience: toAudience(data as AudienceRow), contacts };
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Imports (or re-syncs) one HubSpot segment as an audience. Contacts no longer in the
 * segment are removed, along with their links. Returns the audience id.
 */
export async function importSegment(workspaceId: string, segmentId: string, segmentName: string, extraProperties: string): Promise<string> {
  const properties = [...DEFAULT_PROPERTIES, ...parseExtraProperties(extraProperties)];
  const token = await loadToken(workspaceId);
  const ids = await listMemberIds(token, segmentId, MAX_CONTACTS);
  const records = await readContacts(token, ids, properties);
  const startedAt = new Date().toISOString();

  const supabase = await createServerSupabase();
  const { data: audience, error } = await supabase
    .from('audiences')
    .upsert(
      { workspace_id: workspaceId, source: 'hubspot', external_id: segmentId, name: segmentName.trim().slice(0, 200) || `Segment ${segmentId}`, properties },
      { onConflict: 'workspace_id,source,external_id' },
    )
    .select('id')
    .single();
  if (error || !audience) throw new Error(error?.code === '42501' ? 'not_allowed' : 'import_failed');
  const audienceId = audience.id as string;

  for (const batch of chunks(records, 500)) {
    const rows = batch.map((record) => ({ ...contactRow(record, properties), workspace_id: workspaceId, audience_id: audienceId, synced_at: startedAt }));
    const saved = await supabase.from('contacts').upsert(rows, { onConflict: 'audience_id,external_id' });
    if (saved.error) throw new Error('import_failed');
  }
  // Anyone not touched by this run has left the segment.
  await supabase.from('contacts').delete().eq('audience_id', audienceId).lt('synced_at', startedAt);
  await supabase.from('audiences').update({ contact_count: records.length, synced_at: startedAt, properties }).eq('id', audienceId);
  return audienceId;
}

export async function deleteAudience(workspaceId: string, audienceId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('audiences').delete().eq('workspace_id', workspaceId).eq('id', audienceId).select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('not_allowed');
}

type ContactRow = { id: string; external_id: string; email: string | null; first_name: string | null; last_name: string | null; company: string | null };

async function allContacts(workspaceId: string, audienceId: string): Promise<ContactRow[]> {
  const supabase = await createServerSupabase();
  const rows: ContactRow[] = [];
  for (let page = 0; page < 10; page += 1) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, external_id, email, first_name, last_name, company')
      .eq('workspace_id', workspaceId)
      .eq('audience_id', audienceId)
      .order('id')
      .range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as ContactRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

/** Creates a personal link on a track for every contact in an audience who does not have one yet. */
export async function generateLinks(workspaceId: string, audienceId: string, trackId: string): Promise<number> {
  const contacts = await allContacts(workspaceId, audienceId);
  const supabase = await createServerSupabase();
  for (const batch of chunks(contacts, 500)) {
    const rows = batch.map((c) => ({
      workspace_id: workspaceId,
      track_id: trackId,
      contact_id: c.id,
      recipient_name: recipientName(c),
      recipient_email: c.email,
      account_name: c.company,
    }));
    const { error } = await supabase.from('share_links').upsert(rows, { onConflict: 'track_id,contact_id', ignoreDuplicates: true });
    if (error) throw new Error(error.code === '42501' ? 'not_allowed' : 'links_failed');
  }
  return contacts.length;
}

type LinkRecord = { token: string; recipient_name: string; recipient_email: string | null; account_name: string | null; contact_id: string };

async function linkRecords(workspaceId: string, audienceId: string, trackId: string): Promise<(LinkRecord & { externalId: string })[]> {
  const supabase = await createServerSupabase();
  const contacts = new Map((await allContacts(workspaceId, audienceId)).map((c) => [c.id, c.external_id]));
  const records: (LinkRecord & { externalId: string })[] = [];
  // Restrict both the link rows and the contact ids to this workspace and audience.
  for (const contactBatch of chunks([...contacts.keys()], 500)) {
    const { data, error } = await supabase
      .from('share_links')
      .select('token, recipient_name, recipient_email, account_name, contact_id')
      .eq('workspace_id', workspaceId)
      .eq('track_id', trackId)
      .in('contact_id', contactBatch);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as LinkRecord[]) {
      const externalId = contacts.get(row.contact_id);
      if (externalId) records.push({ ...row, externalId });
    }
  }
  return records;
}

const roomUrl = (origin: string, workspaceSlug: string, trackSlug: string, token: string) => `${origin}/r/${workspaceSlug}/${trackSlug}?r=${token}`;

/** One row per contact with their link, for the CSV download. */
export async function linkRows(workspaceId: string, audienceId: string, trackId: string, origin: string, workspaceSlug: string, trackSlug: string): Promise<LinkRow[]> {
  return (await linkRecords(workspaceId, audienceId, trackId)).map((r) => ({
    email: r.recipient_email,
    name: r.recipient_name,
    company: r.account_name,
    url: roomUrl(origin, workspaceSlug, trackSlug, r.token),
  }));
}

/** How many contacts of an audience have a link on each of the given tracks. */
export async function linkCounts(workspaceId: string, audienceId: string, trackIds: readonly string[]): Promise<Record<string, number>> {
  const supabase = await createServerSupabase();
  const counts: Record<string, number> = {};
  await Promise.all(
    trackIds.slice(0, 30).map(async (trackId) => {
      const { count } = await supabase
        .from('share_links')
        .select('id, contacts!inner(audience_id,workspace_id)', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('track_id', trackId)
        .eq('contacts.workspace_id', workspaceId)
        .eq('contacts.audience_id', audienceId);
      counts[trackId] = count ?? 0;
    }),
  );
  return counts;
}

/** Writes each contact's link to the "Pipemouse room link" property in HubSpot. Returns how many were written. */
export async function writeLinksToHubspot(workspaceId: string, audienceId: string, trackId: string, origin: string, workspaceSlug: string, trackSlug: string): Promise<number> {
  const records = await linkRecords(workspaceId, audienceId, trackId);
  if (records.length === 0) throw new Error('links_missing');
  const token = await loadToken(workspaceId);
  await ensureLinkProperty(token, LINK_PROPERTY.name, LINK_PROPERTY.label);
  return writeProperty(token, LINK_PROPERTY.name, records.map((r) => ({ id: r.externalId, value: roomUrl(origin, workspaceSlug, trackSlug, r.token) })));
}

/** Up to five contacts who have a link on this track, for "preview as" in the personalisation page. */
export async function previewLinks(trackId: string): Promise<{ name: string; token: string }[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from('share_links').select('recipient_name, token').eq('track_id', trackId).order('created_at', { ascending: false }).limit(5);
  return ((data ?? []) as { recipient_name: string; token: string }[]).map((r) => ({ name: r.recipient_name, token: r.token }));
}
