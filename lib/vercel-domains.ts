import { normalizeDomain } from './domain-dns';
import { listWorkspaceDomainBindings } from './workspace-domains';

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

export async function getProjectDomain(domain: string): Promise<ProjectDomain> {
  const name = normalizeDomain(domain);
  return vercelFetch<ProjectDomain>(projectPath(`/domains/${encodeURIComponent(name)}`));
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

/** Only hostnames explicitly bound to this workspace are visible to it. */
export async function listWorkspaceDomains(workspaceSlug: string): Promise<WorkspaceDomain[]> {
  const bindings = await listWorkspaceDomainBindings(workspaceSlug);
  if (bindings.length === 0) return [];
  const body = await vercelFetch<{ domains?: ProjectDomain[] } | ProjectDomain[]>(projectPath('/domains'));
  const domains = Array.isArray(body) ? body : (body.domains ?? []);
  const byName = new Map<string, ProjectDomain>();
  for (const domain of domains) {
    if (typeof domain.name !== 'string' || domain.redirect || domain.gitBranch || domain.customEnvironmentId) continue;
    try {
      byName.set(normalizeDomain(domain.name), domain);
    } catch {
      // Ignore platform or malformed hostnames returned by the project-wide Vercel list.
    }
  }

  const rows = bindings.map((binding) => {
    const project = byName.get(binding.domain);
    return {
      ...project,
      name: binding.domain,
      apexName: project?.apexName ?? binding.domain,
      verified: binding.status === 'verified' && project?.verified === true,
      createdAt: project?.createdAt ?? Date.parse(binding.createdAt),
    } as ProjectDomain;
  });
  const primary = rows.find((domain) => domain.verified)?.name;
  return rows.map((domain) => ({ ...domain, primary: domain.name === primary }));
}

/** The first verified workspace domain, or null so callers can fall back to the Pipemouse origin. */
export async function preferredWorkspaceDomain(workspaceSlug: string): Promise<string | null> {
  const cached = preferredCache.get(workspaceSlug);
  if (cached && cached.expires > Date.now()) return cached.domain;
  try {
    const domains = await listWorkspaceDomainBindings(workspaceSlug);
    const domain = domains.find((entry) => entry.status === 'verified')?.domain ?? null;
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
  if (error instanceof Error && (error.message === 'domain_conflict' || error.message === 'domain_not_connected')) return error.message;
  if (error instanceof Error && error.message === 'vercel_not_configured') return 'vercel_not_configured';
  if (error instanceof VercelDomainError) {
    if (error.status === 409) return 'domain_conflict';
    if (error.status === 401 || error.status === 403) return 'vercel_forbidden';
    if (error.status === 429) return 'vercel_rate_limited';
    if (error.status === 404) return 'domain_not_connected';
  }
  return 'vercel_request_failed';
}
