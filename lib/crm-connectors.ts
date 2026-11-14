import { createHash } from 'node:crypto';
import { decryptKey, encryptKey } from './ai/crypto';
import {
  apolloContact, CRM_KINDS, instantlyLead, mailchimpMember, parseCrmSettings, salesforceLead, salesforceTask, salesloftPerson, soqlByEmail,
  type CrmKind, type Person,
} from './crm-core';
import { createAdminSupabase, serverSecret } from './supabase/admin';

// Sales and marketing tools, connected with the workspace's own credentials. Everything here runs with
// the service role, so callers must already have checked that the person is a workspace admin.

const APOLLO = 'https://api.apollo.io/api/v1';
const SALESFORCE_API = '/services/data/v60.0';
const SALESLOFT = 'https://api.salesloft.com/v2';
const INSTANTLY = 'https://api.instantly.ai/api/v2';
const TIMEOUT = 10_000;

export type CrmStatus = { kind: CrmKind; connected: boolean; hint: string | null; log: { event: string; ok: boolean; detail: string; createdAt: string }[] };

export async function getCrmStatus(workspaceId: string, kind: CrmKind, withLog = true): Promise<CrmStatus> {
  const admin = createAdminSupabase();
  const [{ data: row }, { data: log }] = await Promise.all([
    admin.from('workspace_integrations').select('hint').eq('workspace_id', workspaceId).eq('kind', kind).maybeSingle(),
    withLog
      ? admin.from('integration_log').select('event, ok, detail, created_at').eq('workspace_id', workspaceId).eq('kind', kind).order('created_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ]);
  return {
    kind,
    connected: Boolean(row),
    hint: (row?.hint as string | undefined) ?? null,
    log: ((log ?? []) as { event: string; ok: boolean; detail: string; created_at: string }[]).map((e) => ({ event: e.event, ok: e.ok, detail: e.detail, createdAt: e.created_at })),
  };
}

export const listCrmStatuses = (workspaceId: string) => Promise.all(CRM_KINDS.map((kind) => getCrmStatus(workspaceId, kind, false)));

/** Saves a connection. Secrets are stored encrypted and never shown again. Throws crm_settings_invalid or salesforce_domain_invalid. */
export async function saveCrm(workspaceId: string, userId: string, kind: CrmKind, values: Record<string, string>): Promise<void> {
  const { secret, hint } = parseCrmSettings(kind, values);
  const { error } = await createAdminSupabase().from('workspace_integrations').upsert({
    workspace_id: workspaceId, kind, secret_ciphertext: encryptKey(secret, serverSecret()), hint, events: [], updated_by: userId, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('unknown');
}

export async function removeCrm(workspaceId: string, kind: CrmKind): Promise<void> {
  await createAdminSupabase().from('workspace_integrations').delete().eq('workspace_id', workspaceId).eq('kind', kind);
}

async function secrets(workspaceId: string, kind: CrmKind): Promise<Record<string, string> | null> {
  const { data } = await createAdminSupabase().from('workspace_integrations').select('secret_ciphertext').eq('workspace_id', workspaceId).eq('kind', kind).maybeSingle();
  if (!data) return null;
  try {
    return JSON.parse(decryptKey(data.secret_ciphertext as string, serverSecret())) as Record<string, string>;
  } catch {
    return null;
  }
}

async function record(workspaceId: string, kind: CrmKind, event: string, ok: boolean, detail: string): Promise<void> {
  await createAdminSupabase().from('integration_log').insert({ workspace_id: workspaceId, kind, event, ok, detail: detail.slice(0, 300) });
}

const json = (method: string, headers: Record<string, string>, body?: unknown): RequestInit => ({
  method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT),
});

/** Why a service refused, in words an admin can act on. */
function refusal(name: string, status: number): string {
  if (status === 401) return `${name} rejected the credentials`;
  if (status === 403) return `${name} says these credentials lack permission for this`;
  if (status === 429) return `${name} is rate limiting this account`;
  return `${name} returned ${status}`;
}

// ── Apollo ──

async function apolloFind(key: string, email: string): Promise<{ status: number; id: string | null }> {
  const response = await fetch(`${APOLLO}/contacts/search`, json('POST', { 'x-api-key': key }, { q_keywords: email, per_page: 1 }));
  if (!response.ok) return { status: response.status, id: null };
  const found = ((await response.json()) as { contacts?: { id?: string; email?: string }[] }).contacts ?? [];
  // The search is by keyword, so only an exact email match counts as the same person.
  const match = found.find((contact) => (contact.email ?? '').toLowerCase() === email.toLowerCase());
  return { status: 200, id: match?.id ?? null };
}

async function apolloPush(key: string, person: Person): Promise<string> {
  const existing = await apolloFind(key, person.email);
  if (existing.status !== 200) throw new Error(refusal('Apollo', existing.status));
  // Apollo does not check for duplicates when creating, so an existing contact is updated instead.
  const response = existing.id
    ? await fetch(`${APOLLO}/contacts/${existing.id}`, json('PUT', { 'x-api-key': key }, apolloContact(person)))
    : await fetch(`${APOLLO}/contacts`, json('POST', { 'x-api-key': key }, apolloContact(person)));
  if (!response.ok) throw new Error(refusal('Apollo', response.status));
  return existing.id ? 'Updated the existing contact' : 'Created a contact';
}

// ── Salesforce ──

async function salesforceToken(config: Record<string, string>): Promise<{ token: string; base: string }> {
  const response = await fetch(`https://${config.domain}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: config.clientId, client_secret: config.clientSecret }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) throw new Error(response.status === 400 ? 'Salesforce refused to sign in: check the consumer key and secret, and that the client credentials flow is switched on with a “run as” user' : refusal('Salesforce', response.status));
  const data = (await response.json()) as { access_token?: string; instance_url?: string };
  // Calls go to the address Salesforce names, but only if it is still one of Salesforce's own.
  const base = data.instance_url && /^https:\/\/[a-z0-9.-]+\.salesforce\.com$/.test(data.instance_url) ? data.instance_url : `https://${config.domain}`;
  if (!data.access_token) throw new Error('Salesforce did not return an access token');
  return { token: data.access_token, base };
}

async function salesforcePush(config: Record<string, string>, person: Person, room: { name: string; url: string }): Promise<string> {
  const { token, base } = await salesforceToken(config);
  const auth = { authorization: `Bearer ${token}` };
  const find = async (object: 'Lead' | 'Contact') => {
    const response = await fetch(`${base}${SALESFORCE_API}/query?q=${encodeURIComponent(soqlByEmail(object, person.email))}`, json('GET', auth));
    if (!response.ok) throw new Error(refusal('Salesforce', response.status));
    return ((await response.json()) as { records?: { Id: string }[] }).records?.[0]?.Id ?? null;
  };
  let who = (await find('Lead')) ?? (await find('Contact'));
  let outcome = 'Logged activity on the existing record';
  if (!who) {
    const created = await fetch(`${base}${SALESFORCE_API}/sobjects/Lead`, json('POST', auth, salesforceLead(person)));
    if (!created.ok) throw new Error(refusal('Salesforce', created.status));
    who = ((await created.json()) as { id: string }).id;
    outcome = 'Created a lead and logged activity';
  }
  const task = await fetch(`${base}${SALESFORCE_API}/sobjects/Task`, json('POST', auth, salesforceTask(who, room, new Date().toISOString().slice(0, 10))));
  if (!task.ok) return `${outcome.replace(' and logged activity', '')}, but could not log the activity (${refusal('Salesforce', task.status)})`;
  return outcome;
}

// ── Salesloft ──

async function salesloftPush(key: string, person: Person): Promise<string> {
  const auth = { authorization: `Bearer ${key}` };
  const created = await fetch(`${SALESLOFT}/people`, json('POST', auth, salesloftPerson(person)));
  if (created.ok) return 'Created a person';
  // Salesloft refuses a second person with the same email, so the existing one is updated instead.
  if (created.status !== 422) throw new Error(refusal('Salesloft', created.status));
  const found = await fetch(`${SALESLOFT}/people?email_addresses[]=${encodeURIComponent(person.email)}`, json('GET', auth));
  if (!found.ok) throw new Error(refusal('Salesloft', found.status));
  const id = ((await found.json()) as { data?: { id: number }[] }).data?.[0]?.id;
  if (!id) throw new Error('Salesloft refused the person, and no existing one has that email');
  const updated = await fetch(`${SALESLOFT}/people/${id}`, json('PUT', auth, salesloftPerson(person)));
  if (!updated.ok) throw new Error(refusal('Salesloft', updated.status));
  return 'Updated the existing person';
}

// ── Instantly ──

async function instantlyPush(config: Record<string, string>, person: Person): Promise<string> {
  const response = await fetch(`${INSTANTLY}/leads`, json('POST', { authorization: `Bearer ${config.apiKey}` }, instantlyLead(person, config.listId)));
  if (!response.ok) throw new Error(refusal('Instantly', response.status));
  return 'Added to the lead list, unless they were already in the workspace';
}

// ── Mailchimp ──

const mailchimpAuth = (config: Record<string, string>) => ({ authorization: `Basic ${Buffer.from(`pipemouse:${config.apiKey}`).toString('base64')}` });
const mailchimpList = (config: Record<string, string>) => `https://${config.dc}.api.mailchimp.com/3.0/lists/${config.audienceId}`;

async function mailchimpPush(config: Record<string, string>, person: Person): Promise<string> {
  // Mailchimp identifies a member by the MD5 of their lowercased email address.
  const id = createHash('md5').update(person.email.toLowerCase()).digest('hex');
  const member = mailchimpMember(person);
  const response = await fetch(`${mailchimpList(config)}/members/${id}`, json('PUT', mailchimpAuth(config), member));
  if (!response.ok) throw new Error(refusal('Mailchimp', response.status));
  const status = ((await response.json()) as { status?: string }).status;
  return status === 'pending' ? 'Added as pending; Mailchimp has asked them to confirm' : `In the audience as ${status ?? 'a member'}`;
}

// ── Shared entry points ──

/** A read-only call per tool that proves the credentials work and can reach what the connector needs. */
const CHECK: Record<CrmKind, (config: Record<string, string>) => Promise<void>> = {
  apollo: async (config) => {
    const { status } = await apolloFind(config.apiKey, 'connection-check@fello.invalid');
    if (status !== 200) throw new Error(refusal('Apollo', status));
  },
  salesforce: async (config) => {
    const { token, base } = await salesforceToken(config);
    const response = await fetch(`${base}${SALESFORCE_API}/sobjects/Lead/describe`, json('GET', { authorization: `Bearer ${token}` }));
    if (!response.ok) throw new Error(response.status === 403 || response.status === 404 ? 'Signed in, but the “run as” user cannot see leads' : refusal('Salesforce', response.status));
  },
  salesloft: async (config) => {
    const response = await fetch(`${SALESLOFT}/me`, json('GET', { authorization: `Bearer ${config.apiKey}` }));
    if (!response.ok) throw new Error(refusal('Salesloft', response.status));
  },
  instantly: async (config) => {
    const response = await fetch(`${INSTANTLY}/lead-lists/${config.listId}`, json('GET', { authorization: `Bearer ${config.apiKey}` }));
    if (!response.ok) throw new Error(response.status === 404 ? 'The key works, but there is no lead list with that ID' : refusal('Instantly', response.status));
  },
  mailchimp: async (config) => {
    const response = await fetch(mailchimpList(config), json('GET', mailchimpAuth(config)));
    if (!response.ok) throw new Error(response.status === 404 ? 'The key works, but there is no audience with that ID' : refusal('Mailchimp', response.status));
  },
};

const PUSH: Record<CrmKind, (config: Record<string, string>, person: Person, room: { name: string; url: string }) => Promise<string>> = {
  apollo: (config, person) => apolloPush(config.apiKey, person),
  salesforce: salesforcePush,
  salesloft: (config, person) => salesloftPush(config.apiKey, person),
  instantly: instantlyPush,
  mailchimp: mailchimpPush,
};

/** Checks that the saved credentials work, with a real call that changes nothing. Returns a sentence for the admin. */
export async function testCrm(workspaceId: string, kind: CrmKind): Promise<string> {
  const config = await secrets(workspaceId, kind);
  if (!config) return 'Not connected.';
  try {
    await CHECK[kind](config);
    await record(workspaceId, kind, 'test', true, 'The credentials work');
    return 'Connection works: the credentials were accepted and can reach what this connector needs.';
  } catch (error) {
    const detail = error instanceof Error && !/fetch|abort|timeout/i.test(error.message) ? error.message : 'Could not reach the service';
    await record(workspaceId, kind, 'test', false, detail).catch(() => undefined);
    return `${detail}.`;
  }
}

/**
 * Sends a person who filled in a room's form to every sales tool the workspace has connected,
 * and logs how each went. Best-effort: it never throws, so it cannot break the form.
 */
export async function pushSubmission(workspaceId: string, person: Person, room: { name: string; url: string }): Promise<void> {
  for (const kind of CRM_KINDS) {
    try {
      const config = await secrets(workspaceId, kind);
      if (!config) continue;
      const outcome = await PUSH[kind](config, person, room);
      await record(workspaceId, kind, 'form submitted', true, outcome);
    } catch (error) {
      const detail = error instanceof Error && !/fetch|abort|timeout/i.test(error.message) ? error.message : 'Could not reach the service';
      await record(workspaceId, kind, 'form submitted', false, detail).catch(() => undefined);
    }
  }
}
