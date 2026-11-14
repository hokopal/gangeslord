import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { listApiKeys, RATE_LIMIT } from '@/lib/api-keys';
import { errorMessage } from '@/lib/messages';
import { appOrigin } from '@/lib/origin';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { ApiKeyForm } from './ApiKeyForm';
import { revokeApiKeyAction } from './actions';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function ApiKeysPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string; revoked?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error, revoked } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.write')) notFound();
  const { workspace } = context;
  const [keys, origin] = await Promise.all([listApiKeys(workspace.id), appOrigin()]);

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/integrations`} className="back">
        <ArrowLeft aria-hidden="true" /> Integrations
      </Link>
      <h1 className="page-title">API and MCP</h1>
      <p className="page-subtitle">Let your own scripts, tools and AI assistants read this workspace’s data and create personal links.</p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {revoked ? (
        <p className="notice" role="status">
          Key revoked. Anything using it has stopped working.
        </p>
      ) : null}

      <h2 className="section-title">API keys</h2>
      <ApiKeyForm workspaceSlug={workspace.slug} />
      <p className="hint" style={{ marginTop: 8 }}>
        A key gives access to this workspace only. Read-only keys can list content and read analytics. Read-and-write keys can also
        create personal links. Keys are stored as a fingerprint, so a lost key can’t be recovered: revoke it and create another.
      </p>
      {keys.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Access</th>
                <th>Created</th>
                <th>Last used</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td>
                    <code>{key.prefix}</code>
                  </td>
                  <td>{key.scope === 'write' ? 'Read and write' : 'Read only'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(key.createdAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}</td>
                  <td className="actions">
                    {key.revokedAt ? (
                      <span className="badge badge-warn">Revoked</span>
                    ) : (
                      <form action={revokeApiKeyAction}>
                        <input type="hidden" name="workspace" value={workspace.slug} />
                        <input type="hidden" name="key" value={key.id} />
                        <SubmitButton className="btn btn-sm btn-danger" pendingLabel="Revoking…">
                          Revoke
                        </SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <h2 className="section-title">REST API</h2>
      <p className="hint">
        Send the key as a bearer token: <code>Authorization: Bearer fello_sk_…</code>. Every reply is JSON, as <code>{'{ "data": … }'}</code> or{' '}
        <code>{'{ "error": { "code", "message" } }'}</code>.
      </p>
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Request</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['GET /api/v1/tracks', 'List tracks'],
              ['GET /api/v1/library?q=', 'List library items, optionally filtered by title'],
              ['GET /api/v1/tracks/{id}/analytics', 'Summary and per-item engagement for one track'],
              ['GET /api/v1/sessions?track=&limit=', 'Recent visits, newest first'],
              ['POST /api/v1/tracks/{id}/links', 'Create a personal link. Body: name, and optionally email and company. Needs a read-and-write key'],
            ].map(([request, what]) => (
              <tr key={request}>
                <td>
                  <code>{request}</code>
                </td>
                <td>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        Base address: <code>{origin}</code>. Each key can make {RATE_LIMIT.requests} requests a minute across the API and the MCP
        server. Replies carry <code>RateLimit-Remaining</code> and <code>RateLimit-Reset</code> headers; past the limit you get a 429
        with <code>Retry-After</code>.
      </p>

      <h2 className="section-title">MCP server</h2>
      <p className="hint">
        AI assistants that support the Model Context Protocol can connect to Pipemouse and use the same data as tools: search the
        library, list tracks, read a track’s analytics, list recent visits, and create a personal link.
      </p>
      <dl className="meta-list" style={{ marginTop: 8 }}>
        <dt>Server address</dt>
        <dd>
          <code>{origin}/api/mcp</code>
        </dd>
        <dt>Transport</dt>
        <dd>Streamable HTTP</dd>
        <dt>Authentication</dt>
        <dd>
          Header <code>Authorization: Bearer fello_sk_…</code>, using a key from this page
        </dd>
      </dl>
      <p className="hint" style={{ marginTop: 8 }}>
        This works with clients that let you set a request header for a remote server. Clients that only connect through an OAuth
        sign-in can’t use it yet.
      </p>
    </div>
  );
}
