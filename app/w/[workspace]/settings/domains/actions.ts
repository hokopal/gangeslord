'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { clearDomainDnsCache, normalizeDomain, resolveWorkspaceDnsOwner } from '@/lib/domain-dns';
import {
  claimWorkspaceDomain,
  clearWorkspaceDomainCache,
  getWorkspaceDomainBinding,
  removeWorkspaceDomainBinding,
  setWorkspaceDomainVerification,
} from '@/lib/workspace-domains';
import { can } from '@/lib/roles';
import { withinLimit } from '@/lib/rate-limit';
import {
  addProjectDomain,
  clearPreferredWorkspaceDomain,
  domainErrorCode,
  getProjectDomain,
  removeProjectDomain,
  verifyProjectDomain,
  VercelDomainError,
} from '@/lib/vercel-domains';
import { getWorkspaceContext } from '@/lib/workspaces';

function domainsPath(workspaceSlug: string, params?: Record<string, string>): string {
  const search = new URLSearchParams(params).toString();
  return `/w/${workspaceSlug}/settings/domains${search ? `?${search}` : ''}`;
}

async function authorize(workspaceSlug: string) {
  const context = await getWorkspaceContext(workspaceSlug);
  if (!context || !can(context.role, 'settings.write')) redirect(`/w/${workspaceSlug}/settings?error=not_allowed`);
  return context;
}

function domainInput(formData: FormData): string {
  return normalizeDomain(String(formData.get('domain') ?? ''));
}

/** Limits both a workspace's attempts and the shared Vercel provider budget. */
async function throttleDomain(workspaceId: string, workspaceSlug: string, domain: string): Promise<void> {
  const requestHeaders = await headers();
  const [workspaceAllowed, providerAllowed] = await Promise.all([
    withinLimit(requestHeaders, 'domain-workspace', 10, 60, workspaceId),
    withinLimit(requestHeaders, 'domain-provider', 60, 60, 'vercel'),
  ]);
  if (!workspaceAllowed || !providerAllowed) redirect(domainsPath(workspaceSlug, { domain, error: 'vercel_rate_limited' }));
}

function clearDomainState(workspaceSlug: string, domain: string): void {
  clearDomainDnsCache(domain);
  clearWorkspaceDomainCache(domain);
  clearPreferredWorkspaceDomain(workspaceSlug);
  revalidatePath(`/w/${workspaceSlug}/settings/domains`);
}

export async function prepareDomainAction(formData: FormData): Promise<void> {
  const workspaceSlug = String(formData.get('workspace') ?? '');
  await authorize(workspaceSlug);
  let domain: string;
  try {
    domain = domainInput(formData);
  } catch {
    redirect(domainsPath(workspaceSlug, { error: 'invalid_domain' }));
  }
  redirect(domainsPath(workspaceSlug, { domain }));
}

export async function connectDomainAction(formData: FormData): Promise<void> {
  const workspaceSlug = String(formData.get('workspace') ?? '');
  const context = await authorize(workspaceSlug);
  let domain: string;
  try {
    domain = domainInput(formData);
  } catch {
    redirect(domainsPath(workspaceSlug, { error: 'invalid_domain' }));
  }

  await throttleDomain(context.workspace.id, workspaceSlug, domain);
  const owner = await resolveWorkspaceDnsOwner(domain, { fresh: true });
  if (owner?.workspaceId !== context.workspace.id || owner.workspaceSlug !== context.workspace.slug) {
    redirect(domainsPath(workspaceSlug, { domain, error: 'domain_txt_missing' }));
  }

  try {
    // Claim before calling Vercel so two workspaces cannot both attach the same hostname.
    await claimWorkspaceDomain(domain, context.workspace.id);
  } catch (error) {
    redirect(domainsPath(workspaceSlug, { domain, error: domainErrorCode(error) }));
  }

  let verified = false;
  try {
    let added;
    try {
      added = await addProjectDomain(domain);
    } catch (error) {
      // A domain from before persistent bindings can be adopted only after the same DNS proof.
      if (error instanceof VercelDomainError && error.status === 409) added = await getProjectDomain(domain);
      else throw error;
    }
    verified = added.verified;
    if (!verified) {
      try {
        verified = (await verifyProjectDomain(domain)).verified;
      } catch {
        // The domain is attached and remains pending; the admin can retry verification below.
      }
    }
    await setWorkspaceDomainVerification(domain, context.workspace.id, verified);
  } catch (error) {
    redirect(domainsPath(workspaceSlug, { domain, error: domainErrorCode(error) }));
  }

  clearDomainState(workspaceSlug, domain);
  redirect(domainsPath(workspaceSlug, verified ? { connected: '1' } : { domain, pending: '1' }));
}

export async function verifyDomainAction(formData: FormData): Promise<void> {
  const workspaceSlug = String(formData.get('workspace') ?? '');
  const context = await authorize(workspaceSlug);
  let domain: string;
  try {
    domain = domainInput(formData);
  } catch {
    redirect(domainsPath(workspaceSlug, { error: 'invalid_domain' }));
  }

  let binding;
  try {
    binding = await getWorkspaceDomainBinding(domain);
  } catch (error) {
    redirect(domainsPath(workspaceSlug, { error: domainErrorCode(error) }));
  }
  if (!binding || binding.workspaceId !== context.workspace.id) {
    redirect(domainsPath(workspaceSlug, { error: 'domain_not_connected' }));
  }

  await throttleDomain(context.workspace.id, workspaceSlug, domain);
  const owner = await resolveWorkspaceDnsOwner(domain, { fresh: true });
  if (owner?.workspaceId !== context.workspace.id || owner.workspaceSlug !== context.workspace.slug) {
    redirect(domainsPath(workspaceSlug, { domain, error: 'domain_txt_missing' }));
  }

  let verified: boolean;
  try {
    verified = (await verifyProjectDomain(domain)).verified;
    await setWorkspaceDomainVerification(domain, context.workspace.id, verified);
  } catch (error) {
    redirect(domainsPath(workspaceSlug, { error: domainErrorCode(error) }));
  }

  clearDomainState(workspaceSlug, domain);
  redirect(domainsPath(workspaceSlug, verified ? { verified: '1' } : { domain, pending: '1' }));
}

export async function removeDomainAction(formData: FormData): Promise<void> {
  const workspaceSlug = String(formData.get('workspace') ?? '');
  const context = await authorize(workspaceSlug);
  let domain: string;
  try {
    domain = domainInput(formData);
  } catch {
    redirect(domainsPath(workspaceSlug, { error: 'invalid_domain' }));
  }

  await throttleDomain(context.workspace.id, workspaceSlug, domain);
  let binding;
  try {
    binding = await getWorkspaceDomainBinding(domain);
  } catch (error) {
    redirect(domainsPath(workspaceSlug, { error: domainErrorCode(error) }));
  }
  if (!binding || binding.workspaceId !== context.workspace.id) {
    redirect(domainsPath(workspaceSlug, { error: 'domain_not_connected' }));
  }

  try {
    await removeProjectDomain(domain);
    await removeWorkspaceDomainBinding(domain, context.workspace.id);
  } catch (error) {
    redirect(domainsPath(workspaceSlug, { error: domainErrorCode(error) }));
  }

  clearDomainState(workspaceSlug, domain);
  redirect(domainsPath(workspaceSlug, { removed: '1' }));
}
