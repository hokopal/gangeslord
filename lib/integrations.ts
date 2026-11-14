import { decryptKey, encryptKey } from './ai/crypto';
import { assertPublicUrl } from './ingest/net';
import {
  connectionHint, INTEGRATION_KINDS, normalizeEvents, parseConnectionUrl, slackText, webhookPayload,
  type AlertDetails, type AlertEvent, type IntegrationKind,
} from './integrations-core';
import { createAdminSupabase, serverSecret } from './supabase/admin';

// Every function here bypasses row-level security. Callers must first confirm that the
// current user is an admin of the workspace (or, for notify, that the event is genuine).

export type IntegrationStatus = {
  kind: IntegrationKind;
  configured: boolean;
  hint: string;
  events: AlertEvent[];
  lastStatus: string | null;
  lastSentAt: string | null;
};

type Row = { kind: string; hint: string; events: string[]; last_status: string | null; last_sent_at: string | null };

export async function listIntegrations(workspaceId: string): Promise<IntegrationStatus[]> {
  const { data } = await createAdminSupabase()
    .from('workspace_integrations')
    .select('kind, hint, events, last_status, last_sent_at')
    .eq('workspace_id', workspaceId);
  const rows = (data ?? []) as Row[];
  return INTEGRATION_KINDS.map((kind) => {
    const row = rows.find((r) => r.kind === kind);
    return {
      kind,
      configured: Boolean(row),
      hint: row?.hint ?? '',
      events: normalizeEvents(row?.events ?? []),
      lastStatus: row?.last_status ?? null,
      lastSentAt: row?.last_sent_at ?? null,
    };
  });
}

/**
 * Saves a connection. The address may be left blank to keep the one already saved and only
 * change which alerts are sent. Throws slack_url_invalid, webhook_url_invalid, url_blocked or integration_missing.
 */
export async function saveIntegration(
  workspaceId: string,
  userId: string,
  kind: IntegrationKind,
  rawUrl: string,
  events: readonly unknown[],
): Promise<void> {
  const admin = createAdminSupabase();
  const chosen = normalizeEvents(events);
  if (rawUrl.trim() === '') {
    const { data, error } = await admin
      .from('workspace_integrations')
      .update({ events: chosen, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('kind', kind)
      .select('kind');
    if (error) throw new Error('integration_failed');
    if (!data || data.length === 0) throw new Error('integration_missing');
    return;
  }
  const url = parseConnectionUrl(kind, rawUrl);
  // A generic webhook can point anywhere, so refuse private and internal addresses.
  if (kind === 'webhook') await assertPublicUrl(url.toString());
  const { error } = await admin.from('workspace_integrations').upsert({
    workspace_id: workspaceId,
    kind,
    secret_ciphertext: encryptKey(url.toString(), serverSecret()),
    hint: connectionHint(url),
    events: chosen,
    last_status: null,
    last_sent_at: null,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('integration_failed');
}

export async function removeIntegration(workspaceId: string, kind: IntegrationKind): Promise<void> {
  const { error } = await createAdminSupabase().from('workspace_integrations').delete().eq('workspace_id', workspaceId).eq('kind', kind);
  if (error) throw new Error('integration_failed');
}

/** Sends one message to one connection. Returns a short status for the admin to see; never throws. */
async function deliver(kind: IntegrationKind, address: string, event: AlertEvent | 'test', details: AlertDetails): Promise<string> {
  try {
    const url = parseConnectionUrl(kind, address);
    if (kind === 'webhook') await assertPublicUrl(url.toString());
    const body =
      kind === 'slack'
        ? { text: event === 'test' ? `Pipemouse is connected to this channel for *${details.workspaceName}*. Alerts will appear here.` : slackText(event, details) }
        : webhookPayload(event, details, new Date().toISOString());
    const response = await fetch(url, {
      method: 'POST',
      // Never follow a redirect: the destination was checked, a redirect target was not.
      redirect: 'manual',
      headers: { 'content-type': 'application/json', 'user-agent': 'Pipemouse-Alerts/1' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? 'Delivered' : `Failed: the destination answered ${response.status}`;
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'url_blocked') return 'Failed: the address points to a private network';
    return 'Failed: the destination could not be reached';
  }
}

async function record(workspaceId: string, kind: IntegrationKind, status: string): Promise<void> {
  await createAdminSupabase()
    .from('workspace_integrations')
    .update({ last_status: status, last_sent_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('kind', kind);
}

async function loadAddress(workspaceId: string, kind: IntegrationKind): Promise<string | null> {
  const { data } = await createAdminSupabase()
    .from('workspace_integrations')
    .select('secret_ciphertext')
    .eq('workspace_id', workspaceId)
    .eq('kind', kind)
    .maybeSingle();
  if (!data) return null;
  return decryptKey(data.secret_ciphertext as string, serverSecret());
}

/** Sends a test message to one connection and returns the result. Throws integration_missing. */
export async function sendTest(workspaceId: string, kind: IntegrationKind, details: AlertDetails): Promise<string> {
  const address = await loadAddress(workspaceId, kind);
  if (!address) throw new Error('integration_missing');
  const status = await deliver(kind, address, 'test', details);
  await record(workspaceId, kind, `Test: ${status}`);
  return status;
}

/** Which connections of a workspace want this alert. */
export async function connectionsFor(workspaceId: string, event: AlertEvent): Promise<IntegrationKind[]> {
  const { data } = await createAdminSupabase()
    .from('workspace_integrations')
    .select('kind')
    .eq('workspace_id', workspaceId)
    .contains('events', [event]);
  return ((data ?? []) as { kind: string }[]).map((r) => r.kind).filter((k): k is IntegrationKind => (INTEGRATION_KINDS as readonly string[]).includes(k));
}

/** Sends an alert to every connection that asked for it. Never throws. */
export async function notify(workspaceId: string, kinds: readonly IntegrationKind[], event: AlertEvent, details: AlertDetails): Promise<void> {
  await Promise.all(
    kinds.map(async (kind) => {
      try {
        const address = await loadAddress(workspaceId, kind);
        if (!address) return;
        await record(workspaceId, kind, await deliver(kind, address, event, details));
      } catch {
        // An alert must never break the visit that triggered it.
      }
    }),
  );
}
