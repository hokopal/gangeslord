import { SubmitButton } from '@/components/ui/SubmitButton';
import { workspaceDnsRecord } from '@/lib/domain-dns';
import { connectDomainAction } from './actions';
import { DnsRecords, vercelPointingRecords } from './DnsRecords';

export function DomainSetup({ workspaceSlug, workspaceId, domain }: { workspaceSlug: string; workspaceId: string; domain: string }) {
  return (
    <section className="domain-setup" aria-labelledby="domain-setup-title">
      <h3 id="domain-setup-title">Set up {domain}</h3>
      <p className="hint">
        Add this TXT record at your DNS provider. It binds the domain to this workspace and cannot be reused for
        another workspace.
      </p>
      <DnsRecords label="Pipemouse workspace verification" records={[workspaceDnsRecord(domain, workspaceSlug, workspaceId)]} />

      <p className="hint domain-pointing-hint">
        Then point the domain to Pipemouse. Use the A record for an apex domain such as example.com, or the CNAME for
        a subdomain such as rooms.example.com.
      </p>
      <DnsRecords label="Pipemouse domain routing" records={vercelPointingRecords(domain)} />

      <form action={connectDomainAction} className="domain-connect-form">
        <input type="hidden" name="workspace" value={workspaceSlug} />
        <input type="hidden" name="domain" value={domain} />
        <SubmitButton className="btn btn-primary" pendingLabel="Connecting…">
          I&apos;ve added the DNS records. Connect domain
        </SubmitButton>
      </form>
      <p className="hint">DNS changes can take a while to appear. You can return to this page and try again.</p>
    </section>
  );
}
