import { decryptKey, encryptKey } from './ai/crypto';
import { ga4Payload, parseGa4Config, type Ga4Details, type Ga4Event } from './ga4-core';
import { createAdminSupabase, serverSecret } from './supabase/admin';

// The Google Analytics connection. Everything here runs with the service role, so callers must
// already have checked that the person is a workspace admin; buyers never reach it.

const KIND = 'ga4';
const COLLECT = 'https://www.google-analytics.com/mp/collect';
const VALIDATE = 'https://www.google-analytics.com/debug/mp/collect';

export type Ga4Status = {
  connected: boolean;
  measurementId: string | null;
  log: { event: string; ok: boolean; detail: string; createdAt: string }[];
};

export async function getGa4Status(workspaceId: string): Promise<Ga4Status> {
  const admin = createAdminSupabase();
  const [{ data: row }, { data: log }] = await Promise.all([
    admin.from('workspace_integrations').select('hint').eq('workspace_id', workspaceId).eq('kind', KIND).maybeSingle(),
    admin.from('integration_log').select('event, ok, detail, created_at').eq('workspace_id', workspaceId).eq('kind', KIND).order('created_at', { ascending: false }).limit(20),
  ]);
  return {
    connected: Boolean(row),
    measurementId: (row?.hint as string | undefined) ?? null,
    log: ((log ?? []) as { event: string; ok: boolean; detail: string; created_at: string }[]).map((entry) => ({ event: entry.event, ok: entry.ok, detail: entry.detail, createdAt: entry.created_at })),
  };
}

/** Saves the connection. The API secret is stored encrypted and is never shown again. Throws ga4_id_invalid or ga4_secret_invalid. */
export async function saveGa4(workspaceId: string, userId: string, measurementId: string, apiSecret: string): Promise<void> {
  const config = parseGa4Config(measurementId, apiSecret);
  const { error } = await createAdminSupabase().from('workspace_integrations').upsert({
    workspace_id: workspaceId, kind: KIND, secret_ciphertext: encryptKey(config.apiSecret, serverSecret()), hint: config.measurementId,
    events: [], updated_by: userId, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('unknown');
}

export async function removeGa4(workspaceId: string): Promise<void> {
  await createAdminSupabase().from('workspace_integrations').delete().eq('workspace_id', workspaceId).eq('kind', KIND);
}

async function connection(workspaceId: string): Promise<{ measurementId: string; apiSecret: string } | null> {
  const { data } = await createAdminSupabase().from('workspace_integrations').select('hint, secret_ciphertext').eq('workspace_id', workspaceId).eq('kind', KIND).maybeSingle();
  if (!data) return null;
  try {
    return { measurementId: data.hint as string, apiSecret: decryptKey(data.secret_ciphertext as string, serverSecret()) };
  } catch {
    return null;
  }
}

async function record(workspaceId: string, event: string, ok: boolean, detail: string): Promise<void> {
  await createAdminSupabase().from('integration_log').insert({ workspace_id: workspaceId, kind: KIND, event, ok, detail: detail.slice(0, 300) });
}

async function post(url: string, config: { measurementId: string; apiSecret: string }, body: unknown): Promise<Response> {
  const address = `${url}?measurement_id=${encodeURIComponent(config.measurementId)}&api_secret=${encodeURIComponent(config.apiSecret)}`;
  return fetch(address, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8_000) });
}

/**
 * Sends one event to Google Analytics if the workspace has connected it, and logs how it went.
 * Best-effort: it never throws, so it cannot hold up or break an alert.
 */
export async function sendGa4(workspaceId: string, event: Ga4Event, details: Ga4Details): Promise<void> {
  try {
    const config = await connection(workspaceId);
    if (!config) return;
    const response = await post(COLLECT, config, ga4Payload(event, details));
    // Google answers 2xx even for events it will discard, so "sent" is all that can honestly be said here.
    await record(workspaceId, event, response.ok, response.ok ? 'Sent' : `Google returned ${response.status}`);
  } catch {
    await record(workspaceId, event, false, 'Could not reach Google Analytics').catch(() => undefined);
  }
}

/**
 * Sends a test event and asks Google's validation service whether the event is well-formed.
 * Returns a sentence for the admin. Google does not confirm that the secret is right; the only
 * proof of that is the event appearing in the Realtime report.
 */
export async function testGa4(workspaceId: string, workspaceName: string): Promise<string> {
  const config = await connection(workspaceId);
  if (!config) return 'Google Analytics is not connected.';
  const body = ga4Payload('test', { visitorId: crypto.randomUUID(), room: 'Test room', workspace: workspaceName });
  try {
    const [sent, checked] = await Promise.all([post(COLLECT, config, body), post(VALIDATE, config, body)]);
    const messages = (((await checked.json().catch(() => ({}))) as { validationMessages?: { description?: string }[] }).validationMessages ?? []).map((m) => m.description ?? '').filter(Boolean);
    const ok = sent.ok && messages.length === 0;
    const detail = !sent.ok ? `Google returned ${sent.status}` : messages.length > 0 ? `Google found a problem: ${messages[0]}` : 'Sent, and Google found no problem with the format';
    await record(workspaceId, 'test', ok, detail);
    return ok ? 'Test event sent. Open Reports → Realtime in Google Analytics and look for pipemouse_test within a minute; that is the proof the secret is right.' : `${detail}.`;
  } catch {
    await record(workspaceId, 'test', false, 'Could not reach Google Analytics').catch(() => undefined);
    return 'Could not reach Google Analytics.';
  }
}
