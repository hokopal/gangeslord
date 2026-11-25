import { normalizeDomain } from './domain-dns';
import { withinLimit } from './rate-limit';
import { createAdminSupabase } from './supabase/admin';

export type WorkspaceDomainStatus = 'pending' | 'verified';
export type WorkspaceDomainBinding = {
  domain: string;
  workspaceId: string;
  status: WorkspaceDomainStatus;
  verifiedAt: string | null;
  createdAt: string;
};

type BindingRow = {
  domain: string;
  workspace_id: string;
  status: string;
  verified_at: string | null;
  created_at: string;
  workspaces?: { slug?: string; suspended_at?: string | null } | { slug?: string; suspended_at?: string | null }[] | null;
};

const VALID_CACHE_MS = 60_000;
const INVALID_CACHE_MS = 20_000;
const MAX_CACHE_ENTRIES = 1000;
const resolutionCache = new Map<string, { slug: string | null; expires: number }>();

function cacheResolution(hostname: string, slug: string | null, ttl: number): void {
  const now = Date.now();
  for (const [key, entry] of resolutionCache) {
    if (entry.expires <= now) resolutionCache.delete(key);
  }
  resolutionCache.delete(hostname);
  while (resolutionCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = resolutionCache.keys().next().value;
    if (!oldest) break;
    resolutionCache.delete(oldest);
  }
  resolutionCache.set(hostname, { slug, expires: now + ttl });
}

function binding(row: BindingRow): WorkspaceDomainBinding {
  return {
    domain: row.domain,
    workspaceId: row.workspace_id,
    status: row.status === 'verified' ? 'verified' : 'pending',
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
  };
}

function workspaceData(row: BindingRow): { slug?: string; suspended_at?: string | null } | null {
  const value = row.workspaces;
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/** Looks up a binding without using the public routing cache. Server actions must use this for authorization. */
export async function getWorkspaceDomainBinding(domain: string): Promise<WorkspaceDomainBinding | null> {
  const name = normalizeDomain(domain);
  const { data, error } = await createAdminSupabase()
    .from('workspace_domains')
    .select('domain, workspace_id, status, verified_at, created_at')
    .eq('domain', name)
    .maybeSingle();
  if (error) throw new Error('domain_lookup_failed');
  return data ? binding(data as BindingRow) : null;
}

/** Claims a hostname once. A conflicting insert can never transfer another workspace's binding. */
export async function claimWorkspaceDomain(domain: string, workspaceId: string): Promise<WorkspaceDomainBinding> {
  const name = normalizeDomain(domain);
  const existing = await getWorkspaceDomainBinding(name);
  if (existing) {
    if (existing.workspaceId !== workspaceId) throw new Error('domain_conflict');
    return existing;
  }

  const { data, error } = await createAdminSupabase()
    .from('workspace_domains')
    .insert({ domain: name, workspace_id: workspaceId, status: 'pending' })
    .select('domain, workspace_id, status, verified_at, created_at')
    .single();
  if (error) {
    // Two workspaces can race past the first read. The primary key decides which one wins.
    if (error.code === '23505') {
      const claimed = await getWorkspaceDomainBinding(name);
      if (claimed?.workspaceId === workspaceId) return claimed;
      throw new Error('domain_conflict');
    }
    throw new Error('domain_save_failed');
  }
  return binding(data as BindingRow);
}

export async function setWorkspaceDomainVerification(domain: string, workspaceId: string, verified: boolean): Promise<void> {
  const name = normalizeDomain(domain);
  const { data, error } = await createAdminSupabase()
    .from('workspace_domains')
    .update({ status: verified ? 'verified' : 'pending', verified_at: verified ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('domain', name)
    .eq('workspace_id', workspaceId)
    .select('domain')
    .maybeSingle();
  if (error) throw new Error('domain_save_failed');
  if (!data) throw new Error('domain_not_connected');
}

export async function removeWorkspaceDomainBinding(domain: string, workspaceId: string): Promise<void> {
  const name = normalizeDomain(domain);
  const { error } = await createAdminSupabase().from('workspace_domains').delete().eq('domain', name).eq('workspace_id', workspaceId);
  if (error) throw new Error('domain_delete_failed');
}

/** All bindings for one workspace, never the other workspaces attached to the Vercel project. */
export async function listWorkspaceDomainBindings(workspaceSlug: string): Promise<WorkspaceDomainBinding[]> {
  const { data, error } = await createAdminSupabase()
    .from('workspace_domains')
    .select('domain, workspace_id, status, verified_at, created_at, workspaces!inner(slug)')
    .eq('workspaces.slug', workspaceSlug)
    .order('created_at', { ascending: true });
  if (error) throw new Error('domain_lookup_failed');
  return ((data ?? []) as BindingRow[]).map(binding);
}

/**
 * Resolves a request host only to a verified, server-recorded binding. DNS TXT records are used
 * during setup, but cannot by themselves make a hostname serve another workspace's rooms.
 */
export async function resolveWorkspaceDomain(domain: string, options?: { fresh?: boolean; headers?: Headers }): Promise<string | null> {
  let hostname: string;
  try {
    hostname = normalizeDomain(domain);
  } catch {
    return null;
  }
  const cached = resolutionCache.get(hostname);
  if (!options?.fresh && cached && cached.expires > Date.now()) {
    resolutionCache.delete(hostname);
    resolutionCache.set(hostname, cached);
    return cached.slug;
  }

  try {
    // Cache hits are free; arbitrary uncached Host values cannot create unlimited database lookups.
    if (options?.headers && !(await withinLimit(options.headers, 'domain-host', 60, 60))) return null;
    const { data, error } = await createAdminSupabase()
      .from('workspace_domains')
      .select('domain, workspace_id, status, verified_at, created_at, workspaces!inner(slug, suspended_at)')
      .eq('domain', hostname)
      .eq('status', 'verified')
      .maybeSingle();
    const workspace = data ? workspaceData(data as BindingRow) : null;
    const slug = !error && workspace?.slug && !workspace.suspended_at ? workspace.slug : null;
    cacheResolution(hostname, slug, slug ? VALID_CACHE_MS : INVALID_CACHE_MS);
    return slug;
  } catch {
    cacheResolution(hostname, null, INVALID_CACHE_MS);
    return null;
  }
}

export function clearWorkspaceDomainCache(domain?: string): void {
  if (!domain) {
    resolutionCache.clear();
    return;
  }
  try {
    resolutionCache.delete(normalizeDomain(domain));
  } catch {
    // Invalid hostnames cannot have a cache entry.
  }
}
