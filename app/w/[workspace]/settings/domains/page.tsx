import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { normalizeDomain, workspaceDnsRecord } from '@/lib/domain-dns';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { domainErrorCode, listWorkspaceDomains, type WorkspaceDomain } from '@/lib/vercel-domains';
import { getWorkspaceContext } from '@/lib/workspaces';
import { prepareDomainAction } from './actions';
import { DomainList } from './DomainList';
import { DomainSetup } from './DomainSetup';

type SearchParams = {
  domain?: string;
  error?: string;
  connected?: string;
  pending?: string;
  verified?: string;
  removed?: string;
};

export default async function DomainSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { workspace: slug } = await params;
  const query = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.write')) notFound();

  let domains: WorkspaceDomain[] = [];
  let loadError: string | null = null;
  try {
    domains = await listWorkspaceDomains(slug);
  } catch (error) {
    loadError = domainErrorCode(error);
  }

  let setupDomain: string | null = null;
  let setupError: string | null = null;
  if (query.domain) {
    try {
      setupDomain = normalizeDomain(query.domain);
      workspaceDnsRecord(setupDomain, slug);
    } catch (error) {
      setupError = error instanceof Error && error.message === 'domain_signing_not_configured'
        ? 'domain_signing_not_configured'
        : 'invalid_domain';
    }
  }

  const success = query.connected
    ? 'Domain connected and verified. New room links now use it.'
    : query.verified
      ? 'Domain verified. New room links now use it.'
      : query.pending
        ? 'Domain saved. Finish the DNS verification, then select Verify.'
        : query.removed
          ? 'Domain removed. You can now delete its records at your DNS provider.'
          : null;

  return (
    <div className="page">
      <h1 className="page-title">Custom domains</h1>
      <p className="page-subtitle">Use a domain you control for branded buyer room links.</p>

      {query.error || setupError ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(query.error ?? setupError ?? '')}
        </p>
      ) : null}
      {loadError ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(loadError)}
        </p>
      ) : null}
      {success ? (
        <p className="notice" role="status">
          {success}
        </p>
      ) : null}

      <h2 className="section-title">Add a domain</h2>
      <p className="hint">
        Enter a domain or subdomain you control. Your Pipemouse workspace and sign-in address will not change.
      </p>
      <form action={prepareDomainAction} className="row-form domain-add-form">
        <input type="hidden" name="workspace" value={slug} />
        <div className="field" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
          <label className="label" htmlFor="custom-domain">
            Domain
          </label>
          <input
            id="custom-domain"
            name="domain"
            className="input"
            placeholder="rooms.example.com"
            defaultValue={setupDomain ?? ''}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </div>
        <SubmitButton className="btn btn-primary" pendingLabel="Preparing…">
          Set up domain
        </SubmitButton>
      </form>

      {setupDomain ? <DomainSetup workspaceSlug={slug} domain={setupDomain} /> : null}

      <h2 className="section-title">Connected domains</h2>
      {loadError ? null : <DomainList domains={domains} workspaceSlug={slug} />}
    </div>
  );
}
