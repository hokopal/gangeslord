import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { isProvider, PROVIDER_IDS, PROVIDERS } from '@/lib/ai/providers';
import { getAiStatus } from '@/lib/ai/settings';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { removeAiKeyAction, saveAiKeyAction, setAiModelAction } from './actions';

export const maxDuration = 30;

const SAVED: Record<string, string> = {
  key: 'API key checked with the provider and saved. Confirm the model below.',
  model: 'Model updated.',
  removed: 'API key removed.',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function AiSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string; saved?: string; provider?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error, saved, provider: attempted } = await searchParams;
  const context = await getWorkspaceContext(slug);
  // The key belongs to the whole workspace, so only admins can see this page at all.
  if (!context || !can(context.role, 'settings.write')) notFound();
  const { workspace } = context;
  const status = await getAiStatus(workspace.id);
  const selected = isProvider(attempted) ? attempted : status.provider;
  const hidden = <input type="hidden" name="workspace" value={workspace.slug} />;

  return (
    <div className="page">
      <Link href={`/w/${workspace.slug}/integrations`} className="back">
        <ArrowLeft aria-hidden="true" /> Integrations
      </Link>
      <h1 className="page-title">AI</h1>
      <p className="page-subtitle">
        Pipemouse drafts tracks using your own API key from the AI provider you choose. Usage is billed to your account with that
        provider.
      </p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {saved && SAVED[saved] ? (
        <p className="notice" role="status">
          {SAVED[saved]}
        </p>
      ) : null}

      <h2 className="section-title">Provider and API key</h2>
      {status.configured ? (
        <p style={{ marginBottom: 12 }}>
          <span className="badge">Connected</span> {PROVIDERS[status.provider].label}, key ending in <code>{status.last4}</code>
          {status.updatedAt ? `, saved ${formatDate(status.updatedAt)}` : ''}.
        </p>
      ) : (
        <p style={{ marginBottom: 12 }}>
          <span className="badge badge-warn">Not set up</span> Choose a provider and add a key to turn on AI drafting.
        </p>
      )}
      <form action={saveAiKeyAction} style={{ maxWidth: 480 }}>
        {hidden}
        <div className="field">
          <label className="label" htmlFor="provider">
            Provider
          </label>
          <select id="provider" name="provider" className="select" defaultValue={selected}>
            {PROVIDER_IDS.map((id) => (
              <option key={id} value={id}>
                {PROVIDERS[id].label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="api-key">
            {status.configured ? 'New API key' : 'API key'}
          </label>
          <input id="api-key" name="apiKey" type="password" className="input" required autoComplete="off" spellCheck={false} />
          <span className="hint">
            The key is checked with the provider, then stored encrypted. Nobody can read it back, including admins: it can only be
            replaced or removed. A workspace uses one provider at a time
            {status.configured ? ', so saving a key here replaces the current one.' : '.'}
          </span>
        </div>
        <SubmitButton className="btn btn-primary" pendingLabel="Checking key…">
          {status.configured ? 'Replace key' : 'Save key'}
        </SubmitButton>
      </form>
      <details style={{ marginTop: 12 }}>
        <summary className="hint" style={{ cursor: 'pointer' }}>
          Where do I get a key?
        </summary>
        <ul className="hint" style={{ margin: '6px 0 0 18px' }}>
          {PROVIDER_IDS.map((id) => (
            <li key={id}>
              {PROVIDERS[id].label}: create one in {PROVIDERS[id].keySource}. Keys usually look like <code>{PROVIDERS[id].keyPlaceholder}</code>
            </li>
          ))}
        </ul>
      </details>

      {status.configured ? (
        <>
          <h2 className="section-title">Model</h2>
          <form action={setAiModelAction} className="row-form">
            {hidden}
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 260, maxWidth: 480 }}>
              <label className="label" htmlFor="model">
                Model used for drafting
              </label>
              <input id="model" name="model" className="input" list="ai-models" defaultValue={status.model} required autoComplete="off" spellCheck={false} />
              <datalist id="ai-models">
                {status.models.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </div>
            <SubmitButton className="btn" pendingLabel="Saving…">
              Save model
            </SubmitButton>
          </form>
          <p className="hint" style={{ marginTop: 6 }}>
            Start typing to search the {status.models.length} models this key could use when it was saved. Pipemouse picked a starting
            model for you; check it is the one you want, since price and quality vary a lot. Choose a general chat model.
          </p>

          <h2 className="section-title">Remove</h2>
          <form action={removeAiKeyAction}>
            {hidden}
            <SubmitButton className="btn btn-danger" pendingLabel="Removing…">
              Remove API key
            </SubmitButton>
          </form>
        </>
      ) : null}
    </div>
  );
}
