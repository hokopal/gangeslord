import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';
import { isIP } from 'node:net';
import { APP_URL, SITE_URL } from './site';
import { isValidSlug } from './slug';

const TXT_HOST_PREFIX = '_pipemouse.';
const TXT_WORKSPACE_PREFIX = 'pipemouse-workspace=';
const TXT_PROOF_PREFIX = 'proof=';
const DNS_TIMEOUT_MS = 4000;
const VALID_CACHE_MS = 60_000;
const INVALID_CACHE_MS = 20_000;

const PLATFORM_HOSTS = new Set([
  'pipemouse.com',
  'www.pipemouse.com',
  'space.pipemouse.com',
  new URL(SITE_URL).hostname,
  new URL(APP_URL).hostname,
]);

const resolutionCache = new Map<string, { slug: string | null; expires: number }>();

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
  return createHash('sha256').update(`pipemouse-domain-dns-v1\0${secret}`).digest();
}

function domainProof(domain: string, workspaceSlug: string): string {
  return createHmac('sha256', signingKey()).update(`${domain}\0${workspaceSlug}`).digest('base64url');
}

function proofMatches(domain: string, workspaceSlug: string, proof: string): boolean {
  const expected = Buffer.from(domainProof(domain, workspaceSlug));
  const actual = Buffer.from(proof);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** The TXT record that proves a domain owner chose this exact workspace. */
export function workspaceDnsRecord(domain: string, workspaceSlug: string): WorkspaceDnsRecord {
  const hostname = normalizeDomain(domain);
  if (!isValidSlug(workspaceSlug)) throw new Error('invalid_workspace');
  return {
    type: 'TXT',
    name: `${TXT_HOST_PREFIX}${hostname}`,
    value: `${TXT_WORKSPACE_PREFIX}${workspaceSlug};${TXT_PROOF_PREFIX}${domainProof(hostname, workspaceSlug)}`,
  };
}

/** Returns the unique valid workspace in a DNS answer, or null for missing, forged or ambiguous records. */
export function workspaceSlugFromTxt(records: string[][], domain: string): string | null {
  const hostname = normalizeDomain(domain);
  const matches = new Set<string>();

  for (const chunks of records) {
    const fields = chunks.join('').split(';').map((field) => field.trim());
    const workspaceSlug = fields.find((field) => field.startsWith(TXT_WORKSPACE_PREFIX))?.slice(TXT_WORKSPACE_PREFIX.length);
    const proof = fields.find((field) => field.startsWith(TXT_PROOF_PREFIX))?.slice(TXT_PROOF_PREFIX.length);
    if (!workspaceSlug || !proof || !isValidSlug(workspaceSlug)) continue;
    if (proofMatches(hostname, workspaceSlug, proof)) matches.add(workspaceSlug);
  }

  return matches.size === 1 ? [...matches][0] : null;
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

/** Resolves the workspace bound to a hostname. DNS failures fail closed and are briefly cached. */
export async function resolveWorkspaceDomain(domain: string, options?: { fresh?: boolean }): Promise<string | null> {
  let hostname: string;
  try {
    hostname = normalizeDomain(domain);
  } catch {
    return null;
  }

  const cached = resolutionCache.get(hostname);
  if (!options?.fresh && cached && cached.expires > Date.now()) return cached.slug;

  try {
    const records = await withTimeout(resolveTxt(`${TXT_HOST_PREFIX}${hostname}`));
    const slug = workspaceSlugFromTxt(records, hostname);
    resolutionCache.set(hostname, { slug, expires: Date.now() + (slug ? VALID_CACHE_MS : INVALID_CACHE_MS) });
    return slug;
  } catch {
    resolutionCache.set(hostname, { slug: null, expires: Date.now() + INVALID_CACHE_MS });
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
