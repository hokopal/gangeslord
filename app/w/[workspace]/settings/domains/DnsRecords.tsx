import { CopyButton } from '@/components/ui/CopyButton';

export type DnsRecord = { type: string; name: string; value: string };

export function vercelPointingRecords(domain: string): DnsRecord[] {
  return [
    { type: 'A', name: domain, value: '76.76.21.21' },
    { type: 'CNAME', name: domain, value: 'cname.vercel-dns.com' },
  ];
}

export function DnsRecords({ records, label }: { records: DnsRecord[]; label: string }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={`${record.type}-${record.name}-${record.value}`}>
              <td>{record.type}</td>
              <td>
                <code className="dns-record-name">{record.name}</code>
              </td>
              <td>
                <div className="dns-value">
                  <code>{record.value}</code>
                  <CopyButton value={record.value} label="Copy" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
