import { normalizeDomain, resolveWorkspaceDomain } from './domain-dns';

const VERCEL_API = 'https://api.vercel.com';
const REQUEST_TIMEOUT_MS = 15_000;
const PREFERRED_CACHE_MS = 60_000;
const FAILED_PREFERRED_CACHE_MS = 15_000;

export type DomainVerification = {
  type: string;
  domain: string;
  value: string;
  reason?: string;
};

export type ProjectDomain = {
  name: string;
  apexName: string;
  verified: boolean;
  verification?: DomainVerification[];
  createdAt?: number;
  redirect?: string | null;
  gitBranch?: string | null;
  customEnvironmentId?: string | null;
};

export type WorkspaceDomain = ProjectDomain & { primary: boolean };

export class VercelDomainError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiCode?: string,
  ) {
    super(apiCode ?? `vercel_${status}`);
    this.name = 'VercelDomainError';
  }
}

const preferredCache = new Map<string, { domain: string | null; expires: number }>();

function vercelConfig(): { token: string; projectId: string; teamId: string } {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId || !teamId) throw new Error('vercel_not_configured');
  return { token, projectId, teamId };
}

async function vercelFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { token, teamId } = vercelConfig();
  const response = await fetch(`${VERCEL_API}${path}?teamId=${encodeURIComponent(teamId)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = (await response.json().catch(() => null)) as
    | { error?: { code?: unknown } }
    | T
    | null;

  if (!response.ok) {
    const apiCode =
      body && typeof body === 'object' && 'error' in body && body.error && typeof body.error.code === 'string'
        ? body.error.code
        : undefined;
    throw new VercelDomainError(response.status, apiCode);
  }
  return body as T;
}

function projectPath(suffix: string): string {
  const { projectId } = vercelConfig();
  return `/v9/projects/${encodeURIComponent(projectId)}${suffix}`;
}

export async function addProjectDomain(domain: string): Promise<ProjectDomain> {
  const name = normalizeDomain(domain);
  const { projectId } = vercelConfig();
  return vercelFetch<ProjectDomain>(`/v10/projects/${encodeURIComponent(projectId)}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function verifyProjectDomain(domain: string): Promise<ProjectDomain> {
  const name = normalizeDomain(domain);
  return vercelFetch<ProjectDomain>(`${projectPath(`/domains/${encodeURIComponent(name)}/verify`)}`, {
    method: 'POST',
  });
}

export async function removeProjectDomain(domain: string): Promise<void> {
  const name = normalizeDomain(domain);
  try {
    await vercelFetch<unknown>(projectPath(`/domains/${encodeURIComponent(name)}`), { method: 'DELETE' });
  } catch (error) {
    if (error instanceof VercelDomainError && error.status === 404) return;
    throw error;
  }
}

/** Only domains with a valid signed TXT record for this workspace are visible to it. */
export async function listWorkspaceDomains(workspaceSlug: string): Promise<WorkspaceDomain[]> {
  const body = await vercelFetch<{ domains?: ProjectDomain[] } | ProjectDomain[]>(projectPath('/domains'));
  const domains = Array.isArray(body) ? body : (body.domains ?? []);
  const matches = await Promise.all(
    domains
      .filter((domain) => typeof domain.name === 'string' && !domain.redirect && !domain.gitBranch && !domain.customEnvironmentId)
      .map(async (domain): Promise<ProjectDomain | null> => {
        try {
          const name = normalizeDomain(domain.name);
          const owner = await resolveWorkspaceDomain(name);
          return owner === workspaceSlug ? { ...domain, name, verified: domain.verified === true } : null;
        } catch {
          return null;
        }
      }),
  );

  const sorted = matches
    .filter((domain): domain is ProjectDomain => domain !== null)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0) || a.name.localeCompare(b.name));
  const primary = sorted.find((domain) => domain.verified)?.name;
  return sorted.map((domain) => ({ ...domain, primary: domain.name === primary }));
}

/** The first verified workspace domain, or null so callers can fall back to the Pipemouse origin. */
export async function preferredWorkspaceDomain(workspaceSlug: string): Promise<string | null> {
  const cached = preferredCache.get(workspaceSlug);
  if (cached && cached.expires > Date.now()) return cached.domain;
  try {
    const domains = await listWorkspaceDomains(workspaceSlug);
    const domain = domains.find((entry) => entry.primary)?.name ?? null;
    preferredCache.set(workspaceSlug, { domain, expires: Date.now() + PREFERRED_CACHE_MS });
    return domain;
  } catch {
    preferredCache.set(workspaceSlug, { domain: null, expires: Date.now() + FAILED_PREFERRED_CACHE_MS });
    return null;
  }
}

export function clearPreferredWorkspaceDomain(workspaceSlug?: string): void {
  if (workspaceSlug) preferredCache.delete(workspaceSlug);
  else preferredCache.clear();
}

export function domainErrorCode(error: unknown): string {
  if (error instanceof Error && error.message === 'vercel_not_configured') return 'vercel_not_configured';
  if (error instanceof VercelDomainError) {
    if (error.status === 409) return 'domain_conflict';
    if (error.status === 401 || error.status === 403) return 'vercel_forbidden';
    if (error.status === 429) return 'vercel_rate_limited';
    if (error.status === 404) return 'domain_not_connected';
  }
  return 'vercel_request_failed';
}
