// Sales and marketing tools a workspace can connect with its own credentials, so that people who
// fill in a room's form appear there. Pure helpers, shared by the settings screen and the server.

export const CRM_KINDS = ['pipemouse_os', 'apollo', 'salesforce', 'salesloft', 'instantly', 'mailchimp'] as const;
export type CrmKind = (typeof CRM_KINDS)[number];
export const isCrmKind = (value: unknown): value is CrmKind => typeof value === 'string' && (CRM_KINDS as readonly string[]).includes(value);

type Field = { key: string; label: string; secret: boolean; placeholder: string; help: string };
const API_KEY = (help: string): Field => ({ key: 'apiKey', label: 'API key', secret: true, placeholder: '', help });

export const CRM_INFO: Record<CrmKind, { name: string; summary: string; does: string[]; fields: Field[] }> = {
  pipemouse_os: {
    name: 'Pipemouse OS',
    summary: 'Keep OS people, companies and notes in sync with identified Rooms visitors and lead forms.',
    does: [
      'People are matched by email and companies by domain or name, so repeat activity updates the same records.',
      'Each identified room visit gets one OS note that is rewritten as items, engagement and button clicks arrive.',
      'Each lead form submission gets its own linked note. Custom form answers stay in Rooms.',
    ],
    fields: [
      { key: 'baseUrl', label: 'OS workspace address', secret: false, placeholder: 'https://os.example.com', help: 'The public HTTPS address of your OS workspace, without a path.' },
      API_KEY('In OS, open Settings → Developers → API keys and create a key with access to people, companies and notes.'),
    ],
  },
  apollo: {
    name: 'Apollo',
    summary: 'Add people who fill in a room’s form to Apollo as contacts.',
    does: [
      'When someone fills in a room’s form, Pipemouse looks for a contact with that email in Apollo.',
      'If there is one, its name, company and job title are updated. If not, a contact is created.',
      'Either way the contact is added to a list called “Pipemouse”.',
    ],
    fields: [API_KEY('In Apollo: Settings → Integrations → API → API keys. It needs access to the contacts endpoints.')],
  },
  salesforce: {
    name: 'Salesforce',
    summary: 'Create a lead in Salesforce, or log activity on an existing one, when someone fills in a room’s form.',
    does: [
      'When someone fills in a room’s form, Pipemouse looks for a lead, then a contact, with that email.',
      'If neither exists, a lead is created with the lead source “Pipemouse”.',
      'A completed task is logged on the lead or contact, naming the room and linking to it.',
    ],
    fields: [
      { key: 'domain', label: 'My Domain address', secret: false, placeholder: 'yourcompany.my.salesforce.com', help: 'Shown in Salesforce Setup → My Domain. A sandbox address works too.' },
      { key: 'clientId', label: 'Consumer key', secret: true, placeholder: '', help: 'From a connected app (or external client app) you create in Setup with the client credentials flow switched on.' },
      { key: 'clientSecret', label: 'Consumer secret', secret: true, placeholder: '', help: 'From the same app. The app’s “run as” user decides what Pipemouse may create.' },
    ],
  },
  salesloft: {
    name: 'Salesloft',
    summary: 'Add people who fill in a room’s form to Salesloft as people, ready to put in a cadence.',
    does: [
      'When someone fills in a room’s form, Pipemouse creates them as a person in Salesloft, tagged “Pipemouse”.',
      'If a person with that email already exists, their name, company and job title are updated.',
    ],
    fields: [API_KEY('In Salesloft: Your Applications → API Keys → Create new. The key acts as the person who created it.')],
  },
  instantly: {
    name: 'Instantly',
    summary: 'Add people who fill in a room’s form to a lead list in Instantly.',
    does: [
      'When someone fills in a room’s form, Pipemouse adds them to the lead list you choose.',
      'Someone already in your Instantly workspace is left as they are, not added twice.',
    ],
    fields: [
      API_KEY('In Instantly: Settings → Integrations → API keys. It needs permission to create leads and read lead lists.'),
      { key: 'listId', label: 'Lead list ID', secret: false, placeholder: '019a5522-76cf-7553-b12f-66c3a2d04d95', help: 'Open the lead list in Instantly; the ID is the last part of the address.' },
    ],
  },
  mailchimp: {
    name: 'Mailchimp',
    summary: 'Add people who fill in a room’s form to a Mailchimp audience.',
    does: [
      'When someone fills in a room’s form, Pipemouse adds them to the audience you choose, tagged “Pipemouse”.',
      'If the form has a consent statement and they ticked it, they are added as subscribed.',
      'Otherwise they are added as pending, and Mailchimp emails them to confirm before they receive anything.',
      'Someone already in the audience keeps their current status; only their name is updated.',
    ],
    fields: [
      API_KEY('In Mailchimp: Profile → Extras → API keys. It ends in a dash and your data centre, for example -us21.'),
      { key: 'audienceId', label: 'Audience ID', secret: false, placeholder: 'a1b2c3d4e5', help: 'In Mailchimp: Audience → Settings → Audience name and defaults.' },
    ],
  },
};

const SALESFORCE_HOST = /^[a-z0-9][a-z0-9-]*(--[a-z0-9]+)?(\.(sandbox|develop|scratch|trailblaze))?\.my\.salesforce\.com$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ending = (key: string) => `key ending ${key.slice(-4)}`;

/**
 * Checks what an admin typed. Returns the secret to store (encrypted by the caller) and a harmless
 * reminder of which account is connected. Throws crm_settings_invalid or salesforce_domain_invalid.
 */
export function parseCrmSettings(kind: CrmKind, values: Record<string, string>): { secret: string; hint: string } {
  const clean = (key: string) => (values[key] ?? '').trim();
  const invalid = new Error('crm_settings_invalid');
  const apiKey = clean('apiKey');
  if (kind === 'pipemouse_os') {
    let url: URL;
    try {
      url = new URL(clean('baseUrl'));
    } catch {
      throw new Error('os_url_invalid');
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('os_url_invalid');
    if (!/^[A-Za-z0-9_.:-]{16,2048}$/.test(apiKey)) throw invalid;
    return { secret: JSON.stringify({ baseUrl: url.origin, apiKey }), hint: `${url.hostname}, ${ending(apiKey)}` };
  }
  if (kind === 'apollo' || kind === 'salesloft') {
    if (!/^[A-Za-z0-9_.-]{16,200}$/.test(apiKey)) throw invalid;
    return { secret: JSON.stringify({ apiKey }), hint: ending(apiKey) };
  }
  if (kind === 'instantly') {
    const listId = clean('listId').toLowerCase();
    if (!/^[A-Za-z0-9_.:=+/-]{16,400}$/.test(apiKey) || !UUID.test(listId)) throw invalid;
    return { secret: JSON.stringify({ apiKey, listId }), hint: `${ending(apiKey)}, list …${listId.slice(-4)}` };
  }
  if (kind === 'mailchimp') {
    // The key names its own data centre, which is the only part of the address that varies.
    const match = /^[a-f0-9]{32}-([a-z]{2,4}\d{1,3})$/.exec(apiKey);
    const audienceId = clean('audienceId').toLowerCase();
    if (!match || !/^[a-z0-9]{6,20}$/.test(audienceId)) throw invalid;
    return { secret: JSON.stringify({ apiKey, dc: match[1], audienceId }), hint: `audience ${audienceId} on ${match[1]}` };
  }
  // Only Salesforce's own addresses are accepted, so this can never be pointed at another server.
  const domain = clean('domain').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!SALESFORCE_HOST.test(domain)) throw new Error('salesforce_domain_invalid');
  const clientId = clean('clientId');
  const clientSecret = clean('clientSecret');
  if (clientId.length < 20 || clientId.length > 256 || clientSecret.length < 16 || clientSecret.length > 256 || /\s/.test(clientId + clientSecret)) throw invalid;
  return { secret: JSON.stringify({ domain, clientId, clientSecret }), hint: domain };
}

export type Person = Record<string, string>;
const last = (person: Person) => person.lastname || person.firstname || person.email.split('@')[0];
/** Only the fields that have a value, under the names the other tool uses. */
const pick = (person: Person, names: Record<string, string>) =>
  Object.fromEntries(Object.entries(names).filter(([ours]) => person[ours]).map(([ours, theirs]) => [theirs, person[ours]]));

/** The contact Apollo is sent. */
export function apolloContact(person: Person) {
  return { email: person.email, ...pick(person, { firstname: 'first_name', lastname: 'last_name', company: 'organization_name', jobtitle: 'title', phone: 'direct_phone' }), label_names: ['Pipemouse'] };
}

/** The lead Salesforce is sent. Salesforce requires a last name and a company on every lead. */
export function salesforceLead(person: Person) {
  return {
    LastName: last(person).slice(0, 80),
    ...(person.firstname && person.lastname ? { FirstName: person.firstname.slice(0, 40) } : {}),
    Company: (person.company || 'Not provided').slice(0, 255),
    Email: person.email,
    ...(person.jobtitle ? { Title: person.jobtitle.slice(0, 128) } : {}),
    ...(person.phone ? { Phone: person.phone.slice(0, 40) } : {}),
    LeadSource: 'Pipemouse',
  };
}

/** The completed task logged on the lead or contact. */
export function salesforceTask(whoId: string, room: { name: string; url: string }, today: string) {
  return { WhoId: whoId, Subject: `Filled in the form in the Pipemouse room “${room.name}”`.slice(0, 255), Status: 'Completed', ActivityDate: today, Description: `Room: ${room.url}` };
}

/** A query that finds a record by email. The address is escaped so it cannot change the query. */
export function soqlByEmail(object: 'Lead' | 'Contact', email: string): string {
  const safe = email.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `SELECT Id FROM ${object} WHERE Email = '${safe}'${object === 'Lead' ? ' AND IsConverted = false' : ''} LIMIT 1`;
}

/** The person Salesloft is sent. */
export function salesloftPerson(person: Person) {
  return { email_address: person.email, ...pick(person, { firstname: 'first_name', lastname: 'last_name', jobtitle: 'title', phone: 'phone', company: 'person_company_name' }), tags: ['Pipemouse'] };
}

/** The lead Instantly is sent. Someone already in the workspace is skipped, not duplicated. */
export function instantlyLead(person: Person, listId: string) {
  return { email: person.email, ...pick(person, { firstname: 'first_name', lastname: 'last_name', company: 'company_name', phone: 'phone' }), list_id: listId, skip_if_in_workspace: true };
}

/**
 * The audience member Mailchimp is sent. Without recorded consent the person is added as pending,
 * so Mailchimp asks them to confirm before any marketing email reaches them.
 */
export function mailchimpMember(person: Person) {
  return {
    email_address: person.email,
    status_if_new: person.consent === 'yes' ? 'subscribed' : 'pending',
    merge_fields: pick(person, { firstname: 'FNAME', lastname: 'LNAME' }),
    tags: ['Pipemouse'],
  };
}
