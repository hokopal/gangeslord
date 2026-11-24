'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { clearDomainDnsCache, normalizeDomain, resolveWorkspaceDomain } from '@/lib/domain-dns';
import { can } from '@/lib/roles';
import {
  addProjectDomain,
  clearPreferredWorkspaceDomain,
  domainErrorCode,
  removeProjectDomain,
  verifyProjectDomain,
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

function clearDomainState(workspaceSlug: string, domain: string): void {
  clearDomainDnsCache(domain);
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

  const owner = await resolveWorkspaceDomain(domain, { fresh: true });
  if (owner !== context.workspace.slug) {
    redirect(domainsPath(workspaceSlug, { domain, error: 'domain_txt_missing' }));
  }

  let verified: boolean;
  try {
    const added = await addProjectDomain(domain);
    verified = added.verified;
    if (!verified) {
      try {
        verified = (await verifyProjectDomain(domain)).verified;
      } catch {
        // The domain is attached and remains pending; the admin can retry verification below.
      }
    }
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

  const owner = await resolveWorkspaceDomain(domain, { fresh: true });
  if (owner !== context.workspace.slug) {
    redirect(domainsPath(workspaceSlug, { domain, error: 'domain_txt_missing' }));
  }

  let verified: boolean;
  try {
    verified = (await verifyProjectDomain(domain)).verified;
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

  const owner = await resolveWorkspaceDomain(domain, { fresh: true });
  if (owner !== context.workspace.slug) {
    redirect(domainsPath(workspaceSlug, { error: 'domain_not_connected' }));
  }

  try {
    await removeProjectDomain(domain);
  } catch (error) {
    redirect(domainsPath(workspaceSlug, { error: domainErrorCode(error) }));
  }

  clearDomainState(workspaceSlug, domain);
  redirect(domainsPath(workspaceSlug, { removed: '1' }));
}
