import { decryptKey, encryptKey } from './ai/crypto';
import { assertPublicUrl } from './ingest/net';
import { csvCell } from './audience-core';
import { pushSubmission } from './crm-connectors';
import { normalizeDisplay, normalizeForm, type Display, type FormConfig } from './room-options';
import { createAdminSupabase, serverSecret } from './supabase/admin';
import { createServerSupabase } from './supabase/server';

export type Submission = { id: string; email: string; fields: Record<string, string>; hubspotStatus: string | null; webhookStatus: string | null; createdAt: string };

/** A track's display options and form. Access rules decide who can read them. */
export async function getRoomOptions(workspaceId: string, trackId: string): Promise<{ display: Display; form: FormConfig } | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from('tracks').select('display, form').eq('workspace_id', workspaceId).eq('id', trackId).maybeSingle();
  if (!data) return null;
  let form: FormConfig;
  try {
    form = normalizeForm(data.form);
  } catch {
    form = normalizeForm({ ...(data.form as object), webhook: '' });
  }
  return { display: normalizeDisplay(data.display), form };
}

type StoredForm = { webhook_enc?: string; webhook?: string };

/**
 * Saves a track's display options and form. Only people who may edit the room pass the database's
 * access rules. The webhook address is stored encrypted: a new one replaces it, a blank one keeps
 * what is saved, and `removeWebhook` clears it. Throws webhook_url_invalid.
 */
export async function saveRoomOptions(workspaceId: string, trackId: string, display: unknown, form: unknown, removeWebhook = false): Promise<void> {
  const config = normalizeForm(form);
  const supabase = await createServerSupabase();
  const { data: current } = await supabase.from('tracks').select('form').eq('workspace_id', workspaceId).eq('id', trackId).maybeSingle();
  const saved = ((current?.form ?? {}) as StoredForm);
  // An address saved before encryption was introduced is encrypted the next time the form is saved.
  const kept = saved.webhook_enc ?? (saved.webhook ? encryptKey(saved.webhook, serverSecret()) : null);
  const address = config.webhook ? encryptKey(config.webhook, serverSecret()) : removeWebhook ? null : kept;
  const stored: Record<string, unknown> = { ...config };
  delete stored.webhook;
  delete stored.webhookSet;
  if (address) stored.webhook_enc = address;
  const values = { display: normalizeDisplay(display), form: stored };
  const { data, error } = await supabase.from('tracks').update(values).eq('workspace_id', workspaceId).eq('id', trackId).select('id');
  if (error) throw new Error('unknown');
  if (!data || data.length === 0) throw new Error('not_allowed');
}

export async function listSubmissions(workspaceId: string, trackId: string, limit = 200): Promise<Submission[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('form_submissions')
    .select('id, email, fields, hubspot_status, webhook_status, created_at')
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return ((data ?? []) as { id: string; email: string; fields: Record<string, string>; hubspot_status: string | null; webhook_status: string | null; created_at: string }[]).map((row) => ({
    id: row.id, email: row.email, fields: row.fields ?? {}, hubspotStatus: row.hubspot_status, webhookStatus: row.webhook_status, createdAt: row.created_at,
  }));
}

/** Submissions as a spreadsheet file: one row each, with the workspace's own questions as columns. */
export function submissionsCsv(rows: readonly Submission[], custom: readonly { key: string; label: string }[]): string {
  const standard = ['email', 'firstname', 'lastname', 'company', 'jobtitle', 'phone'];
  const header = ['Email', 'First name', 'Last name', 'Company', 'Job title', 'Phone', ...custom.map((q) => q.label), 'Consent', 'Submitted (UTC)', 'HubSpot', 'Webhook'];
  const lines = rows.map((row) =>
    [
      ...standard.map((key) => (key === 'email' ? row.email : (row.fields[key] ?? ''))),
      ...custom.map((q) => row.fields[q.key] ?? ''),
      row.fields.consent === 'yes' ? 'Yes' : '',
      row.createdAt,
      row.hubspotStatus ?? '',
      row.webhookStatus ?? '',
    ].map(csvCell).join(','),
  );
  return [header.map(csvCell).join(','), ...lines].join('\r\n') + '\r\n';
}

const HUBSPOT = 'https://api.hubapi.com/crm/v3/objects/contacts';
const HUBSPOT_PROPERTIES = ['firstname', 'lastname', 'email', 'company', 'jobtitle', 'phone'];

/** Creates the contact in HubSpot, or updates it if that email already exists. */
async function sendToHubspot(token: string, fields: Record<string, string>): Promise<string> {
  const properties = Object.fromEntries(Object.entries(fields).filter(([key]) => HUBSPOT_PROPERTIES.includes(key)));
  const request = (url: string, method: string) =>
    fetch(url, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ properties }), signal: AbortSignal.timeout(10_000) });
  let response = await request(HUBSPOT, 'POST');
  if (response.status === 409) response = await request(`${HUBSPOT}/${encodeURIComponent(fields.email)}?idProperty=email`, 'PATCH');
  if (response.ok) return 'Sent';
  if (response.status === 401) return 'Failed: HubSpot rejected the token';
  if (response.status === 403) return 'Failed: the HubSpot token lacks permission to write contacts';
  return `Failed: HubSpot returned ${response.status}`;
}

/**
 * Sends one submission wherever the track's form says to: HubSpot, a webhook, or both, and records
 * how each went. Runs after the buyer has their answer, with the service role. Never throws.
 */
export async function syncSubmission(submissionId: string, origin: string): Promise<void> {
  try {
    const admin = createAdminSupabase();
    const { data: submission } = await admin.from('form_submissions').select('id, workspace_id, track_id, email, fields, created_at').eq('id', submissionId).maybeSingle();
    if (!submission) return;
    const [{ data: track }, { data: workspace }] = await Promise.all([
      admin.from('tracks').select('name, slug, form').eq('id', submission.track_id).maybeSingle(),
      admin.from('workspaces').select('slug').eq('id', submission.workspace_id).maybeSingle(),
    ]);
    if (!track || !workspace) return;
    let form: FormConfig;
    try {
      form = normalizeForm(track.form);
    } catch {
      return;
    }
    const fields = submission.fields as Record<string, string>;
    const status: { hubspot_status?: string; webhook_status?: string } = {};

    if (form.hubspot) {
      const { data: integration } = await admin.from('workspace_integrations').select('secret_ciphertext').eq('workspace_id', submission.workspace_id).eq('kind', 'hubspot').maybeSingle();
      if (!integration) status.hubspot_status = 'Failed: HubSpot is not connected';
      else {
        try {
          status.hubspot_status = await sendToHubspot(decryptKey(integration.secret_ciphertext as string, serverSecret()), fields);
        } catch {
          status.hubspot_status = 'Failed: could not reach HubSpot';
        }
      }
    }

    const saved = track.form as StoredForm;
    let address = '';
    try {
      address = saved.webhook_enc ? decryptKey(saved.webhook_enc, serverSecret()) : (saved.webhook ?? '');
    } catch {
      status.webhook_status = 'Failed: the saved address could not be read';
    }
    if (address) {
      try {
        // The address must be on the public internet, never a machine inside our own network; and
        // redirects are not followed, so the address that was saved is the only place the data can go.
        await assertPublicUrl(address);
        const response = await fetch(address, {
          method: 'POST',
          redirect: 'manual',
          headers: { 'content-type': 'application/json', 'user-agent': 'Pipemouse-Forms/1.0' },
          body: JSON.stringify({
            event: 'form_submitted',
            submitted_at: submission.created_at,
            track: { id: submission.track_id, name: track.name },
            room_url: `${origin}/r/${workspace.slug}/${track.slug}`,
            ...fields,
            // The workspace's own questions, by their wording, and the statement the visitor agreed to.
            questions: Object.fromEntries(form.custom.filter((q) => fields[q.key]).map((q) => [q.label, fields[q.key]])),
            consent: fields.consent === 'yes' ? form.consent : null,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        status.webhook_status = response.ok ? 'Sent' : `Failed: the address returned ${response.status}`;
      } catch {
        status.webhook_status = 'Failed: could not reach the address';
      }
    }
    if (Object.keys(status).length > 0) await admin.from('form_submissions').update(status).eq('id', submissionId);
    // Sales tools the workspace connected with its own credentials (Apollo, Salesforce). Each logs its own result.
    await pushSubmission(submission.workspace_id as string, fields, { name: track.name as string, url: `${origin}/r/${workspace.slug}/${track.slug}` }, submissionId);
  } catch {
    // Syncing is best-effort; the submission itself is already stored.
  }
}
