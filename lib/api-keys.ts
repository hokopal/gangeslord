import { createHash, randomBytes } from 'node:crypto';
import { createAdminSupabase } from './supabase/admin';

export type ApiScope = 'read' | 'write';
export type ApiKeyInfo = { id: string; name: string; prefix: string; scope: ApiScope; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };

const KEY_PATTERN = /^fello_sk_[0-9a-f]{48}$/;

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

/** A new secret key, its hash for storage, and a short prefix that is safe to show later. */
export function generateKey(): { key: string; hash: string; prefix: string } {
  const key = `fello_sk_${randomBytes(24).toString('hex')}`;
  return { key, hash: hashKey(key), prefix: `${key.slice(0, 13)}…${key.slice(-4)}` };
}

/** The API key in a request's Authorization header, or null if there is none or it is malformed. */
export function bearerKey(request: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '');
  return match && KEY_PATTERN.test(match[1]) ? match[1] : null;
}

// The functions below use the service role. Management functions must only be called for workspace admins.

/** Creates a key and returns it. This is the only time the key itself is available. */
export async function createApiKey(workspaceId: string, userId: string, rawName: string, scope: ApiScope): Promise<string> {
  const name = rawName.replace(/\s+/g, ' ').trim();
  if (name === '' || name.length > 80) throw new Error('api_key_name_required');
  const { key, hash, prefix } = generateKey();
  const { error } = await createAdminSupabase()
    .from('workspace_api_keys')
    .insert({ workspace_id: workspaceId, name, key_hash: hash, prefix, scope: scope === 'write' ? 'write' : 'read', created_by: userId });
  if (error) throw new Error('api_key_failed');
  return key;
}

export async function listApiKeys(workspaceId: string): Promise<ApiKeyInfo[]> {
  const { data } = await createAdminSupabase()
    .from('workspace_api_keys')
    .select('id, name, prefix, scope, created_at, last_used_at, revoked_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  return ((data ?? []) as { id: string; name: string; prefix: string; scope: ApiScope; created_at: string; last_used_at: string | null; revoked_at: string | null }[]).map(
    (k) => ({ id: k.id, name: k.name, prefix: k.prefix, scope: k.scope, createdAt: k.created_at, lastUsedAt: k.last_used_at, revokedAt: k.revoked_at }),
  );
}

export async function revokeApiKey(workspaceId: string, id: string): Promise<void> {
  const { error } = await createAdminSupabase()
    .from('workspace_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .is('revoked_at', null);
  if (error) throw new Error('api_key_failed');
}

export type ApiCaller = { keyId: string; workspaceId: string; workspaceSlug: string; scope: ApiScope };

/** Identifies the workspace behind a request's API key. Null for a missing, unknown or revoked key, or a suspended workspace. */
export async function authenticateApiKey(request: Request): Promise<ApiCaller | null> {
  const key = bearerKey(request);
  if (!key) return null;
  let admin: ReturnType<typeof createAdminSupabase>;
  try {
    admin = createAdminSupabase();
  } catch {
    return null;
  }
  const { data } = await admin
    .from('workspace_api_keys')
    .select('id, workspace_id, scope, workspaces!inner(slug, suspended_at)')
    .eq('key_hash', hashKey(key))
    .is('revoked_at', null)
    .maybeSingle();
  if (!data) return null;
  const workspace = (Array.isArray(data.workspaces) ? data.workspaces[0] : data.workspaces) as { slug: string; suspended_at: string | null } | undefined;
  if (!workspace || workspace.suspended_at) return null;
  await admin.from('workspace_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return { keyId: data.id as string, workspaceId: data.workspace_id as string, workspaceSlug: workspace.slug, scope: data.scope as ApiScope };
}

/** Requests each key may make per minute, across the REST API and the MCP server together. */
export const RATE_LIMIT = { requests: 120, seconds: 60 };

export type RateState = { allowed: boolean; limit: number; remaining: number; reset: number };

/** Counts this request against the key's allowance. If the counter can't be reached, the request is let through. */
export async function countRequest(caller: ApiCaller): Promise<RateState> {
  const open: RateState = { allowed: true, limit: RATE_LIMIT.requests, remaining: RATE_LIMIT.requests, reset: RATE_LIMIT.seconds };
  try {
    const { data, error } = await createAdminSupabase().rpc('api_rate_hit', { p_key: caller.keyId, p_limit: RATE_LIMIT.requests, p_seconds: RATE_LIMIT.seconds });
    if (error || !data) return open;
    const state = data as { allowed: boolean; remaining: number; reset: number };
    return { allowed: Boolean(state.allowed), limit: RATE_LIMIT.requests, remaining: Number(state.remaining), reset: Number(state.reset) };
  } catch {
    return open;
  }
}

/** Counts a JSON-RPC batch as individual requests, stopping before any over-limit message can run. */
export async function countRequests(caller: ApiCaller, count: number): Promise<RateState> {
  let state: RateState = { allowed: true, limit: RATE_LIMIT.requests, remaining: RATE_LIMIT.requests, reset: RATE_LIMIT.seconds };
  for (let index = 0; index < Math.max(1, count); index += 1) {
    state = await countRequest(caller);
    if (!state.allowed) return state;
  }
  return state;
}

/** Standard rate-limit response headers, plus Retry-After when the request was refused. */
export function rateHeaders(state: RateState): Record<string, string> {
  return {
    'ratelimit-limit': String(state.limit),
    'ratelimit-remaining': String(state.remaining),
    'ratelimit-reset': String(state.reset),
    ...(state.allowed ? {} : { 'retry-after': String(Math.max(state.reset, 1)) }),
  };
}
