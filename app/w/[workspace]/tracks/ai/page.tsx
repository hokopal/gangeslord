import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PROVIDERS } from '@/lib/ai/providers';
import { getAiStatus } from '@/lib/ai/settings';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { BriefForm } from './BriefForm';

// Drafting waits on the AI provider, which can take a while.
export const maxDuration = 60;

export default async function AiDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string; brief?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error, brief } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'content.write')) notFound();
  const { workspace, role } = context;
  const status = await getAiStatus(workspace.id);

  return (
    <div className="page">
      <Link href={`/w/${workspace.slug}/tracks`} className="back">
        <ArrowLeft aria-hidden="true" /> Tracks
      </Link>
      <h1 className="page-title">Draft a track with AI</h1>
      <p className="page-subtitle">
        Describe the buyer. Pipemouse picks and orders items from your library and saves the result as a draft for you to review.
        Nothing is published.
      </p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}

      {status.configured ? (
        <>
          <BriefForm workspaceSlug={workspace.slug} initialBrief={brief ?? ''} />
          <p className="hint" style={{ marginTop: 16 }}>
            Your brief and the titles, descriptions and text excerpts of your library items are sent to{' '}
            {PROVIDERS[status.provider].label} using this workspace’s API key ({status.model}).
          </p>
        </>
      ) : (
        <div className="notice">
          AI drafting isn’t set up for this workspace yet.{' '}
          {can(role, 'settings.write') ? (
            <Link className="link" href={`/w/${workspace.slug}/integrations/ai`}>
              Add an API key
            </Link>
          ) : (
            'Ask a workspace admin to add an API key under Integrations.'
          )}
        </div>
      )}
    </div>
  );
}
