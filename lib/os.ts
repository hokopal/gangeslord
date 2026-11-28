import { createHash } from 'node:crypto';
import type { VisitSummary } from './activity-note';
import { formatDuration } from './analytics';
import type { Person } from './crm-core';
import { assertPublicUrl } from './ingest/net';

export type OsConfig = { baseUrl: string; apiKey: string };
export type OsPersonResult = { personId: string; companyId: string | null; created: boolean };
type OsOptions = { fetchImpl?: typeof fetch };
type OsResult = { status: number; ok: boolean; payload: unknown };

const TIMEOUT = 10_000;
const FREE_EMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com']);
const clean = (value: string | undefined, max: number) => (value ?? '').trim().slice(0, max);

/** Stable UUIDs let a retried room event update the same OS records instead of creating duplicates. */
export function stableUuid(value: string): string {
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function emailFor(person: Person): string {
  const email = clean(person.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('os_person_invalid');
  return email;
}

function emailDomain(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return domain && !FREE_EMAIL_DOMAINS.has(domain) ? domain : null;
}

export function osCompanyInput(person: Person): { name: string; domainName?: { primaryLinkUrl: string } } | null {
  const name = clean(person.company, 200);
  if (!name) return null;
  const domain = emailDomain(emailFor(person));
  return { name, ...(domain ? { domainName: { primaryLinkUrl: `https://${domain}` } } : {}) };
}

export function osPersonInput(person: Person, companyId: string | null = null): Record<string, unknown> {
  const email = emailFor(person);
  let firstName = clean(person.firstname, 100);
  let lastName = clean(person.lastname, 100);
  if (!firstName && !lastName && clean(person.name, 200)) {
    const parts = clean(person.name, 200).split(/\s+/);
    firstName = parts.shift() ?? '';
    lastName = parts.join(' ');
  }
  const jobTitle = clean(person.jobtitle, 200);
  const phone = clean(person.phone, 80);
  return {
    emails: { primaryEmail: email },
    ...(firstName || lastName ? { name: { firstName, lastName } } : {}),
    ...(jobTitle ? { jobTitle } : {}),
    ...(phone ? { phone } : {}),
    ...(companyId ? { companyId } : {}),
  };
}

function refusal(status: number): string {
  if (status === 401) return 'Pipemouse OS rejected the API key';
  if (status === 403) return 'Pipemouse OS says this API key lacks permission for people, companies or notes';
  if (status === 429) return 'Pipemouse OS is rate limiting this workspace';
  return `Pipemouse OS returned ${status}`;
}

async function request(config: OsConfig, method: string, path: string, body?: unknown, options: OsOptions = {}): Promise<OsResult> {
  const base = await assertPublicUrl(config.baseUrl);
  if (base.protocol !== 'https:') throw new Error('Pipemouse OS must use a public HTTPS address');
  const response = await (options.fetchImpl ?? fetch)(new URL(`/rest${path}`, base.origin), {
    method,
    redirect: 'manual',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
      'user-agent': 'Pipemouse-OS-Sync/1.0',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  return { status: response.status, ok: response.ok, payload };
}

function ensure(result: OsResult): void {
  if (!result.ok) throw new Error(refusal(result.status));
}

async function findId(config: OsConfig, plural: string, filter: string, options: OsOptions): Promise<string | null> {
  const query = new URLSearchParams({ filter, fields: 'id', limit: '1' });
  const result = await request(config, 'GET', `/${plural}?${query}`, undefined, options);
  ensure(result);
  const rows = (result.payload as { data?: Record<string, unknown> } | null)?.data?.[plural];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const id = (rows[0] as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

async function upsertByFilter(
  config: OsConfig,
  plural: string,
  filter: string,
  input: Record<string, unknown>,
  key: string,
  options: OsOptions,
): Promise<{ id: string; created: boolean }> {
  const existing = await findId(config, plural, filter, options);
  const id = existing ?? stableUuid(key);
  let result = await request(config, existing ? 'PATCH' : 'POST', existing ? `/${plural}/${id}` : `/${plural}`, existing ? input : { id, ...input }, options);
  if (!existing && (result.status === 400 || result.status === 409)) {
    // Another event may have created the same record between the lookup and the write.
    const raced = await findId(config, plural, filter, options);
    if (raced) {
      result = await request(config, 'PATCH', `/${plural}/${raced}`, input, options);
      ensure(result);
      return { id: raced, created: false };
    }
  }
  ensure(result);
  return { id, created: !existing };
}

async function upsertById(config: OsConfig, plural: string, id: string, input: Record<string, unknown>, options: OsOptions): Promise<void> {
  let result = await request(config, 'PATCH', `/${plural}/${id}`, input, options);
  if (result.status === 404) {
    result = await request(config, 'POST', `/${plural}`, { id, ...input }, options);
    if (result.status === 400 || result.status === 409) result = await request(config, 'PATCH', `/${plural}/${id}`, input, options);
  }
  ensure(result);
}

export async function upsertOsPerson(config: OsConfig, person: Person, options: OsOptions = {}): Promise<OsPersonResult> {
  const email = emailFor(person);
  const company = osCompanyInput(person);
  let companyId: string | null = null;
  if (company) {
    const domain = company.domainName?.primaryLinkUrl ?? null;
    const filter = domain ? `domainName.primaryLinkUrl[eq]:${JSON.stringify(domain)}` : `name[eq]:${JSON.stringify(company.name)}`;
    companyId = (await upsertByFilter(config, 'companies', filter, company, `company:${domain ?? company.name.toLowerCase()}`, options)).id;
  }
  const result = await upsertByFilter(
    config,
    'people',
    `emails.primaryEmail[eq]:${JSON.stringify(email)}`,
    osPersonInput(person, companyId),
    `person:${email}`,
    options,
  );
  return { personId: result.id, companyId, created: result.created };
}

export async function upsertOsNote(
  config: OsConfig,
  note: { id: string; title: string; markdown: string; personId: string; companyId: string | null },
  options: OsOptions = {},
): Promise<void> {
  await upsertById(config, 'notes', note.id, {
    title: clean(note.title, 200),
    bodyV2: { markdown: note.markdown.slice(0, 20_000), blocknote: null, tiptap: null },
  }, options);
  await upsertById(config, 'noteTargets', stableUuid(`note-target:${note.id}`), {
    noteId: note.id,
    targetPersonId: note.personId,
    ...(note.companyId ? { targetCompanyId: note.companyId } : {}),
  }, options);
}

const markdownText = (value: string) => value.replace(/\\/g, '\\\\').replace(/([\[\]<>])/g, '\\$1').replace(/[\r\n]+/g, ' ').trim();
const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

export function activityNoteMarkdown(visit: VisitSummary): string {
  const seconds = visit.items.reduce((sum, item) => sum + item.seconds, 0);
  const engaged = visit.items.filter((item) => item.engaged).length;
  const lines = [
    `## Pipemouse room visit: ${markdownText(visit.trackName)}`,
    `${markdownText(visit.visitor)} opened the room on ${formatWhen(visit.startedAt)}.`,
    visit.items.length === 0
      ? 'No items viewed yet.'
      : `Active time so far: ${formatDuration(seconds)} across ${visit.items.length} of ${visit.totalItems} item${visit.totalItems === 1 ? '' : 's'}${engaged > 0 ? `, ${engaged} past the engagement threshold` : ''}.`,
  ];
  if (visit.items.length > 0) {
    lines.push('', ...visit.items.map((item) => `- ${markdownText(item.title)}: ${formatDuration(item.seconds)}${item.engaged ? ' (engaged)' : ''}`));
  }
  const buttons = [...new Set(visit.buttons.map((button) => button.replace(/^[a-z]+:\s*/, '').trim()).filter(Boolean))];
  if (buttons.length > 0) lines.push('', `Buttons clicked: ${buttons.map(markdownText).join(', ')}`);
  if (visit.milestones && visit.milestones.length > 0) lines.push('', `Milestones: ${visit.milestones.map(markdownText).join(', ')}`);
  lines.push('', `[View the visit in Pipemouse](${visit.sessionUrl})`);
  return lines.join('\n');
}

export function submissionNoteMarkdown(person: Person, room: { name: string; url: string }): string {
  const lines = [`## Pipemouse room form: ${markdownText(room.name)}`, '', `- Email: ${markdownText(emailFor(person))}`];
  const name = clean(person.name, 200) || [clean(person.firstname, 100), clean(person.lastname, 100)].filter(Boolean).join(' ');
  if (name) lines.push(`- Name: ${markdownText(name)}`);
  if (clean(person.company, 200)) lines.push(`- Company: ${markdownText(person.company)}`);
  if (clean(person.jobtitle, 200)) lines.push(`- Job title: ${markdownText(person.jobtitle)}`);
  if (clean(person.phone, 80)) lines.push(`- Phone: ${markdownText(person.phone)}`);
  lines.push('', `[Open the room](${room.url})`, '', 'Custom form answers remain in Rooms.');
  return lines.join('\n');
}

export async function pushOsSubmission(
  config: OsConfig,
  person: Person,
  room: { name: string; url: string },
  eventId: string,
  options: OsOptions = {},
): Promise<string> {
  const linked = await upsertOsPerson(config, person, options);
  await upsertOsNote(config, {
    id: stableUuid(`room-submission:${eventId}`),
    title: `Room form: ${room.name}`,
    markdown: submissionNoteMarkdown(person, room),
    personId: linked.personId,
    companyId: linked.companyId,
  }, options);
  return `${linked.created ? 'Created a person' : 'Updated the existing person'} and synced the room submission`;
}

export async function syncOsVisit(config: OsConfig, person: Person, visit: VisitSummary, sessionId: string, options: OsOptions = {}): Promise<void> {
  const linked = await upsertOsPerson(config, person, options);
  await upsertOsNote(config, {
    id: stableUuid(`room-visit:${sessionId}`),
    title: `Room visit: ${visit.trackName}`,
    markdown: activityNoteMarkdown(visit),
    personId: linked.personId,
    companyId: linked.companyId,
  }, options);
}

/** Read-only checks for every object the connector writes. */
export async function checkOsConnection(config: OsConfig, options: OsOptions = {}): Promise<void> {
  const results = await Promise.all(
    ['people', 'companies', 'notes', 'noteTargets'].map((plural) => request(config, 'GET', `/${plural}?fields=id&limit=1`, undefined, options)),
  );
  results.forEach(ensure);
}
