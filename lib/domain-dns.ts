import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';
import { isIP } from 'node:net';
import { APP_URL, SITE_URL } from './site';
import { isValidSlug } from './slug';

const TXT_HOST_PREFIX = '_pipemouse.';
const TXT_WORKSPACE_PREFIX = 'pipemouse-workspace=';
const TXT_WORKSPACE_ID_PREFIX = 'workspace-id=';
const TXT_PROOF_PREFIX = 'proof=';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DNS_TIMEOUT_MS = 4000;
const VALID_CACHE_MS = 60_000;
const INVALID_CACHE_MS = 20_000;
const MAX_CACHE_ENTRIES = 1000;

const PLATFORM_HOSTS = new Set([
  'pipemouse.com',
  'www.pipemouse.com',
  'space.pipemouse.com',
  'rooms.pipemouse.com',
  new URL(SITE_URL).hostname,
  new URL(APP_URL).hostname,
]);

export type WorkspaceDnsIdentity = { workspaceSlug: string; workspaceId: string };

const resolutionCache = new Map<string, { owner: WorkspaceDnsIdentity | null; expires: number }>();

function cacheResolution(hostname: string, owner: WorkspaceDnsIdentity | null, ttl: number): void {
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
  resolutionCache.set(hostname, { owner, expires: now + ttl });
}

export type WorkspaceDnsRecord = { type: 'TXT'; name: string; value: string };

function invalidDomain(): never {
  throw new Error('invalid_domain');
}

/** Returns a canonical DNS hostname, rejecting URLs, IP addresses and Pipemouse-owned hosts. */
export function normalizeDomain(input: string): string {
  const candidate = input.trim().toLowerCase().replace(/\.$/, '');
  if (!candidate || candidate.length > 253 || /[\s\/?#@:\\]/.test(candidate)) invalidDomain();

  let hostname: string;
  try {
    hostname = new URL(`https://${candidate}`).hostname.replace(/\.$/, '');
  } catch {
    invalidDomain();
  }

  if (
    !hostname ||
    hostname.length > 253 ||
    !hostname.includes('.') ||
    isIP(hostname) ||
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.pipemouse.com') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    PLATFORM_HOSTS.has(hostname)
  ) {
    invalidDomain();
  }

  const labels = hostname.split('.');
  if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) invalidDomain();
  return hostname;
}

function signingKey(): Buffer {
  const secret = process.env.SUPABASE_JWT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('domain_signing_not_configured');
  // Domain proofs use a derived key so this HMAC cannot be confused with a Supabase JWT signature.
  return createHash('sha256').update(`pipemouse-domain-dns-v2\0${secret}`).digest();
}

function domainProof(domain: string, workspaceSlug: string, workspaceId: string): string {
  return createHmac('sha256', signingKey()).update([domain, workspaceSlug, workspaceId].join(String.fromCharCode(0))).digest('base64url');
}

function proofMatches(domain: string, workspaceSlug: string, workspaceId: string, proof: string): boolean {
  const expected = Buffer.from(domainProof(domain, workspaceSlug, workspaceId));
  const actual = Buffer.from(proof);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** The TXT record proves ownership of this exact immutable workspace, not just its current slug. */
export function workspaceDnsRecord(domain: string, workspaceSlug: string, workspaceId: string): WorkspaceDnsRecord {
  const hostname = normalizeDomain(domain);
  if (!isValidSlug(workspaceSlug) || !UUID.test(workspaceId)) throw new Error('invalid_workspace');
  return {
    type: 'TXT',
    name: `${TXT_HOST_PREFIX}${hostname}`,
    value: `${TXT_WORKSPACE_PREFIX}${workspaceSlug};${TXT_WORKSPACE_ID_PREFIX}${workspaceId};${TXT_PROOF_PREFIX}${domainProof(hostname, workspaceSlug, workspaceId)}`,
  };
}

/** Returns the unique valid workspace identity, rejecting legacy slug-only and ambiguous records. */
export function workspaceIdentityFromTxt(records: string[][], domain: string): WorkspaceDnsIdentity | null {
  const hostname = normalizeDomain(domain);
  const matches = new Map<string, WorkspaceDnsIdentity>();

  for (const chunks of records) {
    const fields = chunks.join('').split(';').map((field) => field.trim());
    const workspaceSlug = fields.find((field) => field.startsWith(TXT_WORKSPACE_PREFIX))?.slice(TXT_WORKSPACE_PREFIX.length);
    const workspaceId = fields.find((field) => field.startsWith(TXT_WORKSPACE_ID_PREFIX))?.slice(TXT_WORKSPACE_ID_PREFIX.length);
    const proof = fields.find((field) => field.startsWith(TXT_PROOF_PREFIX))?.slice(TXT_PROOF_PREFIX.length);
    if (!workspaceSlug || !workspaceId || !proof || !isValidSlug(workspaceSlug) || !UUID.test(workspaceId)) continue;
    if (proofMatches(hostname, workspaceSlug, workspaceId, proof)) {
      matches.set(`${workspaceSlug}:${workspaceId}`, { workspaceSlug, workspaceId });
    }
  }

  return matches.size === 1 ? [...matches.values()][0] : null;
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('dns_timeout')), DNS_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Reads the workspace proof during setup. This is never used as the request-routing authority. */
export async function resolveWorkspaceDnsOwner(domain: string, options?: { fresh?: boolean }): Promise<WorkspaceDnsIdentity | null> {
  let hostname: string;
  try {
    hostname = normalizeDomain(domain);
  } catch {
    return null;
  }

  const cached = resolutionCache.get(hostname);
  if (!options?.fresh && cached && cached.expires > Date.now()) {
    // Refresh insertion order so frequently used hostnames are retained.
    resolutionCache.delete(hostname);
    resolutionCache.set(hostname, cached);
    return cached.owner;
  }

  try {
    const records = await withTimeout(resolveTxt(`${TXT_HOST_PREFIX}${hostname}`));
    const owner = workspaceIdentityFromTxt(records, hostname);
    cacheResolution(hostname, owner, owner ? VALID_CACHE_MS : INVALID_CACHE_MS);
    return owner;
  } catch {
    cacheResolution(hostname, null, INVALID_CACHE_MS);
    return null;
  }
}

export function clearDomainDnsCache(domain?: string): void {
  if (!domain) {
    resolutionCache.clear();
    return;
  }
  try {
    resolutionCache.delete(normalizeDomain(domain));
  } catch {
    // An invalid hostname cannot have a cache entry.
  }
}
