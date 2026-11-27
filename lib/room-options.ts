// How a room looks and behaves beyond its content: display options and the lead form.
// Pure and shared by the settings screen, the server and the buyer's room.

export type Display = { share: boolean; progress: boolean; numbers: boolean; comments: boolean; steps: boolean; sign: boolean };
export const DEFAULT_DISPLAY: Display = { share: true, progress: true, numbers: false, comments: true, steps: true, sign: true };

export function normalizeDisplay(raw: unknown): Display {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const flag = (key: keyof Display) => (typeof value[key] === 'boolean' ? (value[key] as boolean) : DEFAULT_DISPLAY[key]);
  // Accept & sign only exists inside the Next steps panel; off when the panel is off.
  const steps = flag('steps');
  return { share: flag('share'), progress: flag('progress'), numbers: flag('numbers'), comments: flag('comments'), steps, sign: steps && flag('sign') };
}

export const FORM_FIELDS = [
  { key: 'firstname', label: 'First name', type: 'text', autoComplete: 'given-name' },
  { key: 'lastname', label: 'Last name', type: 'text', autoComplete: 'family-name' },
  { key: 'email', label: 'Work email', type: 'email', autoComplete: 'email' },
  { key: 'company', label: 'Company', type: 'text', autoComplete: 'organization' },
  { key: 'jobtitle', label: 'Job title', type: 'text', autoComplete: 'organization-title' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
] as const;
export type FieldKey = (typeof FORM_FIELDS)[number]['key'];
const FIELD_KEYS = FORM_FIELDS.map((f) => f.key) as readonly string[];

export type FormWhen = 'start' | 'time' | 'items';
export type FormField = { key: FieldKey; required: boolean };
/** A question the workspace wrote itself, answered in a line of text. */
export type CustomField = { key: string; label: string; required: boolean };
/** What the buyer's room needs to show the form. */
export type PublicForm = {
  when: FormWhen; seconds: number; items: number; heading: string; intro: string; button: string; fields: FormField[];
  /** A statement the visitor must tick to agree to. Empty when there is none. */
  consent: string;
  custom: CustomField[];
  /** Set by the server when it has held the room's content back until the form is filled in. */
  locked?: boolean;
};
/**
 * The form as the settings screen sees it: the public part plus where submissions are sent.
 * `webhook` is only ever a new address being typed in; the saved one is stored encrypted and is
 * never sent back, so `webhookSet` says whether there is one.
 */
export type FormConfig = PublicForm & { enabled: boolean; hubspot: boolean; webhook: string; webhookSet: boolean };
export const MAX_CUSTOM_FIELDS = 3;

export const DEFAULT_FORM: FormConfig = {
  enabled: false, when: 'start', seconds: 30, items: 1,
  heading: 'Tell us who you are', intro: '', button: 'Continue',
  fields: [{ key: 'firstname', required: true }, { key: 'email', required: true }, { key: 'company', required: false }],
  consent: '', custom: [],
  hubspot: false, webhook: '', webhookSet: false,
};

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};
const text = (value: unknown, max: number, fallback: string) => (typeof value === 'string' && value.trim() !== '' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : fallback);

/** Tidies the fields a room form asks for. Email is always present and always required. */
function normalizeFields(raw: unknown): FormField[] {
  const seen = new Set<string>();
  const fields: FormField[] = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    const key = (entry as { key?: unknown })?.key;
    if (typeof key !== 'string' || !FIELD_KEYS.includes(key) || seen.has(key)) continue;
    seen.add(key);
    fields.push({ key: key as FieldKey, required: key === 'email' ? true : Boolean((entry as { required?: unknown }).required) });
  }
  if (!seen.has('email')) fields.push({ key: 'email', required: true });
  // Always shown in the same, familiar order.
  return fields.sort((a, b) => FIELD_KEYS.indexOf(a.key) - FIELD_KEYS.indexOf(b.key));
}

/** Tidies the workspace's own questions: at most three, each with a label, keyed by position. */
function normalizeCustom(raw: unknown): CustomField[] {
  const out: CustomField[] = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    const label = text((entry as { label?: unknown })?.label, 80, '');
    if (label === '' || out.length >= MAX_CUSTOM_FIELDS) continue;
    out.push({ key: `custom_${out.length + 1}`, label, required: Boolean((entry as { required?: unknown }).required) });
  }
  return out;
}

/** Reads a stored or submitted form configuration. Throws webhook_url_invalid. */
export function normalizeForm(raw: unknown): FormConfig {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const when: FormWhen = value.when === 'time' || value.when === 'items' ? value.when : 'start';
  const webhook = typeof value.webhook === 'string' ? value.webhook.trim() : '';
  if (webhook !== '') {
    let url: URL | null = null;
    try {
      url = new URL(webhook);
    } catch {
      url = null;
    }
    if (!url || url.protocol !== 'https:' || url.username || url.password || webhook.length > 500) throw new Error('webhook_url_invalid');
  }
  return {
    enabled: Boolean(value.enabled),
    when,
    seconds: clamp(value.seconds, 5, 3600, DEFAULT_FORM.seconds),
    items: clamp(value.items, 1, 50, DEFAULT_FORM.items),
    heading: text(value.heading, 80, DEFAULT_FORM.heading),
    intro: text(value.intro, 240, ''),
    button: text(value.button, 40, DEFAULT_FORM.button),
    fields: value.fields === undefined ? DEFAULT_FORM.fields : normalizeFields(value.fields),
    consent: text(value.consent, 300, ''),
    custom: normalizeCustom(value.custom),
    hubspot: Boolean(value.hubspot),
    webhook,
    webhookSet: webhook !== '' || (typeof value.webhook_enc === 'string' && value.webhook_enc !== ''),
  };
}

/** The part of a stored form the room is given; null when the form is off. */
export function publicForm(raw: unknown): PublicForm | null {
  if (!raw || typeof raw !== 'object') return null;
  const { when, seconds, items, heading, intro, button, fields, consent, custom } = normalizeForm({ ...(raw as object), webhook: '' });
  return { when, seconds, items, heading, intro, button, fields, consent, custom };
}

/**
 * Checks what a buyer typed against the form. Returns the cleaned values, or throws
 * form_incomplete, email_invalid or consent_required.
 */
export function cleanSubmission(
  fields: readonly FormField[],
  values: Record<string, unknown>,
  extra: { custom?: readonly CustomField[]; consent?: string } = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of [...fields, ...(extra.custom ?? [])]) {
    const value = typeof values[field.key] === 'string' ? (values[field.key] as string).replace(/\s+/g, ' ').trim().slice(0, 200) : '';
    if (value === '') {
      if (field.required) throw new Error('form_incomplete');
      continue;
    }
    out[field.key] = field.key === 'email' ? value.toLowerCase() : value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email ?? '')) throw new Error('email_invalid');
  if (extra.consent) {
    // Recorded with the submission, so there is a record that this visitor agreed.
    if (values.consent !== 'on' && values.consent !== 'yes') throw new Error('consent_required');
    out.consent = 'yes';
  }
  return out;
}

/**
 * Whether the form should be covering the room right now.
 * `known` visitors arrived on a personal link, so the seller already knows who they are.
 */
export function shouldGate(form: PublicForm | null | undefined, state: { unlocked: boolean; known: boolean; opened: number; seconds: number }): boolean {
  if (!form || state.unlocked || state.known) return false;
  if (form.when === 'time') return state.seconds >= form.seconds;
  // "After N items": the form appears as the visitor opens item N + 1.
  if (form.when === 'items') return state.opened > form.items;
  return true;
}

/** Links that share a room's public address. Personal-link tokens are never part of it. */
export function shareLinks(url: string, title: string): { label: string; href: string }[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { label: 'Email', href: `mailto:?subject=${t}&body=${u}` },
  ];
}
