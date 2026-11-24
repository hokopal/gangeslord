import { SubmitButton } from '@/components/ui/SubmitButton';
import { workspaceDnsRecord } from '@/lib/domain-dns';
import type { WorkspaceDomain } from '@/lib/vercel-domains';
import { removeDomainAction, verifyDomainAction } from './actions';
import { DnsRecords, vercelPointingRecords, type DnsRecord } from './DnsRecords';

export function DomainList({ domains, workspaceSlug, workspaceId }: { domains: WorkspaceDomain[]; workspaceSlug: string; workspaceId: string }) {
  if (domains.length === 0) return <p className="hint">No custom domains are connected to this workspace yet.</p>;

  return (
    <div>
      {domains.map((domain) => {
        const challenges: DnsRecord[] = (domain.verification ?? [])
          .filter((challenge) => challenge.type.toUpperCase() === 'TXT')
          .map((challenge) => ({ type: 'TXT', name: challenge.domain, value: challenge.value }));
        return (
          <section className="domain-row" key={domain.name} aria-label={domain.name}>
            <div className="domain-row-header">
              <div>
                <h3>{domain.name}</h3>
                <div className="domain-badges">
                  <span className={domain.verified ? 'badge' : 'badge badge-warn'}>
                    {domain.verified ? 'Verified' : 'Pending'}
                  </span>
                  {domain.primary ? <span className="badge">Used for room links</span> : null}
                </div>
              </div>
              <div className="domain-actions">
                {!domain.verified ? (
                  <form action={verifyDomainAction}>
                    <input type="hidden" name="workspace" value={workspaceSlug} />
                    <input type="hidden" name="domain" value={domain.name} />
                    <SubmitButton className="btn btn-sm" pendingLabel="Checking…">
                      Verify
                    </SubmitButton>
                  </form>
                ) : null}
                <form action={removeDomainAction}>
                  <input type="hidden" name="workspace" value={workspaceSlug} />
                  <input type="hidden" name="domain" value={domain.name} />
                  <SubmitButton className="btn btn-sm btn-danger" pendingLabel="Removing…">
                    Remove
                  </SubmitButton>
                </form>
              </div>
            </div>
            <p className="hint">
              {domain.primary
                ? 'New room links for this workspace use this domain.'
                : domain.verified
                  ? 'Verified. The first verified domain is used for new room links.'
                  : 'Add the records below, then select Verify.'}
            </p>
            {!domain.verified ? (
              <details className="domain-dns-details">
                <summary>DNS records</summary>
                <DnsRecords
                  label={`DNS records for ${domain.name}`}
                  records={[
                    workspaceDnsRecord(domain.name, workspaceSlug, workspaceId),
                    ...vercelPointingRecords(domain.name),
                    ...challenges,
                  ]}
                />
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
